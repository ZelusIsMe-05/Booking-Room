const db = require('../../config/db');

/**
 * Data-access layer for the Host "Doanh thu" (Revenue) screen.
 *
 * Source of truth — SHARED CONVENTION with the Admin income/disbursement APIs
 * (xem repositories/payment/transactionRepository.js: findAdminIncomes / processDisbursement):
 *   - transactions     : tiền gross khách trả (status SUCCESS), is_disbursed / disbursed_at
 *   - host_incomes     : sổ thu nhập riêng của host, 1 dòng / 1 transaction SUCCESS.
 *                          status PENDING  → chưa giải ngân, income = 0
 *                          status RECEIVED → đã giải ngân, income = số thực nhận
 *   - disbursement_logs: commission_rate thực tế áp dụng tại thời điểm giải ngân
 *
 * "Doanh thu" (gross) = SUM(transactions.amount)          — tiền khách đã thanh toán
 * "Thực nhận" (net)   = SUM(host_incomes.income RECEIVED) — tiền đã về tài khoản host
 */

// Anchor every revenue query on the host's income ledger (chỉ giao dịch SUCCESS).
function baseIncomeQuery(landlordId) {
  return db('host_incomes as hi')
    .join('transactions as t', 'hi.transaction_id', 't.transaction_id')
    .where('hi.host_id', landlordId)
    .andWhere('t.status', 'SUCCESS');
}

/**
 * Aggregated KPIs for a time window (+ the previous window for growth).
 * Doanh thu chỉ tính giao dịch ĐÃ giải ngân (host_incomes RECEIVED), dated theo disbursed_at.
 *  - gross_received : doanh thu (gross) đã giải ngân trong kỳ
 *  - net_received   : thực nhận (net) đã giải ngân trong kỳ
 *  - pending_gross  : gross còn chờ admin phân phối (host_incomes PENDING)
 *  - completed_orders : số đơn đã giải ngân trong kỳ
 */
async function summary(landlordId, { start, end, prevStart, prevEnd }) {
  const row = await baseIncomeQuery(landlordId)
    .select(
      db.raw(
        `COALESCE(SUM(t.amount) FILTER (WHERE hi.status = 'RECEIVED' AND t.disbursed_at >= ? AND t.disbursed_at < ?), 0)::float as gross_received`,
        [start, end],
      ),
      db.raw(
        `COALESCE(SUM(hi.income) FILTER (WHERE hi.status = 'RECEIVED' AND t.disbursed_at >= ? AND t.disbursed_at < ?), 0)::float as net_received`,
        [start, end],
      ),
      db.raw(
        `COALESCE(SUM(hi.income) FILTER (WHERE hi.status = 'RECEIVED' AND t.disbursed_at >= ? AND t.disbursed_at < ?), 0)::float as net_received_prev`,
        [prevStart, prevEnd],
      ),
      db.raw(`COALESCE(SUM(t.amount) FILTER (WHERE hi.status = 'PENDING'), 0)::float as pending_gross`),
      db.raw(
        `COUNT(*) FILTER (WHERE hi.status = 'RECEIVED' AND t.disbursed_at >= ? AND t.disbursed_at < ?)::int as completed_orders`,
        [start, end],
      ),
    )
    .first();

  return row || { gross_received: 0, net_received: 0, net_received_prev: 0, pending_gross: 0, completed_orders: 0 };
}

/**
 * All-time totals for a landlord. Chỉ tính giao dịch ĐÃ giải ngân (RECEIVED).
 *  - gross_received : tổng doanh thu = tổng transactions.amount đã được admin phân phối
 *  - net_received   : tổng thực nhận = tổng host_incomes.income
 */
async function allTimeTotals(landlordId) {
  const row = await baseIncomeQuery(landlordId)
    .andWhere('hi.status', 'RECEIVED')
    .select(
      db.raw('COALESCE(SUM(t.amount), 0)::float as gross_received'),
      db.raw('COALESCE(SUM(hi.income), 0)::float as net_received'),
    )
    .first();

  return {
    grossReceived: Number(row?.gross_received) || 0,
    netReceived: Number(row?.net_received) || 0,
  };
}

/**
 * Count of deposits by outcome within a window (dated by created_at), for the
 * status-breakdown pie chart: completed / processing / failed.
 */
