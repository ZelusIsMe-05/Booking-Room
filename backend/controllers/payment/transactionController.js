const transactionService = require('../../services/payment/transactionService');
const { sendSuccess } = require('../../utils/responseHelper');

async function createTransaction(req, res, next) {
  try {
    const { transaction, paymentUrl } = await transactionService.createTransaction(
      req.user,
      req.body,
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
  getTransactionDetail,
  listMyTransactions,
  listAllTransactions,
};
