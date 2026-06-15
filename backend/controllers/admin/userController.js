const userService = require('../../services/admin/userService');
const { sendSuccess } = require('../../utils/responseHelper');

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip;
}

function getActor(req) {
  return {
    userId: req.user.userId,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  };
}

async function listUsers(req, res, next) {
  try {
    const result = await userService.listUsers(req.query || {});

    return sendSuccess(res, {
      status: 200,
      message: 'Lay danh sach users thanh cong.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

async function getUserDetail(req, res, next) {
  try {
    const user = await userService.getUserDetail(req.params.id);

    return sendSuccess(res, {
      status: 200,
      message: 'Lay chi tiet user thanh cong.',
      data: { user },
    });
  } catch (err) {
    return next(err);
  }
}

async function lockUser(req, res, next) {
  try {
    const user = await userService.lockUser({
      userId: req.params.id,
      reason: req.body ? req.body.reason : undefined,
      actor: getActor(req),
    });

    return sendSuccess(res, {
      status: 200,
      message: 'Khoa user thanh cong.',
      data: { user },
    });
  } catch (err) {
    return next(err);
  }
}

async function unlockUser(req, res, next) {
  try {
    const user = await userService.unlockUser({
      userId: req.params.id,
      actor: getActor(req),
    });

    return sendSuccess(res, {
      status: 200,
      message: 'Mo khoa user thanh cong.',
      data: { user },
    });
  } catch (err) {
    return next(err);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const user = await userService.updateUserRole({
      userId: req.params.id,
      role: req.body ? req.body.role : undefined,
      actor: getActor(req),
    });

    return sendSuccess(res, {
      status: 200,
      message: 'Cap nhat role user thanh cong.',
      data: { user },
    });
  } catch (err) {
    return next(err);
  }
}

async function resetUserPassword(req, res, next) {
  try {
    const user = await userService.resetUserPassword({
      userId: req.params.id,
      temporaryPassword: req.body ? req.body.temporaryPassword : undefined,
      actor: getActor(req),
    });

    return sendSuccess(res, {
      status: 200,
      message: 'Reset mat khau user thanh cong.',
      data: { user },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listUsers,
  getUserDetail,
  lockUser,
  unlockUser,
  updateUserRole,
  resetUserPassword,
};
