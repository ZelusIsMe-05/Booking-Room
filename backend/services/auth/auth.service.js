const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const authRepository = require('../../repositories/auth/auth.repository');
const AppError = require('../../utils/AppError');
const { comparePassword, hashPassword } = require('../../utils/hashPassword');
const otpStore = require('../../redis/otpStore');
const idCardStorage = require('../storage/idCardStorage');
const oauthProviders = require('./oauthProviders');
const { sendOtpEmail } = require('../../utils/mailer');
const { toRegisterResponse } = require('../../models/User');
const { generateS3Key, uploadToS3, deleteFromS3, extractS3KeyFromUrl, RESOURCE_TYPES } = require('../../utils/s3Helper');
const {
  signAccessToken,
  signRefreshToken,
  hashToken,
  verifyRefreshToken,
  getUserIdFromPayload,
  getJtiFromPayload,
} = require('../../utils/jwt');
const env = require('../../config/env');
const {
  USER_STATUS,
  ROLES,
  MAX_FAILED_ATTEMPTS,
  LOCK_DURATION_MINUTES,
  FAILURE_REASON,
  GENERIC_AUTH_ERROR_MESSAGE,
} = require('../../config/authConstants');

/**
 * Shape the public, password-free view of a user for API responses.
 */
function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toPublicUser(user) {
  const publicUser = {
    userId: user.user_id,
    fullName: user.full_name,
    email: user.email,
    phoneNumber: user.phone_number,
    username: user.username,
    role: user.role_name,
    status: user.status,
    gender: user.gender,
    dateOfBirth: formatDate(user.date_of_birth),
    address: user.address || null,
    avatarUrl: user.avatar_url || null,
  };

  if (user.approval_status) {
    publicUser.approvalStatus = user.approval_status;
  }

  return publicUser;
}

/**
 * Issue an access + refresh token pair for an authenticated user.
 * Refresh token mang `jti` và được lưu một bản ghi phiên trong refresh_tokens
 * (chỉ lưu hash) để có thể thu hồi khi logout.
 *
 * @param {object} user user row joined với roles
 * @param {{ ipAddress?: string, userAgent?: string }} [context]
 * @returns {Promise<object>} token pair
 */
async function issueTokens(user, { ipAddress, userAgent } = {}) {
  const accessToken = signAccessToken({
    userId: user.user_id,
    role: user.role_name,
    status: user.status,
  });

  const jti = crypto.randomUUID();
  const refreshToken = signRefreshToken({ userId: user.user_id, jti });
  // exp do jsonwebtoken tính từ expiresIn; đọc lại để lưu đúng hạn vào DB.
  const { exp } = jwt.decode(refreshToken);

  await authRepository.insertRefreshToken({
    tokenId: jti,
    userId: user.user_id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(exp * 1000),
    ipAddress,
    userAgent,
  });

  return {
    tokenType: 'Bearer',
    accessToken,
    accessExpiresIn: env.jwt.accessExpiresIn,
    refreshToken,
    refreshExpiresIn: env.jwt.refreshExpiresIn,
  };
}

/**
 * Đăng ký tài khoản TENANT mới (status INACTIVE) và gửi OTP qua email.
 * Implements 1.1-register.md: OTP lưu Redis (plaintext, TTL), không dùng DB.
 *
 * @param {{ fullName: string, username: string, email: string, phoneNumber: string, password: string }} input
 * @returns {Promise<{ user: object, otpExpiresInSeconds: number }>}
 */
