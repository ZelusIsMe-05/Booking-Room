const transactionService = require('../../services/payment/transactionService');
const { sendSuccess } = require('../../utils/responseHelper');

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || (req.connection && req.connection.remoteAddress) || '127.0.0.1';
}

async function createTransaction(req, res, next) {
  try {
    const { transaction, paymentUrl } = await transactionService.createTransaction(
      req.user,
      req.body,
      getClientIp(req)
    );
    return sendSuccess(res, {
      status: 201,
      message: 'Tao giao dich thanh toan thanh cong.',
      data: { transaction: { ...transaction, payment_url: paymentUrl } },
    });
  } catch (err) {
    return next(err);
  }
}

async function processWebhook(req, res, next) {
  try {
    const { transaction, idempotent } = await transactionService.processWebhook(req.body);
    return sendSuccess(res, {
      status: 200,
      message: idempotent
        ? 'Giao dich da duoc xu ly truoc do.'
        : 'Webhook xu ly thanh cong.',
      data: { transaction, idempotent },
    });
  } catch (err) {
    return next(err);
  }
}

async function vnpayIpn(req, res, next) {
  try {
    const result = await transactionService.processVnpayIpn(req.query || {});
    return res.status(200).json({
      RspCode: result.rspCode,
      Message: result.message,
    });
  } catch (err) {
    console.error('Loi VNPAY IPN:', err);
    return res.status(200).json({
      RspCode: '99',
      Message: 'Unknown error',
    });
  }
}

async function vnpayVerify(req, res, next) {
  try {
    const transaction = await transactionService.processVnpayVerify(req.query || {});
    return sendSuccess(res, {
      status: 200,
      message: 'Xac minh giao dich VNPAY thanh cong.',
      data: { transaction },
    });
  } catch (err) {
    return next(err);
  }
}

async function getTransactionDetail(req, res, next) {
  try {
    const transaction = await transactionService.getTransactionDetail(req.user, req.params.id);
    return sendSuccess(res, {
      status: 200,
      message: 'Lay chi tiet giao dich thanh cong.',
      data: { transaction },
    });
  } catch (err) {
    return next(err);
  }
}

async function listMyTransactions(req, res, next) {
  try {
    const { items, total } = await transactionService.listMyTransactions(req.user, req.query);
    return sendSuccess(res, {
      status: 200,
      message: 'Lay lich su giao dich thanh cong.',
      data: {
        transactions: items,
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

async function listAllTransactions(req, res, next) {
  try {
    const { items, total } = await transactionService.listAllTransactions(req.query);
    return sendSuccess(res, {
      status: 200,
      message: 'Lay danh sach giao dich thanh cong.',
      data: {
        transactions: items,
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

module.exports = {
  createTransaction,
  processWebhook,
  vnpayIpn,
  vnpayVerify,
  getTransactionDetail,
  listMyTransactions,
  listAllTransactions,
};
