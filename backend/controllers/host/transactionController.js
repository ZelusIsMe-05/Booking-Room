const AppError = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/responseHelper');
const { buildCsv } = require('../../utils/csvHelper');
const transactionService = require('../../services/host/transactionService');

async function listTransactions(req, res, next) {
  try {
    const data = await transactionService.listTransactions(req.user.userId, req.query || {});
    return sendSuccess(res, { status: 200, message: 'Danh sách giao dịch', data });
  } catch (err) {
    if (!(err instanceof AppError)) console.error('[host.transactionController.listTransactions ERROR]', err);
    return next(err instanceof AppError ? err : new AppError('UNEXPECTED', 'Đã xảy ra lỗi.', 500));
  }
}

async function getSummary(req, res, next) {
  try {
    const data = await transactionService.getSummary(req.user.userId);
    return sendSuccess(res, { status: 200, message: 'Tổng quan giao dịch', data });
  } catch (err) {
    if (!(err instanceof AppError)) console.error('[host.transactionController.getSummary ERROR]', err);
    return next(err instanceof AppError ? err : new AppError('UNEXPECTED', 'Đã xảy ra lỗi.', 500));
  }
}

async function getTransactionDetail(req, res, next) {
  try {
    const data = await transactionService.getTransactionDetail(req.user.userId, req.params.id);
    return sendSuccess(res, { status: 200, message: 'Chi tiết giao dịch', data });
  } catch (err) {
    if (!(err instanceof AppError)) console.error('[host.transactionController.getTransactionDetail ERROR]', err);
    return next(err instanceof AppError ? err : new AppError('UNEXPECTED', 'Đã xảy ra lỗi.', 500));
  }
}

async function exportTransactions(req, res, next) {
  try {
    const { filename, headers, rows } = await transactionService.exportTransactions(req.user.userId, req.query || {});
    const csv = buildCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (err) {
    if (!(err instanceof AppError)) console.error('[host.transactionController.exportTransactions ERROR]', err);
    return next(err instanceof AppError ? err : new AppError('UNEXPECTED', 'Đã xảy ra lỗi.', 500));
  }
}

module.exports = {
  listTransactions,
  getSummary,
  getTransactionDetail,
  exportTransactions,
};