async function register({ fullName, username, email, phoneNumber, password, gender, dateOfBirth, role: roleName = 'TENANT' }) {
  // 1. Chặn trùng email / phone / username.
  const existing = await authRepository.findUserByEmailPhoneUsername({ email, phoneNumber, username });
  if (existing) {
    throw new AppError(
      'DUPLICATE_ACCOUNT',
      'Email, số điện thoại hoặc tên đăng nhập đã được sử dụng.',
      409,
    );
  }

  // 2. Lấy role.
  const role = await authRepository.getRoleIdByName(roleName);
  if (!role) {
    throw new AppError('ROLE_NOT_FOUND', `Vai trò ${roleName} chưa được cấu hình.`, 500);
  }

  // 3. Hash mật khẩu + tạo user/tenant/landlord/account_security trong transaction.
  const passwordHash = await hashPassword(password);
  const user = await authRepository.createUserWithRole({
    fullName,
    username,
    email,
    phoneNumber,
    passwordHash,
    roleId: role.role_id,
    roleName,
    gender,
    dateOfBirth,
  });

  // 4. Sau commit: sinh OTP, lưu Redis, gửi email.
  const code = otpStore.generateOtp();
  await otpStore.setOtp({ purpose: otpStore.OTP_PURPOSE.REGISTRATION, identifier: email, code });
  await sendOtpEmail({ to: email, code, purpose: otpStore.OTP_PURPOSE.REGISTRATION });

  // Repo không trả role_name/approval_status; bổ sung để response phản ánh đúng vai trò.
  user.role_name = roleName;
  if (roleName === ROLES.LANDLORD) {
    user.approval_status = 'PENDING';
  }

  return {
    user: toRegisterResponse(user),
    otpExpiresInSeconds: env.otp.ttlSeconds,
  };
}

/**
 * Landlord (đã đăng nhập) nộp/cập nhật 2 ảnh CCCD. Ghi ảnh ra storage rồi cập nhật
 * 2 cột id_card. Cho nộp lại khi đang PENDING/REJECTED (ghi đè tên cố định); nếu trước
 * đó bị REJECTED thì đưa hồ sơ về PENDING để Admin duyệt lại.
 *
 * @param {{ userId: string, idCardFront: { buffer: Buffer }, idCardBack: { buffer: Buffer } }} input
 * @returns {Promise<{ approvalStatus: string, idCardSubmitted: boolean }>}
 */
async function submitLandlordIdCards({ userId, idCardFront, idCardBack }) {
  // 1. User phải tồn tại và là LANDLORD.
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'Tài khoản không tồn tại.', 404);
  }
  if (user.role_name !== ROLES.LANDLORD) {
    throw new AppError('NOT_LANDLORD', 'Chỉ tài khoản chủ nhà mới được nộp ảnh CCCD.', 403);
  }

  // 2. Đã duyệt thì không cần nộp lại.
  if (user.approval_status === 'APPROVED') {
    throw new AppError('ALREADY_APPROVED', 'Hồ sơ chủ nhà đã được duyệt, không cần nộp lại CCCD.', 409);
  }

  // 3. Ghi 2 ảnh ra storage (ghi đè nếu nộp lại) rồi cập nhật DB.
  const { frontKey, backKey } = await idCardStorage.save({
    landlordId: userId,
    frontFile: idCardFront,
    backFile: idCardBack,
  });

  // Nộp lại sau khi bị từ chối → đưa về PENDING để duyệt lại.
  const resetToPending = user.approval_status === 'REJECTED';
  await authRepository.updateLandlordIdCards(userId, { frontKey, backKey, resetToPending });

  return {
    approvalStatus: resetToPending ? 'PENDING' : user.approval_status,
    idCardSubmitted: true,
  };
}

/**
 * Kiểm tra OTP và ánh xạ kết quả sang AppError theo quy ước chung (410/429/400).
 * Dùng cho cả verify-otp đăng ký và reset-password. Không tự DEL key — caller tự
 * consume (`deleteOtp`) sau khi xử lý nghiệp vụ thành công.
 *
 * @param {{ purpose: string, email: string, otp: string }} params
 * @returns {Promise<void>} resolve nếu OTP đúng; throw AppError nếu không.
 */
