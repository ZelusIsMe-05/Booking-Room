const depositService = require('../../services/booking/depositService');
const { sendSuccess } = require('../../utils/responseHelper');

async function createDeposit(req, res, next) {
  try {
    const deposit = await depositService.createDeposit(req.user, req.body);
    return sendSuccess(res, {
      status: 201,
      message: 'Tao don dat coc thanh cong. Phong da bi khoa trong 15 phut.',
      data: { deposit },
    });
  } catch (err) {
    return next(err);
  }
}

async function listMyDeposits(req, res, next) {
  try {
    const { items, total } = await depositService.listMyDeposits(req.user, req.query);
    return sendSuccess(res, {
      status: 200,
      message: 'Lay danh sach don dat coc thanh cong.',
      data: {
        deposits: items,
        pagination: {
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          total,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function getDepositDetail(req, res, next) {
  try {
    const deposit = await depositService.getDepositDetail(req.user, req.params.id);
    return sendSuccess(res, {
      status: 200,
      message: 'Lay chi tiet don dat coc thanh cong.',
      data: { deposit },
    });
  } catch (err) {
    return next(err);
  }
}

async function cancelDeposit(req, res, next) {
  try {
    const deposit = await depositService.cancelDeposit(
      req.user,
      req.params.id,
      req.body ? req.body.reason : null,
    );
    return sendSuccess(res, {
      status: 200,
      message: 'Huy don dat coc thanh cong. Phong da duoc giai phong.',
      data: { deposit },
    });
  } catch (err) {
    return next(err);
  }
}

async function listDepositsForLandlord(req, res, next) {
  try {
    const { items, total } = await depositService.listDepositsForLandlord(req.user, req.query);
    return sendSuccess(res, {
      status: 200,
      message: 'Lay danh sach don dat coc thanh cong.',
      data: {
        deposits: items,
        pagination: {
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          total,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function updateDepositByLandlord(req, res, next) {
  try {
    const deposit = await depositService.updateDepositByLandlord(
      req.user,
      req.params.id,
      req.body ? req.body.status : null,
      req.body ? req.body.reason : null,
    );
    return sendSuccess(res, {
      status: 200,
      message: 'Cap nhat trang thai don dat coc thanh cong.',
      data: { deposit },
    });
  } catch (err) {
    return next(err);
  }
}

async function expireDeposits(req, res, next) {
  try {
    const expired = await depositService.expireOverdueDeposits();
    return sendSuccess(res, {
      status: 200,
      message: `Da expire ${expired.length} don dat coc qua han.`,
      data: { expired, count: expired.length },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createDeposit,
  listMyDeposits,
  getDepositDetail,
  cancelDeposit,
  listDepositsForLandlord,
  updateDepositByLandlord,
  expireDeposits,
};
