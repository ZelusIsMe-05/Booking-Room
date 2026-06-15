const systemLogService = require('../../services/admin/systemLogService');
const { sendSuccess } = require('../../utils/responseHelper');

async function listSystemLogs(req, res, next) {
  try {
    const result = await systemLogService.listSystemLogs(req.query || {});

    return sendSuccess(res, {
      status: 200,
      message: 'Lay danh sach system logs thanh cong.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listSystemLogs,
};
