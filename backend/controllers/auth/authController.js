const authService = require('../../services/auth/authService');
const AppError = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/responseHelper');

/**
 * Read the client IP, honouring X-Forwarded-For when behind a trusted proxy.
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip;
}

/**
 * POST /api/auth/login
 * Validates input, delegates to the service, and returns the token pair.
 */
async function login(req, res, next) {
  try {
    const { identifier, password } = req.body || {};

    if (!identifier || !password) {
      throw new AppError('MISSING_CREDENTIALS', 'Vui lòng nhập đầy đủ thông tin đăng nhập.', 400);
    }

    const { user, tokens } = await authService.login({
      identifier: String(identifier).trim(),
      password: String(password),
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, {
      status: 200,
      message: 'Đăng nhập thành công.',
      data: { ...tokens, user },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/refresh
 * Exchanges a refresh token for a new access token.
 */
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body || {};

    if (!refreshToken) {
      throw new AppError('MISSING_REFRESH_TOKEN', 'Thiếu refresh token.', 400);
    }

    const tokens = await authService.refreshAccessToken({ refreshToken: String(refreshToken) });

    return sendSuccess(res, {
      status: 200,
      message: 'Cấp lại access token thành công.',
      data: tokens,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/auth/me
 * Returns the authenticated user's public profile. The UUID is taken from
 * req.user.userId, which requireAuth extracted from the access token.
 */
async function getMe(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.userId);

    return sendSuccess(res, {
      status: 200,
      message: 'Lấy thông tin người dùng thành công.',
      data: { user },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  login,
  refresh,
  getMe,
};
