const AppError = require('../utils/AppError');

function normalizeRoles(roles) {
  return roles.flat().filter(Boolean).map((role) => String(role).toUpperCase());
}

function authorizeRoles(...roles) {
  const allowedRoles = normalizeRoles(roles);

  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('UNAUTHENTICATED', 'Ban can dang nhap de thuc hien thao tac nay.', 401));
    }

    const currentRole = String(req.user.role || '').toUpperCase();
    if (!allowedRoles.includes(currentRole)) {
      return next(new AppError('FORBIDDEN', 'Ban khong co quyen thuc hien thao tac nay.', 403));
    }

    return next();
  };
}



/**
 * Authorization guard by role. MUST run after `requireAuth`, which populates
 * `req.user` (including `role`) from the verified access token.
 *
 * @param {...string} allowedRoles role names allowed to proceed (see config/authConstants ROLES)
 * @returns {import('express').RequestHandler}
 *
 * @example
 *   const { ROLES } = require('../config/authConstants');
 *   router.post('/rooms', requireAuth, requireRole(ROLES.LANDLORD, ROLES.ADMIN), handler);
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // Defensive: requireAuth should always run first.
    if (!req.user || !req.user.role) {
      return next(new AppError('UNAUTHENTICATED', 'Bạn cần đăng nhập để thực hiện thao tác này.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.', 403));
    }

    return next();
  };
}

module.exports = {
  authorizeRoles,
  requireRole,
};
