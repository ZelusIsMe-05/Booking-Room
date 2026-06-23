const db = require('../../config/db');

/**
 * Data-access layer for the Host "Doanh thu" (Revenue) screen.
 *
 * Revenue is derived from deposits on the host's rooms:
 *  - ACCEPTED  → host has earned it (paid revenue), dated by host_accepted_at
 *  - CONFIRMED → tenant paid, awaiting settlement, dated by confirmed_at
 */

/**
 * Aggregated KPIs for a time window (+ the previous window for growth).
 * Returns gross amounts; the service applies the commission to get net.
 */
async function summary(landlordId, { start, end, prevStart, prevEnd }) {
  const row = await db('deposits as d')
    .where('d.landlord_id', landlordId)
    .select(
      db.raw(
        `COALESCE(SUM(d.deposit_amount) FILTER (WHERE d.status = 'ACCEPTED' AND d.host_accepted_at >= ? AND d.host_accepted_at < ?), 0)::float as paid_gross`,
        [start, end],
      ),
      db.raw(
        `COALESCE(SUM(d.deposit_amount) FILTER (WHERE d.status = 'ACCEPTED' AND d.host_accepted_at >= ? AND d.host_accepted_at < ?), 0)::float as paid_gross_prev`,
        [prevStart, prevEnd],
      ),
      db.raw(
        `COALESCE(SUM(d.deposit_amount) FILTER (WHERE d.status = 'CONFIRMED' AND d.confirmed_at >= ? AND d.confirmed_at < ?), 0)::float as pending_gross`,
        [start, end],
      ),
      db.raw(
        `COUNT(*) FILTER (WHERE d.status = 'ACCEPTED' AND d.host_accepted_at >= ? AND d.host_accepted_at < ?)::int as completed_orders`,
        [start, end],
      ),
    )
    .first();

  return row || { paid_gross: 0, paid_gross_prev: 0, pending_gross: 0, completed_orders: 0 };
}

/**
 * All-time accepted (completed) gross revenue for a landlord.
 * The service applies the commission to get the net total.
 */
async function totalCompletedGross(landlordId) {
  const row = await db('deposits as d')
    .where('d.landlord_id', landlordId)
    .andWhere('d.status', 'ACCEPTED')
    .select(db.raw('COALESCE(SUM(d.deposit_amount), 0)::float as gross'))
    .first();
  return Number(row?.gross) || 0;
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
 * Monthly accepted-revenue totals from `fromDate` onwards (for the trend chart).
 * @returns {Promise<Array<{ year: number, month: number, gross: number }>>}
 */
async function monthlyTrend(landlordId, fromDate) {
  return db('deposits as d')
    .where('d.landlord_id', landlordId)
    .andWhere('d.status', 'ACCEPTED')
    .andWhere('d.host_accepted_at', '>=', fromDate)
    .groupByRaw("date_trunc('month', d.host_accepted_at)")
    .orderByRaw("date_trunc('month', d.host_accepted_at)")
    .select(
      db.raw("date_trunc('month', d.host_accepted_at) as month_start"),
      db.raw('COALESCE(SUM(d.deposit_amount), 0)::float as gross'),
    );
}

/** Paginated settlement rows (paid / awaiting-settlement deposits). */
async function listSettlements(landlordId, { search, page = 1, limit = 8 } = {}) {
  const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

  const build = () => {
    const q = db('deposits as d')
      .join('rooms as r', 'd.room_id', 'r.room_id')
      .join('users as u', 'd.tenant_id', 'u.user_id')
      .leftJoin('room_images as ri', function () {
        this.on('ri.room_id', 'r.room_id').andOnVal('ri.is_cover', '=', true);
      })
      .where('d.landlord_id', landlordId)
      // Only successful (completed) transactions are surfaced here.
      .andWhere('d.status', 'ACCEPTED');
    if (search) {
      const kw = `%${search}%`;
      q.where((b) => {
        b.whereILike('r.title', kw)
          .orWhereILike('u.full_name', kw)
          .orWhereRaw('CAST(d.deposit_id AS TEXT) ILIKE ?', [kw]);
      });
    }
    return q;
  };

  const [{ count }] = await build().clone().count('d.deposit_id as count');

  const items = await build()
    .orderBy('d.host_accepted_at', 'desc')
    .limit(limit)
    .offset(offset)
    .select(
      'd.deposit_id',
      'd.deposit_amount',
      'd.status',
      'd.created_at',
      'd.confirmed_at',
      'd.host_accepted_at',
      'r.title as room_title',
      'u.full_name as tenant_name',
      'ri.image_url as cover_image_url',
    );

  return { items, total: Number(count) };
}

/** All settlement rows matching the filter, without pagination (for CSV export). */
async function listAllSettlements(landlordId, { search } = {}) {
  const q = db('deposits as d')
    .join('rooms as r', 'd.room_id', 'r.room_id')
    .join('users as u', 'd.tenant_id', 'u.user_id')
    .where('d.landlord_id', landlordId)
    .andWhere('d.status', 'ACCEPTED');
  if (search) {
    const kw = `%${search}%`;
    q.where((b) => {
      b.whereILike('r.title', kw)
        .orWhereILike('u.full_name', kw)
        .orWhereRaw('CAST(d.deposit_id AS TEXT) ILIKE ?', [kw]);
    });
  }

  return q
    .orderBy('d.host_accepted_at', 'desc')
    .select(
      'd.deposit_id',
      'd.deposit_amount',
      'd.status',
      'd.created_at',
      'd.confirmed_at',
      'd.host_accepted_at',
      'r.title as room_title',
      'u.full_name as tenant_name',
    );
}

module.exports = {
  summary,
  totalCompletedGross,
  statusBreakdown,
  monthlyTrend,
  listSettlements,
  listAllSettlements,
};