async function assertOtpValid({ purpose, email, otp }) {
  const result = await otpStore.verifyOtp({ purpose, identifier: email, code: otp });

  if (result.status === 'EXPIRED') {
    throw new AppError('OTP_EXPIRED', 'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.', 410);
  }
  if (result.status === 'LOCKED') {
    throw new AppError(
      'OTP_LOCKED',
      'Mã OTP đã bị khóa do nhập sai quá số lần cho phép. Vui lòng yêu cầu gửi lại mã mới.',
      429,
    );
  }
  if (result.status === 'WRONG') {
    const attempts = await otpStore.incrAttempts({ purpose, identifier: email });
    const remaining = Math.max(env.otp.maxAttempts - attempts, 0);
    if (remaining === 0) {
      throw new AppError(
        'OTP_LOCKED',
        'Mã OTP đã bị khóa do nhập sai quá số lần cho phép. Vui lòng yêu cầu gửi lại mã mới.',
        429,
      );
    }
    throw new AppError('OTP_INVALID', 'Mã OTP không chính xác.', 400, { remainingAttempts: remaining });
  }
}

/**
 * Xác thực OTP đăng ký. OTP đúng → kích hoạt tài khoản (INACTIVE → ACTIVE).
 * Implements 1.2-verify-otp.md.
 *
 * @param {{ email: string, otp: string }} input
 * @returns {Promise<{ userId: string, status: string }>}
 */
async function verifyOtp({ email, otp }) {
  const user = await authRepository.findInactiveUserByEmail(email);
  if (!user) {
    throw new AppError('ACCOUNT_NOT_FOUND', 'Không tìm thấy tài khoản cần xác thực.', 404);
  }

  const purpose = otpStore.OTP_PURPOSE.REGISTRATION;
  await assertOtpValid({ purpose, email, otp });

  // OK: consume key TRƯỚC rồi activate (chống double-submit kích hoạt nhiều lần).
  await otpStore.deleteOtp({ purpose, identifier: email });
  await authRepository.activateUser(user.user_id);

  return { userId: user.user_id, status: USER_STATUS.ACTIVE };
}

/**
 * Bước 1 quên mật khẩu: sinh + gửi OTP PASSWORD_RESET cho user ACTIVE.
 * Chống dò tài khoản (enumeration): luôn trả thành công, chỉ thực sự gửi mã khi
 * email tồn tại + đang ACTIVE + không trong cooldown. Implements 1.8-forgot-password.md.
 *
 * @param {{ email: string }} input
 * @returns {Promise<{ otpExpiresInSeconds: number }>}
 */
async function forgotPassword({ email }) {
  const purpose = otpStore.OTP_PURPOSE.PASSWORD_RESET;
  const user = await authRepository.findActiveUserByEmail(email);

  // Chỉ gửi khi đủ điều kiện; mọi nhánh còn lại vẫn trả 200 với message chung.
  if (user && !(await otpStore.isOnCooldown({ purpose, identifier: email }))) {
    const code = otpStore.generateOtp();
    await otpStore.setOtp({ purpose, identifier: email, code });
    await otpStore.setResendCooldown({ purpose, identifier: email });
    await sendOtpEmail({ to: email, code, purpose });
  }

  return { otpExpiresInSeconds: env.otp.ttlSeconds };
}

/**
 * Bước 2 quên mật khẩu: verify OTP PASSWORD_RESET → đổi mật khẩu, thu hồi mọi
 * refresh token và mở khóa account_security. Implements 1.8-forgot-password.md.
 *
 * @param {{ email: string, otp: string, newPassword: string }} input
 * @returns {Promise<void>}
 */
async function resetPassword({ email, otp, newPassword }) {
  const user = await authRepository.findActiveUserByEmail(email);
  if (!user) {
    throw new AppError('ACCOUNT_NOT_FOUND', 'Không tìm thấy tài khoản phù hợp.', 404);
  }

  const purpose = otpStore.OTP_PURPOSE.PASSWORD_RESET;
  await assertOtpValid({ purpose, email, otp });

  // OK: consume key TRƯỚC (chống double-submit) rồi mới đổi mật khẩu.
  await otpStore.deleteOtp({ purpose, identifier: email });

  const passwordHash = await hashPassword(newPassword);
  await authRepository.updateUserPassword(user.user_id, passwordHash);
  // Đổi mật khẩu => thu hồi mọi phiên cũ + mở khóa để đăng nhập lại bằng mật khẩu mới.
  await authRepository.deleteRefreshTokensByUser(user.user_id);
  await authRepository.resetAccountSecurity(user.user_id);
}

