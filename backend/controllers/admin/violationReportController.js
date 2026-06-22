const violationReportService = require('../../services/admin/violationReportService');
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

/**
 * GET /api/admin/violation-reports
 * List all violation reports (admin-wide).
 */
async function listReports(req, res, next) {
  try {
    const result = await violationReportService.listAllReports(req.query || {});

    return sendSuccess(res, {
      status: 200,
      message: 'Lấy danh sách khiếu nại vi phạm thành công.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/admin/violation-reports/stats
 * Get summary stats for violation reports.
 */
async function getReportStats(req, res, next) {
  try {
    const stats = await violationReportService.getReportStats();

    return sendSuccess(res, {
      status: 200,
      message: 'Lấy thống kê khiếu nại vi phạm thành công.',
      data: stats,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/admin/violation-reports/:id
 * Get details of a specific report.
 */
async function getReportDetail(req, res, next) {
  try {
    const report = await violationReportService.getReportDetail(req.params.id);

    return sendSuccess(res, {
      status: 200,
      message: 'Lấy chi tiết khiếu nại vi phạm thành công.',
      data: { report },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/admin/violation-reports/:id/status
 * Update the status of a violation report.
 */
async function updateReportStatus(req, res, next) {
  try {
    const report = await violationReportService.updateReportStatus({
      reportId: req.params.id,
      status: req.body ? req.body.status : undefined,
      adminResponseTenant: req.body ? (req.body.adminResponseTenant || req.body.adminResponse) : undefined,
      adminResponseLandlord: req.body ? req.body.adminResponseLandlord : undefined,
      actor: getActor(req),
    });

    return sendSuccess(res, {
      status: 200,
      message: 'Cập nhật trạng thái khiếu nại thành công.',
      data: { report },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listReports,
  getReportStats,
  getReportDetail,
  updateReportStatus,
};
