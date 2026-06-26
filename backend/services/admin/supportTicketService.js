const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { writeSystemLog } = require('./systemLogService');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'CLOSED'];
const VALID_CATEGORIES = ['APP_FAULT', 'ACCOUNT', 'PAYMENT', 'OTHER'];

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

/**
 * Build the base query for support tickets with user info joined.
 */
function baseTicketQuery() {
  return db('support_tickets')
    .leftJoin('users', 'support_tickets.user_id', 'users.user_id')
    .leftJoin('roles', 'users.role_id', 'roles.role_id');
}

function selectTicketFields(query) {
  return query.select(
    'support_tickets.ticket_id',
    'support_tickets.user_id',
    'support_tickets.category',
    'support_tickets.title',
    'support_tickets.detailed_description',
    'support_tickets.evidence_image_url',
    'support_tickets.status',
    'support_tickets.admin_response',
    'support_tickets.created_at',
    'support_tickets.updated_at',
    'users.full_name as user_full_name',
    'users.email as user_email',
    'users.phone_number as user_phone_number',
    'users.avatar_url as user_avatar_url',
    'roles.role_name as user_role',
  );
}

function applyFilters(query, filters) {
  if (filters.status) {
    const status = String(filters.status).trim().toUpperCase();
    if (VALID_STATUSES.includes(status)) {
      query.where('support_tickets.status', status);
    }
  }

  if (filters.category) {
    const category = String(filters.category).trim().toUpperCase();
    if (VALID_CATEGORIES.includes(category)) {
      query.where('support_tickets.category', category);
    }
  }

  if (filters.keyword) {
    const keyword = `%${String(filters.keyword).trim()}%`;
    query.where((builder) => {
      builder
        .whereILike('support_tickets.title', keyword)
        .orWhereILike('support_tickets.detailed_description', keyword)
        .orWhereILike('users.full_name', keyword)
        .orWhereILike('users.email', keyword);
    });
  }
}

/**
 * Admin: list all support tickets with filters, pagination.
 */
async function listAllTickets(filters = {}) {
  const page = parsePositiveInteger(filters.page, DEFAULT_PAGE);
  const limit = Math.min(parsePositiveInteger(filters.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const offset = (page - 1) * limit;

  const base = baseTicketQuery();
  applyFilters(base, filters);

  const countQuery = base.clone().clearSelect().clearOrder().countDistinct({ total: 'support_tickets.ticket_id' }).first();
  const rowsQuery = selectTicketFields(base.clone())
    .orderBy('support_tickets.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  const [countRow, rows] = await Promise.all([countQuery, rowsQuery]);
  const total = Number(countRow ? countRow.total : 0);

  return {
    items: rows.map(mapTicket),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Admin: get a single ticket detail.
 */
async function getTicketDetail(ticketId) {
  const ticket = await selectTicketFields(baseTicketQuery())
    .where('support_tickets.ticket_id', ticketId)
    .first();

  if (!ticket) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy yêu cầu hỗ trợ.', 404);
  }

  return mapTicket(ticket);
}

/**
 * Admin: update ticket status (OPEN → IN_PROGRESS → CLOSED).
 */
async function updateTicketStatus({ ticketId, status, adminResponse, actor }) {
  const upperStatus = String(status).trim().toUpperCase();
  if (!VALID_STATUSES.includes(upperStatus)) {
    throw new AppError('VALIDATION_ERROR', `Trạng thái không hợp lệ. Phải là: ${VALID_STATUSES.join(', ')}`, 400);
  }

  const existing = await db('support_tickets').where({ ticket_id: ticketId }).first();
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy yêu cầu hỗ trợ.', 404);
  }

  const trimmedResponse = adminResponse ? String(adminResponse).trim() : '';

  const [updated] = await db('support_tickets')
    .where({ ticket_id: ticketId })
    .update({
      status: upperStatus,
      admin_response: trimmedResponse || null,
      updated_at: db.fn.now(),
    })
    .returning('*');

  // Log admin action
  await writeSystemLog({
    userId: actor.userId,
    action: `ADMIN_UPDATE_TICKET_STATUS ticket=${ticketId} status=${upperStatus}`,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  // Notify the user
  const notificationRepository = require('../../repositories/guest/notificationRepository');
  const statusLabels = { OPEN: 'Chờ xử lý', IN_PROGRESS: 'Đang xử lý', CLOSED: 'Đã giải quyết' };
  let notifContent = `Yêu cầu hỗ trợ của bạn (Mã: ${ticketId.split('-')[0]}) đã được chuyển sang trạng thái: ${statusLabels[upperStatus] || upperStatus}.`;
  if (trimmedResponse) {
    notifContent += ` Phản hồi từ quản trị viên: "${trimmedResponse}"`;
  }
  await notificationRepository.insertNotification({
    user_id: existing.user_id,
    title: 'Cập nhật yêu cầu hỗ trợ',
    content: notifContent,
    notification_type: 'SUPPORT',
    status: 'UNREAD',
  });

  return mapTicketRow(updated);
}

/**
 * Admin: get summary stats for support tickets.
 */
async function getTicketStats() {
  const [openCount] = await db('support_tickets').where({ status: 'OPEN' }).count('ticket_id as count');
  const [inProgressCount] = await db('support_tickets').where({ status: 'IN_PROGRESS' }).count('ticket_id as count');
  const [closedCount] = await db('support_tickets').where({ status: 'CLOSED' }).count('ticket_id as count');
  const [totalCount] = await db('support_tickets').count('ticket_id as count');

  return {
    total: Number(totalCount.count),
    open: Number(openCount.count),
    inProgress: Number(inProgressCount.count),
    closed: Number(closedCount.count),
  };
}

// ── Mappers ────────────────────────────────────────────────

function mapTicket(row) {
  return {
    ticketId: row.ticket_id,
    category: row.category,
    title: row.title,
    detailedDescription: row.detailed_description,
    evidenceImageUrl: row.evidence_image_url,
    status: row.status,
    adminResponse: row.admin_response,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: {
      userId: row.user_id,
      fullName: row.user_full_name,
      email: row.user_email,
      phoneNumber: row.user_phone_number,
      avatarUrl: row.user_avatar_url,
      role: row.user_role,
    },
  };
}

function mapTicketRow(row) {
  return {
    ticketId: row.ticket_id,
    category: row.category,
    title: row.title,
    detailedDescription: row.detailed_description,
    evidenceImageUrl: row.evidence_image_url,
    status: row.status,
    adminResponse: row.admin_response,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

module.exports = {
  listAllTickets,
  getTicketDetail,
  updateTicketStatus,
  getTicketStats,
};
