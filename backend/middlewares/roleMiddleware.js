const AppError = require('../utils/AppError');

function normalizeRole(role) {
  return role === 'LANDLORD' ? 'HOST' : role;
}

function authorize(...allowedRoles) {
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user) {
      next(new AppError('Authentication required', 401));
      return;
    }

    if (!normalizedAllowedRoles.includes(normalizeRole(req.user.role))) {
      next(new AppError('Forbidden', 403));
      return;
    }

    next();
  };
}

module.exports = {
  authorize,
  normalizeRole,
};
