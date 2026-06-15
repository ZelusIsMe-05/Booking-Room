const db = require('../../config/db');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function applyFilters(query, filters) {
  if (filters.userId) {
    query.where('system_logs.user_id', filters.userId);
  }

  if (filters.action) {
    query.whereILike('system_logs.action', `%${filters.action}%`);
  }

  if (filters.from) {
    query.where('system_logs.created_at', '>=', filters.from);
  }

  if (filters.to) {
    query.where('system_logs.created_at', '<=', filters.to);
  }
}

async function listSystemLogs(filters = {}) {
  const page = parsePositiveInteger(filters.page, DEFAULT_PAGE);
  const limit = Math.min(parsePositiveInteger(filters.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const offset = (page - 1) * limit;

  const baseQuery = db('system_logs')
    .leftJoin('users', 'system_logs.user_id', 'users.user_id');

  applyFilters(baseQuery, filters);

  const countQuery = baseQuery.clone().clearSelect().clearOrder().count({ total: '*' }).first();
  const rowsQuery = baseQuery
    .clone()
    .select(
      'system_logs.log_id',
      'system_logs.user_id',
      'users.full_name',
      'users.email',
      'system_logs.action',
      'system_logs.ip_address',
      'system_logs.user_agent',
      'system_logs.created_at',
    )
    .orderBy('system_logs.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  const [countRow, items] = await Promise.all([countQuery, rowsQuery]);
  const total = Number(countRow ? countRow.total : 0);

  return {
    items: items.map((item) => ({
      logId: item.log_id,
      userId: item.user_id,
      user: item.user_id
        ? {
            fullName: item.full_name,
            email: item.email,
          }
        : null,
      action: item.action,
      ipAddress: item.ip_address,
      userAgent: item.user_agent,
      createdAt: item.created_at,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function writeSystemLog({ userId, action, ipAddress, userAgent }) {
  if (!userId || !action) {
    return null;
  }

  const [row] = await db('system_logs')
    .insert({
      user_id: userId,
      action,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    })
    .returning('*');

  return row;
}

module.exports = {
  listSystemLogs,
  writeSystemLog,
};