async function statusBreakdown(landlordId, { start, end }) {
  const row = await db('deposits as d')
    .where('d.landlord_id', landlordId)
    .andWhere('d.created_at', '>=', start)
    .andWhere('d.created_at', '<', end)
    .select(
      db.raw(`COUNT(*) FILTER (WHERE d.status = 'ACCEPTED')::int as completed`),
      db.raw(`COUNT(*) FILTER (WHERE d.status IN ('PROCESSING','CONFIRMED'))::int as processing`),
      db.raw(`COUNT(*) FILTER (WHERE d.status IN ('REJECTED','CANCELLED','EXPIRED'))::int as failed`),
    )
    .first();
  return {
    completed: Number(row?.completed) || 0,
    processing: Number(row?.processing) || 0,
    failed: Number(row?.failed) || 0,
  };
}

/**
 * Monthly totals from `fromDate` onwards (for the trend chart). Chỉ tính giao dịch
 * đã giải ngân, dated theo thời điểm giải ngân (transactions.disbursed_at).
 * @returns {Promise<Array<{ month_start, gross, net }>>}
 *   gross = doanh thu (đã phân phối), net = thực nhận
 */
async function monthlyTrend(landlordId, fromDate) {
  return baseIncomeQuery(landlordId)
    .andWhere('hi.status', 'RECEIVED')
    .andWhere('t.disbursed_at', '>=', fromDate)
    .groupByRaw("date_trunc('month', t.disbursed_at)")
    .orderByRaw("date_trunc('month', t.disbursed_at)")
    .select(
      db.raw("date_trunc('month', t.disbursed_at) as month_start"),
      db.raw('COALESCE(SUM(t.amount), 0)::float as gross'),
      db.raw('COALESCE(SUM(hi.income), 0)::float as net'),
    );
}

/** Shared builder for the settlement detail list (income ledger + room/tenant). */
function settlementQuery(landlordId, search) {
  const q = db('host_incomes as hi')
    .join('transactions as t', 'hi.transaction_id', 't.transaction_id')
    .join('deposits as d', 't.deposit_id', 'd.deposit_id')
    .join('rooms as r', 'd.room_id', 'r.room_id')
    .join('users as u', 'd.tenant_id', 'u.user_id')
    .leftJoin('room_images as ri', function () {
      this.on('ri.room_id', 'r.room_id').andOnVal('ri.is_cover', '=', true);
    })
    .leftJoin('disbursement_logs as dl', 'dl.transaction_id', 't.transaction_id')
    .where('hi.host_id', landlordId)
    .andWhere('t.status', 'SUCCESS');

  if (search) {
    const kw = `%${search}%`;
    q.where((b) => {
      b.whereILike('r.title', kw)
        .orWhereILike('u.full_name', kw)
        .orWhereRaw('CAST(t.transaction_id AS TEXT) ILIKE ?', [kw]);
    });
  }
  return q;
}

const SETTLEMENT_COLUMNS = [
  'd.deposit_id',
  't.transaction_id',
  't.amount',
  't.created_at',
  't.disbursed_at',
  'hi.income',
  'hi.status as income_status',
  'dl.commission_rate',
  'r.title as room_title',
  'u.full_name as tenant_name',
  'ri.image_url as cover_image_url',
];

/** Paginated settlement rows (all SUCCESS transactions on the host's rooms). */
async function listSettlements(landlordId, { search, page = 1, limit = 8 } = {}) {
  const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

  const [{ count }] = await settlementQuery(landlordId, search)
    .clone()
    .count('hi.host_income_id as count');

  const items = await settlementQuery(landlordId, search)
    .orderBy('t.created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .select(SETTLEMENT_COLUMNS);

  return { items, total: Number(count) };
}

/** All settlement rows matching the filter, without pagination (for CSV export). */
async function listAllSettlements(landlordId, { search } = {}) {
  return settlementQuery(landlordId, search)
    .orderBy('t.created_at', 'desc')
    .select(SETTLEMENT_COLUMNS);
}

module.exports = {
  summary,
  allTimeTotals,
  statusBreakdown,
  monthlyTrend,
  listSettlements,
  listAllSettlements,
};
