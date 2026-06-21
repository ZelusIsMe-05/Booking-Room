const supportTicketRepository = require('../../repositories/guest/supportTicketRepository');
const AppError = require('../../utils/AppError');
const { uploadFile, RESOURCE_TYPES } = require('../../utils/s3Helper');

/**
 * Submit a new support ticket.
 */
async function submitTicket(userId, body, file) {
  const { category, title, detailed_description } = body;

  if (!category || !title || !detailed_description) {
    throw new AppError('BAD_REQUEST', 'Vui lòng cung cấp đầy đủ: category, title, và detailed_description.', 400);
  }

  const validCategories = ['APP_FAULT', 'ACCOUNT', 'PAYMENT', 'OTHER'];
  if (!validCategories.includes(category)) {
    throw new AppError('BAD_REQUEST', 'Danh mục (category) không hợp lệ.', 400);
  }

  let evidence_image_url = null;
  if (file) {
    evidence_image_url = await uploadFile(file, RESOURCE_TYPES.REPORT, userId);
  } else if (body.evidence_image_url) {
    evidence_image_url = body.evidence_image_url;
  }

  const ticket = await supportTicketRepository.createTicket({
    user_id: userId,
    category,
    title,
    detailed_description,
    evidence_image_url,
    status: 'OPEN'
  });

  // Tự động sinh thông báo xác nhận hệ thống đã nhận vé hỗ trợ
  const notificationService = require('./notificationService');
  await notificationService.createNotification(
    userId,
    'Hệ thống đã nhận yêu cầu hỗ trợ',
    `Chúng tôi đã ghi nhận yêu cầu hỗ trợ của bạn (Mã: ${ticket.ticket_id.split('-')[0]}). Đội ngũ Admin sẽ phản hồi trong thời gian sớm nhất.`,
    'SYSTEM'
  );

  return ticket;
}

/**
 * Get a paginated list of tickets for the logged-in user.
 */
async function getTickets(userId, { page = 1, limit = 20 }) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (p - 1) * l;

  const { items, total } = await supportTicketRepository.findTicketsByUser(userId, { limit: l, offset });
  return { items, total, page: p, limit: l };
}

/**
 * Get details of a specific ticket.
 */
async function getTicketDetail(ticketId, userId) {
  const ticket = await supportTicketRepository.findTicketById(ticketId, userId);
  if (!ticket) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy yêu cầu hỗ trợ hoặc bạn không có quyền xem.', 404);
  }
  return ticket;
}

/**
 * Cancel (Close) a ticket if it's still open or in progress.
 */
async function cancelTicket(ticketId, userId) {
  // Check if it exists first
  const ticket = await supportTicketRepository.findTicketById(ticketId, userId);
  if (!ticket) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy yêu cầu hỗ trợ.', 404);
  }

  if (ticket.status === 'CLOSED') {
    throw new AppError('BAD_REQUEST', 'Yêu cầu này đã được đóng.', 400);
  }

  const updated = await supportTicketRepository.cancelTicket(ticketId, userId);
  if (!updated) {
    throw new AppError('BAD_REQUEST', 'Không thể hủy yêu cầu hỗ trợ lúc này.', 400);
  }
  return updated;
}

module.exports = {
  submitTicket,
  getTickets,
  getTicketDetail,
  cancelTicket
};