/**
 * Gửi lại OTP cho cả đăng ký (REGISTRATION) lẫn quên mật khẩu (PASSWORD_RESET).
 * Ghi đè OTP cũ trong Redis và áp cooldown chống gửi dồn dập, tách theo purpose.
 * Implements 1.3-resend-otp.md + 1.8-forgot-password.md §5.
 *
 * - REGISTRATION: user phải INACTIVE (404 nếu không tồn tại, 409 nếu đã active),
 *   cooldown vượt → 429.
 * - PASSWORD_RESET: user phải ACTIVE; chống enumeration (luôn coi như thành công,
 *   chỉ thực sự gửi khi đủ điều kiện), giống forgot-password.
 *
 * @param {{ email: string, purpose?: string }} input
 * @returns {Promise<{ otpExpiresInSeconds: number }>}
 */
async function resendOtp({ email, purpose = otpStore.OTP_PURPOSE.REGISTRATION }) {
  // PASSWORD_RESET: cùng ngữ nghĩa với forgot-password (đa thiết bị, chống dò email).
  if (purpose === otpStore.OTP_PURPOSE.PASSWORD_RESET) {
    return forgotPassword({ email });
  }

  // REGISTRATION
  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    throw new AppError('ACCOUNT_NOT_FOUND', 'Không tìm thấy tài khoản.', 404);
  }
  if (user.status !== USER_STATUS.INACTIVE) {
    throw new AppError('ALREADY_ACTIVE', 'Tài khoản đã được kích hoạt.', 409);
  }

  if (await otpStore.isOnCooldown({ purpose, identifier: email })) {
    throw new AppError('OTP_COOLDOWN', 'Bạn yêu cầu gửi lại mã quá thường xuyên. Vui lòng thử lại sau.', 429);
  }

  const code = otpStore.generateOtp();
  await otpStore.setOtp({ purpose, identifier: email, code });
  await otpStore.setResendCooldown({ purpose, identifier: email });
  await sendOtpEmail({ to: email, code, purpose });

  return { otpExpiresInSeconds: env.otp.ttlSeconds };
}

/**
 * Authenticate a user by identifier + password.
 * Implements the flow described in AI-output/1.4-login.md:
 * generic errors to prevent account enumeration, temporary lockout after
 * repeated failures, and a full audit trail for every attempt.
 *
 * @param {object} params
 * @param {string} params.identifier email / phone / username
 * @param {string} params.password plain-text password
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 * @returns {Promise<{ user: object, tokens: object }>}
 */
