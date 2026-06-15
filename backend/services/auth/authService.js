const authRepository = require('../../repositories/auth/authRepository');
const AppError = require('../../utils/AppError');
const { comparePassword } = require('../../utils/hashPassword');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getUserIdFromPayload,
} = require('../../utils/jwt');
const env = require('../../config/env');
const {
  USER_STATUS,
  MAX_FAILED_ATTEMPTS,
  LOCK_DURATION_MINUTES,
  FAILURE_REASON,
  GENERIC_AUTH_ERROR_MESSAGE,
} = require('../../config/authConstants');
const { writeSystemLog } = require('../admin/systemLogService');

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
 */
function issueTokens(user) {
  const accessToken = signAccessToken({
    userId: user.user_id,
    role: user.role_name,
    status: user.status,
  });
  const refreshToken = signRefreshToken({ userId: user.user_id });

  return {
    tokenType: 'Bearer',
    accessToken,
    accessExpiresIn: env.jwt.accessExpiresIn,
    refreshToken,
    refreshExpiresIn: env.jwt.refreshExpiresIn,
  };
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
  await writeSystemLog({
    userId: user.user_id,
    action: 'AUTH_LOGIN_SUCCESS',
    ipAddress,
    userAgent,
  });

  return {
    user: toPublicUser(user),
    tokens: issueTokens(user),
  };
}

/**
 * Exchange a valid refresh token for a fresh access token (stateless, no
 * rotation): the refresh token is reused until it expires. The user is
 * re-checked so a banned/deactivated account cannot keep refreshing.
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
  login,
  refreshAccessToken,
  getCurrentUser,
};
