const { verifyAccessToken, getUserIdFromPayload } = require('../utils/jwt');
const AppError = require('../utils/AppError');

/**
 * Authentication guard. Verifies the Bearer access token and exposes the
 * caller's identity on `req.user` so downstream modules can read the UUID.
 *
 * On success: req.user = { userId, role, status }.
 */
function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new AppError('UNAUTHENTICATED', 'Bạn cần đăng nhập để thực hiện thao tác này.', 401);
    }

    const payload = verifyAccessToken(token);
    req.user = {
      userId: getUserIdFromPayload(payload),
      role: payload.role,
      status: payload.status,
    };
    return next();
  } catch (err) {
    if (err instanceof AppError) {
      return next(err);
    }
    // jsonwebtoken errors (expired / malformed / bad signature).
    return next(new AppError('INVALID_TOKEN', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.', 401));
  }
}

/**
 * Optional authentication guard.
 * Decodes the Bearer token if present, but does not block if missing or invalid.
 */
function optionalAuthenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme === 'Bearer' && token) {
      const payload = verifyAccessToken(token);
      req.user = {
        userId: getUserIdFromPayload(payload),
        role: payload.role,
        status: payload.status,
      };
    }
  } catch (err) {
    // Ignore errors for optional auth
  }
  return next();
}

module.exports = {
  requireAuth,
  optionalAuthenticate,
};

