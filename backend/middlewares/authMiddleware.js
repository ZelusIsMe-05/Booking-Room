const { verifyAccessToken, getUserIdFromPayload } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const authRepository = require('../repositories/auth/auth.repository');

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

/**
 * Chặn landlord chưa được Admin duyệt thực hiện thao tác chủ nhà.
 * Phải dùng SAU requireAuth (+ thường sau authorize('LANDLORD')).
 * APPROVED → cho qua; PENDING/REJECTED → 403 kèm trạng thái + lý do (nếu có).
 *
 * @type {import('express').RequestHandler}
 */
async function requireApprovedLandlord(req, res, next) {
  try {
    if (!req.user || !req.user.userId) {
      return next(new AppError('UNAUTHENTICATED', 'Bạn cần đăng nhập để thực hiện thao tác này.', 401));
    }

    const landlord = await authRepository.getLandlordApprovalStatus(req.user.userId);
    if (!landlord) {
      return next(new AppError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.', 403));
    }
    if (landlord.approval_status !== 'APPROVED') {
      return next(
        new AppError(
          'LANDLORD_NOT_APPROVED',
          'Hồ sơ chủ nhà của bạn chưa được duyệt. Vui lòng chờ Admin xét duyệt.',
          403,
          {
            approvalStatus: landlord.approval_status,
            rejectionReason: landlord.rejection_reason || null,
          },
        ),
      );
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  requireAuth,
  optionalAuthenticate,
  authorize,
  requireApprovedLandlord,
};

