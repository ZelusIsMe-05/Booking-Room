const db = require('../../config/db');

/**
 * Data-access layer for the Host "Giao dịch" (Transactions) screen.
 *
 * A host transaction == a deposit on one of the host's rooms, together with its
 * payment transaction. Only this layer knows table/column names.
 */

/**
 * Áp bộ lọc theo UI status. Trạng thái phản ánh CẢ vòng đời đơn cọc lẫn việc admin
 * đã giải ngân hay chưa (t.is_disbursed):
 *  - completed  : chủ trọ đã duyệt (ACCEPTED) VÀ admin đã giải ngân
 *  - awaiting   : chủ trọ đã duyệt (ACCEPTED) nhưng admin CHƯA giải ngân → "Đang phê duyệt"
 *  - processing : đang chờ thanh toán / chờ chủ trọ duyệt (PROCESSING, CONFIRMED)
 *  - cancelled  : bị từ chối / hủy (REJECTED, CANCELLED, EXPIRED)
 */
function applyStatusFilter(q, status) {
  if (!status) return;
  if (status === 'completed') {
    q.where('d.status', 'ACCEPTED').andWhere('t.is_disbursed', true);
  } else if (status === 'awaiting') {
    q.where('d.status', 'ACCEPTED').andWhere((b) => {
      b.where('t.is_disbursed', false).orWhereNull('t.is_disbursed');
    });
  } else if (status === 'processing') {
    q.whereIn('d.status', ['PROCESSING', 'CONFIRMED']);
  } else if (status === 'cancelled') {
    q.whereIn('d.status', ['CANCELLED', 'REJECTED', 'EXPIRED']);
  }
}

function baseListQuery(landlordId) {
  return db('deposits as d')
    .join('rooms as r', 'd.room_id', 'r.room_id')
    .join('users as u', 'd.tenant_id', 'u.user_id')
    // Giao dịch thanh toán thành công (nếu có) để biết đã giải ngân hay chưa.
    .leftJoin('transactions as t', function () {
      this.on('t.deposit_id', 'd.deposit_id').andOnVal('t.status', '=', 'SUCCESS');
    })
    .where('d.landlord_id', landlordId);
}

/**
 * Paginated list of a landlord's deposits, with optional filters.
 *
 * @param {string} landlordId
 * @param {object} opts
 * @param {string} [opts.status]  UI status ('completed'|'pending'|'processing'|'cancelled')
 * @param {string} [opts.roomId]
 * @param {string} [opts.search]  matches tenant name / room title / deposit id
 * @param {string} [opts.dateFrom] ISO date — include deposits created on/after
 * @param {number} [opts.page=1]
 * @param {number} [opts.limit=10]
 */
async function listByLandlord(landlordId, { status, roomId, search, dateFrom, page = 1, limit = 10 } = {}) {
  const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

  const filtered = () => {
    const q = baseListQuery(landlordId);
    applyStatusFilter(q, status);
    if (roomId) q.where('d.room_id', roomId);
    if (dateFrom) q.where('d.created_at', '>=', dateFrom);
    if (search) {
      const kw = `%${search}%`;
      q.where((b) => {
        b.whereILike('u.full_name', kw)
          .orWhereILike('r.title', kw)
          .orWhereRaw('CAST(d.deposit_id AS TEXT) ILIKE ?', [kw]);
      });
    }
    return q;
  };

  const [{ count }] = await filtered().clone().countDistinct('d.deposit_id as count');

  const items = await filtered()
    .orderBy('d.created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .select(
      'd.deposit_id',
      'd.deposit_amount',
      'd.status',
      'd.appointment_time',
      'd.created_at',
      'd.confirmed_at',
      'd.host_accepted_at',
      't.is_disbursed',
      'r.room_id',
      'r.title as room_title',
      'r.detailed_address as room_address',
      'u.full_name as tenant_name',
    );

  return { items, total: Number(count) };
}

/**
 * All deposits matching the same filters as listByLandlord, without pagination.
 * Used for exporting the full filtered set to CSV.
 */
async function listAllByLandlord(landlordId, { status, roomId, search, dateFrom } = {}) {
  const q = baseListQuery(landlordId);
  applyStatusFilter(q, status);
  if (roomId) q.where('d.room_id', roomId);
  if (dateFrom) q.where('d.created_at', '>=', dateFrom);
  if (search) {
    const kw = `%${search}%`;
    q.where((b) => {
      b.whereILike('u.full_name', kw)
        .orWhereILike('r.title', kw)
        .orWhereRaw('CAST(d.deposit_id AS TEXT) ILIKE ?', [kw]);
    });
  }

  return q
    .orderBy('d.created_at', 'desc')
    .select(
      'd.deposit_id',
      'd.deposit_amount',
      'd.status',
      'd.appointment_time',
      'd.created_at',
      'd.confirmed_at',
      'd.host_accepted_at',
      't.is_disbursed',
      'r.room_id',
      'r.title as room_title',
      'r.detailed_address as room_address',
      'u.full_name as tenant_name',
    );
}

