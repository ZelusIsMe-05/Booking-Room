const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const authRepository = require('../../repositories/auth/auth.repository');
const AppError = require('../../utils/AppError');
const { comparePassword, hashPassword } = require('../../utils/hashPassword');
const otpStore = require('../../redis/otpStore');
const { sendOtpEmail } = require('../../utils/mailer');
const { toRegisterResponse } = require('../../models/User');
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
function toPublicUser(user) {
  return {
    userId: user.user_id,
    fullName: user.full_name,
    email: user.email,
    phoneNumber: user.phone_number,
    username: user.username,
    role: user.role_name,
    status: user.status,
  };
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
async function register({ fullName, username, email, phoneNumber, password }) {
  // 1. Chặn trùng email / phone / username.
  const existing = await authRepository.findUserByEmailPhoneUsername({ email, phoneNumber, username });
  if (existing) {
    throw new AppError(
      'DUPLICATE_ACCOUNT',
      'Email, số điện thoại hoặc tên đăng nhập đã được sử dụng.',
      409,
    );
  }

  // 2. Lấy role TENANT.
  const role = await authRepository.getRoleIdByName(ROLES.TENANT);
  if (!role) {
    throw new AppError('ROLE_NOT_FOUND', 'Vai trò TENANT chưa được cấu hình.', 500);
  }

  // 3. Hash mật khẩu + tạo user/tenant/account_security trong transaction.
  const passwordHash = await hashPassword(password);
  const user = await authRepository.createTenantUser({
    fullName,
    username,
    email,
    phoneNumber,
    passwordHash,
    roleId: role.role_id,
  });

  // 4. Sau commit: sinh OTP, lưu Redis, gửi email.
  const code = otpStore.generateOtp();
  await otpStore.setOtp({ purpose: otpStore.OTP_PURPOSE.REGISTRATION, identifier: email, code });
  await sendOtpEmail({ to: email, code, purpose: otpStore.OTP_PURPOSE.REGISTRATION });

  return {
    user: toRegisterResponse(user),
    otpExpiresInSeconds: env.otp.ttlSeconds,
  };
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

  // OK: consume key TRƯỚC rồi activate (chống double-submit kích hoạt nhiều lần).
  await otpStore.deleteOtp({ purpose, identifier: email });
  await authRepository.activateUser(user.user_id);

  return { userId: user.user_id, status: USER_STATUS.ACTIVE };
}

/**
 * Gửi lại OTP đăng ký cho tài khoản đang INACTIVE. Ghi đè OTP cũ trong Redis và
 * áp cooldown chống gửi dồn dập. Implements 1.3-resend-otp.md.
 *
 * @param {{ email: string }} input
 * @returns {Promise<{ otpExpiresInSeconds: number }>}
 */
async function resendOtp({ email }) {
  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    throw new AppError('ACCOUNT_NOT_FOUND', 'Không tìm thấy tài khoản.', 404);
  }
  if (user.status !== USER_STATUS.INACTIVE) {
    throw new AppError('ALREADY_ACTIVE', 'Tài khoản đã được kích hoạt.', 409);
  }

  const purpose = otpStore.OTP_PURPOSE.REGISTRATION;
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

module.exports = {
  register,
  verifyOtp,
  resendOtp,
  login,
  refreshAccessToken,
  logout,
  getCurrentUser,
};
