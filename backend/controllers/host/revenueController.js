const AppError = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/responseHelper');
const { buildCsv } = require('../../utils/csvHelper');
const revenueService = require('../../services/host/revenueService');

async function getOverview(req, res, next) {
  try {
    const data = await revenueService.getOverview(req.user.userId, req.query.range);
    return sendSuccess(res, { status: 200, message: 'Tổng quan doanh thu', data });
  } catch (err) {
    if (!(err instanceof AppError)) console.error('[host.revenueController.getOverview ERROR]', err);
    return next(err instanceof AppError ? err : new AppError('UNEXPECTED', 'Đã xảy ra lỗi.', 500));
  }
}

async function listSettlements(req, res, next) {
  try {
    const data = await revenueService.listSettlements(req.user.userId, req.query || {});
    return sendSuccess(res, { status: 200, message: 'Danh sách đối soát', data });
  } catch (err) {
    if (!(err instanceof AppError)) console.error('[host.revenueController.listSettlements ERROR]', err);
    return next(err instanceof AppError ? err : new AppError('UNEXPECTED', 'Đã xảy ra lỗi.', 500));
  }
}

async function exportSettlements(req, res, next) {
  try {
    const { filename, headers, rows } = await revenueService.exportSettlements(req.user.userId, req.query || {});
    const csv = buildCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (err) {
    if (!(err instanceof AppError)) console.error('[host.revenueController.exportSettlements ERROR]', err);
    return next(err instanceof AppError ? err : new AppError('UNEXPECTED', 'Đã xảy ra lỗi.', 500));
  }
}

module.exports = {
  getOverview,
  listSettlements,
  exportSettlements,
};