async function login({ identifier, password, ipAddress, userAgent }) {
  // Khai báo hàm audit 
  // const tênHàm = (tham số) => biểu_thức_trả_về;
  // tương đương với
  // const audit = function(success, failureReason, userId) {
  //   return authRepository.writeLoginAudit({ userId, identifier, success, failureReason, ipAddress, userAgent });
  // };
  const audit = (success, failureReason, userId) =>
    authRepository.writeLoginAudit({ userId, identifier, success, failureReason, ipAddress, userAgent });

  const user = await authRepository.findUserByIdentifier(identifier);

  if (!user) {
    await audit(false, FAILURE_REASON.USER_NOT_FOUND, null);
    throw new AppError('INVALID_CREDENTIALS', GENERIC_AUTH_ERROR_MESSAGE, 401);
  }

  // Seed/legacy users may not have a security row yet.
  await authRepository.ensureAccountSecurity(user.user_id);
  const security = await authRepository.getAccountSecurity(user.user_id);

  // 1. Temporary lockout.
  if (security && security.locked_until && new Date(security.locked_until) > new Date()) {
    await audit(false, FAILURE_REASON.ACCOUNT_LOCKED, user.user_id);
    throw new AppError(
      'ACCOUNT_LOCKED',
      'Tài khoản đang bị khóa tạm thời. Vui lòng thử lại sau.',
      423,
      { lockedUntil: new Date(security.locked_until).toISOString() },
    );
  }

  // 2. Account status.
  if (user.status === USER_STATUS.BANNED) {
    await audit(false, FAILURE_REASON.BANNED, user.user_id);
    throw new AppError('ACCOUNT_BANNED', 'Tài khoản đã bị cấm.', 403);
  }
  if (user.status !== USER_STATUS.ACTIVE) {
    await audit(false, FAILURE_REASON.NOT_ACTIVE, user.user_id);
    throw new AppError('ACCOUNT_NOT_ACTIVE', 'Tài khoản chưa được xác thực OTP.', 403);
  }

  // 3. Password.
  const passwordMatches = await comparePassword(password, user.password);
  if (!passwordMatches) {
    // điều_kiện ? giá_trị_nếu_true : giá_trị_nếu_false
    const attempts = (security ? security.failed_login_attempts : 0) + 1;
    const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
      : null;

    await authRepository.registerFailedAttempt(user.user_id, lockedUntil);
    await audit(false, FAILURE_REASON.WRONG_PASSWORD, user.user_id);

    if (shouldLock) {
      throw new AppError(
        'ACCOUNT_LOCKED',
        'Tài khoản đang bị khóa tạm thời. Vui lòng thử lại sau.',
        423,
        { lockedUntil: lockedUntil.toISOString() },
      );
    }
    throw new AppError('INVALID_CREDENTIALS', GENERIC_AUTH_ERROR_MESSAGE, 401);
  }

  // 4. Success.
  await authRepository.registerSuccessfulLogin(user.user_id);
  await audit(true, null, user.user_id);

  return {
    user: toPublicUser(user),
    tokens: await issueTokens(user, { ipAddress, userAgent }),
  };
}

/**
 * Exchange a valid refresh token for a fresh access token. Refresh token có
 * trạng thái: ngoài verify chữ ký + hạn, phải còn tồn tại trong refresh_tokens
 * (chưa bị logout). Không rotation: refresh token được tái dùng tới khi hết hạn
 * hoặc bị thu hồi. User được kiểm tra lại để tài khoản bị banned/khóa không refresh được.
 *
 * @param {object} params
 * @param {string} params.refreshToken
 * @returns {Promise<{ tokenType: string, accessToken: string, accessExpiresIn: string }>}
 */
async function refreshAccessToken({ refreshToken }) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new AppError('INVALID_REFRESH_TOKEN', 'Refresh token không hợp lệ hoặc đã hết hạn.', 401);
  }

  // Phiên phải còn trong DB (chưa logout) và khớp hash của chính token này.
  const jti = getJtiFromPayload(payload);
  const session = jti ? await authRepository.findRefreshTokenById(jti) : null;
  if (!session || session.token_hash !== hashToken(refreshToken)) {
    throw new AppError('INVALID_REFRESH_TOKEN', 'Refresh token không hợp lệ hoặc đã hết hạn.', 401);
  }

  const userId = getUserIdFromPayload(payload);
  const user = await authRepository.findUserById(userId);

  if (!user || user.status !== USER_STATUS.ACTIVE) {
    throw new AppError('INVALID_REFRESH_TOKEN', 'Refresh token không hợp lệ hoặc đã hết hạn.', 401);
  }

  return {
    tokenType: 'Bearer',
    accessToken: signAccessToken({
      userId: user.user_id,
      role: user.role_name,
      status: user.status,
    }),
    accessExpiresIn: env.jwt.accessExpiresIn,
  };
}

