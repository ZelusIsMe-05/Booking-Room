const revenueRepository = require('../../repositories/host/revenueRepository');

// 10% — KHỚP với hằng số COMMISSION_RATE phía Admin (services/payment/transactionService.js:
// disburseTransaction). Chỉ dùng để ước tính "thực nhận kỳ vọng" cho các giao dịch
// còn PENDING (chưa giải ngân nên chưa có commission_rate thực).
const COMMISSION_RATE = 0.1;

const MONTH_LABELS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

/**
 * "Thực nhận" cho một dòng ledger:
 *  - RECEIVED → dùng số host_incomes.income thực tế (đã giải ngân)
 *  - PENDING  → ước tính = gross * (1 - 10%)
 * @returns {{ net: number, fee: number, settled: boolean }}
 */
function settlementAmounts(row) {
  const gross = Number(row.amount) || 0;
  const settled = row.income_status === 'RECEIVED';
  if (settled) {
    const net = Number(row.income) || 0;
    return { net, fee: gross - net, settled };
  }
  const rate = row.commission_rate != null ? Number(row.commission_rate) / 100 : COMMISSION_RATE;
  const fee = Math.round(gross * rate);
  return { net: gross - fee, fee, settled };
}

/**
 * Compute the [start, end) window and the equivalent previous window for a range.
 */
function rangeWindow(range) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  let start;
  let end;
  let prevStart;
  let prevEnd;

  if (range === 'week') {
    // ISO week: Monday → Monday.
    const day = now.getDay(); // 0 = Sunday … 6 = Saturday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    start = new Date(y, m, now.getDate() + diffToMonday);
    end = new Date(start);
    end.setDate(start.getDate() + 7);
    prevStart = new Date(start);
    prevStart.setDate(start.getDate() - 7);
    prevEnd = new Date(start);
  } else if (range === 'year') {
    start = new Date(y, 0, 1);
    end = new Date(y + 1, 0, 1);
    prevStart = new Date(y - 1, 0, 1);
    prevEnd = start;
  } else if (range === 'quarter') {
    const q = Math.floor(m / 3);
    start = new Date(y, q * 3, 1);
    end = new Date(y, q * 3 + 3, 1);
    prevStart = new Date(y, q * 3 - 3, 1);
    prevEnd = start;
  } else {
    // month (default)
    start = new Date(y, m, 1);
    end = new Date(y, m + 1, 1);
    prevStart = new Date(y, m - 1, 1);
    prevEnd = start;
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    prevStart: prevStart.toISOString(),
    prevEnd: prevEnd.toISOString(),
  };
}

async function getOverview(landlordId, range = 'month') {
  const normalized = ['week', 'month', 'quarter', 'year'].includes(range) ? range : 'month';
  const win = rangeWindow(normalized);

  const [s, trendRows, totals, statusCounts] = await Promise.all([
    revenueRepository.summary(landlordId, win),
    // Trend always shows the last 6 months regardless of range.
    revenueRepository.monthlyTrend(
      landlordId,
      new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString(),
    ),
    revenueRepository.allTimeTotals(landlordId),
    revenueRepository.statusBreakdown(landlordId, win),
  ]);

  const paidThis = Math.round(Number(s.net_received) || 0);
  const paidPrev = Math.round(Number(s.net_received_prev) || 0);
  const growthRate = paidPrev > 0
    ? Math.round(((paidThis - paidPrev) / paidPrev) * 1000) / 10
    : paidThis > 0
      ? 100
      : 0;

  const summary = {
    // Tổng doanh thu = tổng transactions đã được admin phân phối (gross), all-time.
    totalRevenue: Math.round(totals.grossReceived),
    // Thực nhận (net = tổng host_incomes.income) đã giải ngân trong kỳ.
    paidRevenue: paidThis,
    // Doanh thu (gross) còn chờ admin phân phối.
    pendingSettlement: Math.round(Number(s.pending_gross) || 0),
    completedOrders: Number(s.completed_orders) || 0,
    growthRate,
    statusBreakdown: statusCounts,
  };

  // Build 6 month buckets (oldest → newest), filling gaps with zero.
  const now = new Date();
  const byKey = new Map(
    trendRows.map((r) => {
      const d = new Date(r.month_start);
      return [`${d.getFullYear()}-${d.getMonth() + 1}`, { gross: Number(r.gross) || 0, net: Number(r.net) || 0 }];
    }),
  );
  const trend = [];
  let maxRevenue = -1;
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const bucket = byKey.get(`${d.getFullYear()}-${d.getMonth() + 1}`) || { gross: 0, net: 0 };
    trend.push({ label: MONTH_LABELS[d.getMonth()], revenue: bucket.gross, profit: bucket.net });
    if (bucket.gross > maxRevenue) maxRevenue = bucket.gross;
  }
  // Highlight the highest-revenue month (only when there is revenue).
  if (maxRevenue > 0) {
    const idx = trend.findIndex((p) => p.revenue === maxRevenue);
    if (idx >= 0) trend[idx].highlighted = true;
  }

  return { range: normalized, summary, trend };
}

function bookingCode(depositId) {
  return `#TX-${String(depositId).replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function settlementPeriod(row) {
  const from = formatDate(row.created_at);
  const to = formatDate(row.disbursed_at);
  if (to && to !== from) return `${from} - ${to}`;
  return from;
}

async function listSettlements(landlordId, query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 8));

  const { items, total } = await revenueRepository.listSettlements(landlordId, {
    search: query.search ? String(query.search).trim() : undefined,
    page,
    limit,
  });

  return {
    items: items.map((row) => {
      const gross = Number(row.amount) || 0;
      const { net, fee, settled } = settlementAmounts(row);
      return {
        id: bookingCode(row.deposit_id),
        depositId: row.deposit_id,
        roomTitle: row.room_title,
        tenantName: row.tenant_name || 'Khách',
        imageSrc: row.cover_image_url || '/images/booking/host/studio-apartment.png',
        imageAlt: row.room_title,
        stayPeriod: settlementPeriod(row),
        customerPayment: gross,
        platformFee: -fee,
        netAmount: net,
        // 'completed' = đã giải ngân, 'pending' = đang đối soát (chờ admin giải ngân).
        status: settled ? 'completed' : 'pending',
      };
    }),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

/**
 * Build a CSV of all settlement rows matching the search filter.
 * Returns { filename, headers, rows } for the controller to stream.
 */
async function exportSettlements(landlordId, query = {}) {
  const rows = await revenueRepository.listAllSettlements(landlordId, {
    search: query.search ? String(query.search).trim() : undefined,
  });

  const headers = [
    'Mã giao dịch',
    'Phòng',
    'Khách thuê',
    'Thời gian',
    'Doanh thu (đ)',
    'Phí hệ thống (đ)',
    'Thực nhận (đ)',
    'Trạng thái',
  ];

  const data = rows.map((row) => {
    const gross = Number(row.amount) || 0;
    const { net, fee, settled } = settlementAmounts(row);
    return [
      bookingCode(row.deposit_id),
      row.room_title || '',
      row.tenant_name || 'Khách',
      settlementPeriod(row),
      gross,
      fee,
      net,
      settled ? 'Đã giải ngân' : 'Đang đối soát',
    ];
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return { filename: `doanh-thu-${stamp}.csv`, headers, rows: data };
}

module.exports = {
  getOverview,
  listSettlements,
  exportSettlements,
};
