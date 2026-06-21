const supportTicketService = require('../../services/guest/supportTicketService');
const { sendSuccess } = require('../../utils/responseHelper');

/**
 * Controller for Support Tickets.
 */

/**
 * POST /api/support-tickets
 * Create a new support ticket.
 */
exports.create = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const ticket = await supportTicketService.submitTicket(userId, req.body, req.file);

    return sendSuccess(res, {
      message: 'Gửi yêu cầu hỗ trợ thành công.',
      data: ticket
    }, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/support-tickets
 * List all tickets for the logged-in user.
 */
exports.list = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { page, limit } = req.query;

    const result = await supportTicketService.getTickets(userId, { page, limit });

    return sendSuccess(res, {
      message: 'Lấy danh sách yêu cầu hỗ trợ thành công.',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/support-tickets/:id
 * Get details of a specific ticket.
 */
exports.detail = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const ticketId = req.params.id;

    const ticket = await supportTicketService.getTicketDetail(ticketId, userId);

    return sendSuccess(res, {
      message: 'Lấy chi tiết yêu cầu hỗ trợ thành công.',
      data: ticket
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/support-tickets/:id/cancel
 * Cancel (close) a specific ticket.
 */
exports.cancel = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const ticketId = req.params.id;

    const updated = await supportTicketService.cancelTicket(ticketId, userId);

    return sendSuccess(res, {
      message: 'Đã hủy yêu cầu hỗ trợ thành công.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
};
