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

module.exports = {
  authorizeRoles,
};