/**
 * Đăng xuất: thu hồi (hard-delete) phiên refresh token tương ứng. Idempotent —
 * dù token sai/hết hạn/đã bị xóa thì vẫn coi như thành công, vì mục tiêu chỉ là
 * "đảm bảo phiên không còn dùng được". Ràng buộc user_id để chỉ chủ sở hữu mới
 * xóa được phiên của mình.
 *
 * @param {object} params
 * @param {string} params.userId UUID lấy từ access token (requireAuth)
 * @param {string} params.refreshToken refresh token của phiên cần đăng xuất
 * @returns {Promise<void>}
 */
async function logout({ userId, refreshToken }) {
  // Lấy jti: ưu tiên verify; nếu token sai chữ ký/hết hạn vẫn cố decode để có jti.
  let jti;
  try {
    jti = getJtiFromPayload(verifyRefreshToken(refreshToken));
  } catch (err) {
    const decoded = jwt.decode(refreshToken);
    jti = decoded && typeof decoded === 'object' ? decoded.jti : undefined;
  }

  if (jti) {
    await authRepository.deleteRefreshToken(jti, userId);
  }
}

/**
 * Load the current user's public profile from a verified JWT identity.
 * Implements AI-output/1.5-current-user.md.
 *
 * @param {string} userId UUID extracted from the access token (`sub`)
 * @returns {Promise<object>} public user profile (incl. avatarUrl)
 */
async function getCurrentUser(userId) {
  const user = await authRepository.findUserById(userId);

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'Tài khoản không tồn tại.', 404);
  }
  if (user.status === USER_STATUS.BANNED) {
    throw new AppError('ACCOUNT_BANNED', 'Tài khoản đã bị cấm.', 403);
  }
  if (user.status !== USER_STATUS.ACTIVE) {
    throw new AppError('ACCOUNT_NOT_ACTIVE', 'Tài khoản chưa được kích hoạt.', 403);
  }

  return {
    ...toPublicUser(user),
    avatarUrl: user.avatar_url || null,
  };
}

/**
 * Sinh `username` base từ email, đảm bảo khớp usernameRegex
 * (`^[a-z][a-z0-9_.]{2,49}$`): bắt đầu bằng chữ thường, dài 3–50.
 *
 * @param {string} email
 * @returns {string} base (chưa kiểm tra unique)
 */
function buildUsernameBase(email) {
  let base = String(email || '').split('@')[0].toLowerCase();
  base = base.replace(/[^a-z0-9_.]/g, ''); // chỉ giữ ký tự hợp lệ
  base = base.replace(/^[^a-z]+/, ''); // phải bắt đầu bằng chữ thường
  if (base.length < 3) {
    base = `user_${base}`;
  }
  return base.slice(0, 45); // chừa chỗ cho hậu tố ngẫu nhiên
}

/**
 * Sinh username unique cho user OAuth: thử base, nếu trùng thì thêm hậu tố ngẫu nhiên.
 *
 * @param {string} email
 * @returns {Promise<string>}
 */
