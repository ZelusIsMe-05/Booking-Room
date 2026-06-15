const dashboardService = require('../../services/admin/dashboardService');
const { sendSuccess } = require('../../utils/responseHelper');

async function getOverview(req, res, next) {
  try {
    const overview = await dashboardService.getOverview();

    return sendSuccess(res, {
      status: 200,
      message: 'Lay tong quan dashboard thanh cong.',
      data: overview,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getOverview,
};
