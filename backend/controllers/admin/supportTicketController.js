const supportTicketService = require('../../services/admin/supportTicketService');
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
 * GET /api/admin/support-tickets
 * List all support tickets (admin-wide, not scoped to a user).
 */
async function listTickets(req, res, next) {
  try {
    const result = await supportTicketService.listAllTickets(req.query || {});

    return sendSuccess(res, {
      status: 200,
      message: 'Lấy danh sách yêu cầu hỗ trợ thành công.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/admin/support-tickets/stats
 * Get summary stats for support tickets.
 */
async function getTicketStats(req, res, next) {
  try {
    const stats = await supportTicketService.getTicketStats();

    return sendSuccess(res, {
      status: 200,
      message: 'Lấy thống kê yêu cầu hỗ trợ thành công.',
      data: stats,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/admin/support-tickets/:id
 * Get details of a specific ticket.
 */
async function getTicketDetail(req, res, next) {
  try {
    const ticket = await supportTicketService.getTicketDetail(req.params.id);

    return sendSuccess(res, {
      status: 200,
      message: 'Lấy chi tiết yêu cầu hỗ trợ thành công.',
      data: { ticket },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/admin/support-tickets/:id/status
 * Update the status of a ticket.
 */
async function updateTicketStatus(req, res, next) {
  try {
    const ticket = await supportTicketService.updateTicketStatus({
      ticketId: req.params.id,
      status: req.body ? req.body.status : undefined,
      adminResponse: req.body ? req.body.adminResponse : undefined,
      actor: getActor(req),
    });

    return sendSuccess(res, {
      status: 200,
      message: 'Cập nhật trạng thái yêu cầu hỗ trợ thành công.',
      data: { ticket },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listTickets,
  getTicketStats,
  getTicketDetail,
  updateTicketStatus,
};