/** Distinct rooms that have at least one deposit (for the room filter dropdown). */
async function listRoomsWithDeposits(landlordId) {
  return db('deposits as d')
    .join('rooms as r', 'd.room_id', 'r.room_id')
    .where('d.landlord_id', landlordId)
    .distinct('r.room_id', 'r.title')
    .orderBy('r.title', 'asc');
}

/** Aggregated summary cards for a landlord. */
async function summaryByLandlord(landlordId) {
  const row = await db('deposits as d')
    .where('d.landlord_id', landlordId)
    .select(
      db.raw(`COALESCE(SUM(d.deposit_amount) FILTER (WHERE d.status = 'ACCEPTED'), 0)::float as completed_amount`),
      db.raw(`COUNT(*) FILTER (WHERE d.status = 'ACCEPTED')::int as completed_count`),
      db.raw(`COALESCE(SUM(d.deposit_amount) FILTER (WHERE d.status IN ('PROCESSING','CONFIRMED')), 0)::float as processing_amount`),
      db.raw(`COUNT(*) FILTER (WHERE d.status IN ('PROCESSING','CONFIRMED'))::int as processing_count`),
      db.raw('COUNT(*)::int as total_count'),
      db.raw(`COALESCE(SUM(d.deposit_amount) FILTER (WHERE d.status = 'ACCEPTED' AND d.host_accepted_at >= date_trunc('month', now())), 0)::float as this_month`),
      db.raw(`COALESCE(SUM(d.deposit_amount) FILTER (WHERE d.status = 'ACCEPTED' AND d.host_accepted_at >= date_trunc('month', now()) - interval '1 month' AND d.host_accepted_at < date_trunc('month', now())), 0)::float as last_month`),
    )
    .first();

  return row || {};
}

/** Full detail for one deposit owned by the landlord. */
async function detailByLandlord(landlordId, depositId) {
  const row = await db('deposits as d')
    .join('rooms as r', 'd.room_id', 'r.room_id')
    .join('users as u', 'd.tenant_id', 'u.user_id')
    .leftJoin('room_images as ri', function () {
      this.on('ri.room_id', 'r.room_id').andOnVal('ri.is_cover', '=', true);
    })
    .where({ 'd.deposit_id': depositId, 'd.landlord_id': landlordId })
    .select(
      'd.deposit_id',
      'd.deposit_amount',
      'd.status',
      'd.appointment_time',
      'd.created_at',
      'd.confirmed_at',
      'd.host_accepted_at',
      'd.host_rejected_at',
      'd.cancelled_at',
      'd.cancellation_reason',
      'd.payout_status',
      'r.room_id',
      'r.title as room_title',
      'r.detailed_address as room_address',
      'r.monthly_rent',
      'ri.image_url as room_cover_image_url',
      'u.user_id as tenant_id',
      'u.full_name as tenant_name',
      'u.email as tenant_email',
      'u.phone_number as tenant_phone',
      'u.avatar_url as tenant_avatar',
    )
    .first();

  if (!row) return null;

  // Successful payment for this deposit (payment method + paid time), if any.
  const payment = await db('transactions')
    .where({ deposit_id: depositId })
    .orderByRaw(`CASE WHEN status = 'SUCCESS' THEN 0 ELSE 1 END`)
    .orderBy('created_at', 'desc')
    .select('transaction_id', 'amount', 'payment_method', 'status', 'created_at', 'is_disbursed', 'disbursed_at')
    .first();

  // Host income ledger for the successful transaction (shared convention with
  // Admin disbursement): actual net + applied commission_rate when disbursed.
  let income = null;
  if (payment && payment.status === 'SUCCESS') {
    income = await db('host_incomes as hi')
      .leftJoin('disbursement_logs as dl', 'dl.transaction_id', 'hi.transaction_id')
      .where('hi.transaction_id', payment.transaction_id)
      .select('hi.income', 'hi.status as income_status', 'dl.commission_rate')
      .first();
  }

  // How many completed bookings this tenant has overall.
  const [{ count }] = await db('deposits')
    .where({ tenant_id: row.tenant_id, status: 'ACCEPTED' })
    .count('deposit_id as count');

  return {
    ...row,
    payment: payment || null,
    income: income || null,
    tenant_completed_bookings: Number(count),
  };
}

module.exports = {
  listByLandlord,
  listAllByLandlord,
  listRoomsWithDeposits,
  summaryByLandlord,
  detailByLandlord,
};
