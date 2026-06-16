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
 * Role guard. Checks if req.user.role matches the required role(s).
 * Must be used AFTER requireAuth.
 * 
 * @param {...string} allowedRoles - One or more role names (e.g., 'ADMIN', 'LANDLORD')
 * @returns {Function} Express middleware
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new AppError('FORBIDDEN', 'Bạn không có quyền truy cập tài nguyên này.', 403));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('FORBIDDEN', 'Bạn không có quyền truy cập tài nguyên này.', 403));
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  authorize,
};