async function generateUniqueUsername(email) {
  const base = buildUsernameBase(email);
  if (!(await authRepository.isUsernameTaken(base))) {
    return base;
  }
  for (let i = 0; i < 10; i += 1) {
    const candidate = `${base}_${crypto.randomBytes(2).toString('hex')}`.slice(0, 50);
    if (!(await authRepository.isUsernameTaken(candidate))) {
      return candidate;
    }
  }
  // Fallback gần như chắc chắn unique.
  return `user_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

/** Hash một mật khẩu ngẫu nhiên không dùng được (user OAuth chưa có mật khẩu). */
function randomPasswordHash() {
  return hashPassword(crypto.randomBytes(32).toString('hex'));
}

/**
 * Đăng nhập / đăng ký bằng OAuth (Google / Facebook / GitHub).
 * Đổi authorization code → hồ sơ provider → tìm liên kết / liên kết theo email /
 * tạo mới (status ACTIVE), rồi phát token như login thường. Implements 1.9.
 *
 * @param {{ provider: string, code: string, redirectUri: string, ipAddress?: string, userAgent?: string }} params
 *   provider = lowercase (google|facebook|github)
 * @returns {Promise<{ user: object, tokens: object, isNewUser: boolean }>}
 */
async function loginWithOAuth({ provider, code, redirectUri, ipAddress, userAgent }) {
  const profile = await oauthProviders.getProfile({ provider, code, redirectUri });

  // Chỉ chấp nhận khi có email đã xác thực (chống chiếm tài khoản theo email).
  if (!profile.email || !profile.emailVerified) {
    throw new AppError(
      'OAUTH_EMAIL_REQUIRED',
      'Tài khoản mạng xã hội không cung cấp email đã xác thực.',
      422,
    );
  }
  const email = profile.email.trim().toLowerCase();

  let isNewUser = false;

  // 1. Đã có liên kết (provider, providerUserId)?
  const link = await authRepository.findOAuthAccount(profile.provider, profile.providerUserId);
  let userId = link ? link.user_id : null;

  if (!userId) {
    // 2. Có user cùng email → liên kết vào user đó.
    const existing = await authRepository.findUserByEmail(email);
    if (existing) {
      if (existing.status === USER_STATUS.BANNED) {
        throw new AppError('ACCOUNT_BANNED', 'Tài khoản đã bị cấm.', 403);
      }
      await authRepository.linkOAuthAccount({
        userId: existing.user_id,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        email,
      });
      userId = existing.user_id;
    } else {
      // 3. Tạo user mới (ACTIVE, TENANT, mật khẩu ngẫu nhiên, username tự sinh).
      const role = await authRepository.getRoleIdByName(ROLES.TENANT);
      if (!role) {
        throw new AppError('ROLE_NOT_FOUND', 'Vai trò TENANT chưa được cấu hình.', 500);
      }
      const username = await generateUniqueUsername(email);
      const passwordHash = await randomPasswordHash();
      userId = await authRepository.createOAuthUser({
        fullName: profile.fullName || username,
        email,
        username,
        avatarUrl: profile.avatarUrl,
        passwordHash,
        roleId: role.role_id,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
      });
      isNewUser = true;
    }
  }

  // Lấy user đầy đủ (joined role) để issueTokens + toPublicUser nhất quán với login.
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'Tài khoản không tồn tại.', 404);
  }
  if (user.status === USER_STATUS.BANNED) {
    throw new AppError('ACCOUNT_BANNED', 'Tài khoản đã bị cấm.', 403);
  }

  const tokens = await issueTokens(user, { ipAddress, userAgent });
  await authRepository.writeLoginAudit({
    userId: user.user_id,
    identifier: email,
    success: true,
    failureReason: null,
    ipAddress,
    userAgent,
  });

  return { user: toPublicUser(user), tokens, isNewUser };
}

/**
 * Cập nhật thông tin hồ sơ người dùng.
 *
 * @param {string} userId
 * @param {{ fullName: string, phoneNumber?: string|null, gender: string, dateOfBirth?: string|null, address?: string|null }} updates
 * @returns {Promise<object>} updated public user profile
 */
async function updateUserProfile(userId, { fullName, phoneNumber, gender, dateOfBirth, address, avatarFile, removeAvatar }) {
  // 1. Kiểm tra xem user có tồn tại không.
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'Tài khoản không tồn tại.', 404);
  }

  // 2. Nếu có cập nhật số điện thoại, kiểm tra tính duy nhất.
  if (phoneNumber && phoneNumber !== user.phone_number) {
    const existing = await authRepository.findUserByEmailPhoneUsername({
      phoneNumber,
    });
    if (existing && existing.user_id !== userId) {
      throw new AppError(
        'PHONE_NUMBER_TAKEN',
        'Số điện thoại đã được sử dụng bởi tài khoản khác.',
        409
      );
    }
  }

  let avatarUrl = undefined;
  if (removeAvatar === true || removeAvatar === 'true') {
    // Xóa avatar cũ trên S3 nếu có
    if (user.avatar_url) {
      const oldS3Key = extractS3KeyFromUrl(user.avatar_url);
      if (oldS3Key) {
        try {
          await deleteFromS3(oldS3Key);
        } catch (err) {
          console.error(`Error deleting old avatar from S3 for user ${userId}:`, err.message || err);
        }
      }
    }
    avatarUrl = null;
  } else if (avatarFile) {
    // Xóa avatar cũ trên S3 nếu có
    if (user.avatar_url) {
      const oldS3Key = extractS3KeyFromUrl(user.avatar_url);
      if (oldS3Key) {
        try {
          await deleteFromS3(oldS3Key);
        } catch (err) {
          console.error(`Error deleting old avatar from S3 for user ${userId}:`, err.message || err);
        }
      }
    }
    // Tải avatar mới lên S3
    const s3Key = generateS3Key(RESOURCE_TYPES.AVATAR, userId, avatarFile.originalname);
    avatarUrl = await uploadToS3(avatarFile.buffer, s3Key, avatarFile.mimetype);
  }

  // 3. Tiến hành cập nhật.
  const updatedUser = await authRepository.updateUserProfile(userId, {
    fullName,
    phoneNumber,
    gender,
    dateOfBirth,
    address,
    avatarUrl,
  });

  // 4. Trả về thông tin public sau cập nhật.
  // Đảm bảo user có role_name để toPublicUser hoạt động đúng.
  updatedUser.role_name = user.role_name;
  return {
    ...toPublicUser(updatedUser),
    avatarUrl: updatedUser.avatar_url || null,
  };
}

/**
 * Đổi mật khẩu của người dùng.
 *
 * @param {string} userId
 * @param {object} params
 * @param {string} params.currentPassword
 * @param {string} params.newPassword
 * @returns {Promise<void>}
 */
async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'Tài khoản không tồn tại.', 404);
  }

  // Lấy password hash từ database
  const userPasswordRow = await authRepository.findUserPasswordById(userId);
  if (!userPasswordRow || !userPasswordRow.password) {
    throw new AppError('INVALID_CREDENTIALS', 'Tài khoản chưa cấu hình mật khẩu hoặc lỗi hệ thống.', 401);
  }

  // So sánh mật khẩu cũ
  const matches = await comparePassword(currentPassword, userPasswordRow.password);
  if (!matches) {
    throw new AppError('INVALID_CREDENTIALS', 'Mật khẩu hiện tại không chính xác.', 401);
  }

  // Hash mật khẩu mới và cập nhật
  const newPasswordHash = await hashPassword(newPassword);
  await authRepository.updateUserPassword(userId, newPasswordHash);
}

/**
 * Cập nhật ảnh đại diện của người dùng sử dụng AWS S3.
 *
 * @param {string} userId
 * @param {Buffer} fileBuffer
 * @param {string} originalName
 * @param {string} mimeType
 * @returns {Promise<string>} URL ảnh đại diện mới tải lên S3
 */
async function updateUserAvatar(userId, fileBuffer, originalName, mimeType) {
  // 1. Kiểm tra user
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'Tài khoản không tồn tại.', 404);
  }

  // 2. Xóa avatar cũ trên S3 nếu có
  if (user.avatar_url) {
    const oldS3Key = extractS3KeyFromUrl(user.avatar_url);
    if (oldS3Key) {
      try {
        await deleteFromS3(oldS3Key);
      } catch (err) {
        console.error(`Error deleting old avatar from S3 for user ${userId}:`, err.message || err);
      }
    }
  }

  // 3. Tải avatar mới lên S3
  const s3Key = generateS3Key(RESOURCE_TYPES.AVATAR, userId, originalName);
  const s3Url = await uploadToS3(fileBuffer, s3Key, mimeType);

  // 4. Lưu vào CSDL
  await authRepository.updateUserAvatar(userId, s3Url);

  return s3Url;
}

module.exports = {
  register,
  submitLandlordIdCards,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  loginWithOAuth,
  login,
  refreshAccessToken,
  logout,
  getCurrentUser,
  updateUserProfile,
  changePassword,
  updateUserAvatar,
};
