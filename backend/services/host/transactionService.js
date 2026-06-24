const transactionRepository = require('../../repositories/host/transactionRepository');
const AppError = require('../../utils/AppError');

const COMMISSION_RATE = 0.1; // 10% system commission on the deposit

// Deposit status → UI status used by the Host Transactions screen.
const DEPOSIT_TO_UI = {
  PROCESSING: 'processing',
  CONFIRMED: 'pending',
  ACCEPTED: 'completed',
  REJECTED: 'cancelled',
  CANCELLED: 'cancelled',
  EXPIRED: 'cancelled',
};

const STATUS_LABEL = {
  completed: 'Đã hoàn tất',
  awaiting: 'Đang phê duyệt',
  pending: 'Chờ duyệt',
  processing: 'Đang xử lý',
  cancelled: 'Đã từ chối',
};

const PAYMENT_METHOD_LABEL = {
  VNPAY: 'VNPAY',
  MOMO: 'MoMo',
  BANK_TRANSFER: 'Chuyển khoản ngân hàng',
};

function uiStatus(depositStatus) {
  return DEPOSIT_TO_UI[depositStatus] || 'processing';
}

/**
 * Trạng thái hiển thị ở danh sách giao dịch, kết hợp vòng đời đơn cọc + giải ngân:
 *  - ACCEPTED + đã giải ngân  → 'completed'  (Đã hoàn tất)
 *  - ACCEPTED + chưa giải ngân → 'awaiting'  (Đang phê duyệt — chờ admin)
 *  - REJECTED/CANCELLED/EXPIRED → 'cancelled' (Đã từ chối)
 *  - còn lại (PROCESSING/CONFIRMED) → 'processing' (Đang xử lý)
 */
function deriveStatus(row) {
  if (['CANCELLED', 'REJECTED', 'EXPIRED'].includes(row.status)) return 'cancelled';
  if (row.status === 'ACCEPTED') return row.is_disbursed ? 'completed' : 'awaiting';
  return 'processing';
}

function bookingCode(depositId) {
  return `#BK-${String(depositId).replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function roomCode(roomId) {
  return `#P-${String(roomId).replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function initial(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

function formatDayMonth(value) {
  if (!value) return '';
  const d = new Date(value);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapListItem(row) {
  const status = deriveStatus(row);
  return {
    id: row.deposit_id,
    bookingCode: bookingCode(row.deposit_id),
    tenantName: row.tenant_name,
    tenantInitial: initial(row.tenant_name),
    roomId: row.room_id,
    roomTitle: row.room_title,
    // The domain is deposit-based (not nightly stays); surface the relevant dates.
    checkIn: formatDayMonth(row.appointment_time || row.created_at),
    checkOut: formatDayMonth(row.host_accepted_at || row.confirmed_at),
    nights: 0,
    guests: 0,
    totalAmount: Number(row.deposit_amount) || 0,
    status,
  };
}

async function listTransactions(landlordId, query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));

  const { items, total } = await transactionRepository.listByLandlord(landlordId, {
    status: query.status && query.status !== 'all' ? query.status : undefined,
    roomId: query.roomId && query.roomId !== 'all' ? query.roomId : undefined,
    search: query.search ? String(query.search).trim() : undefined,
    dateFrom: query.dateFrom || undefined,
    page,
    limit,
  });

  const rooms = await transactionRepository.listRoomsWithDeposits(landlordId);

  return {
    items: items.map(mapListItem),
    rooms: rooms.map((r) => ({ value: r.room_id, label: r.title })),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

async function getSummary(landlordId) {
  const s = await transactionRepository.summaryByLandlord(landlordId);
  const completedAmount = Number(s.completed_amount) || 0;
  const completedCount = Number(s.completed_count) || 0;
  const totalCount = Number(s.total_count) || 0;
  const thisMonth = Number(s.this_month) || 0;
  const lastMonth = Number(s.last_month) || 0;

  const change = lastMonth > 0
    ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
    : thisMonth > 0
      ? 100
      : 0;

  return {
    totalRevenue: completedAmount,
    totalRevenueChange: change,
    processingAmount: Number(s.processing_amount) || 0,
    processingCount: Number(s.processing_count) || 0,
    completedAmount,
    completionRate: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
  };
}

function buildTimeline(row) {
  const timeline = [];
  if (row.created_at) {
    timeline.push({ title: 'Khách tạo đơn đặt cọc', time: formatDateTime(row.created_at) });
  }
  if (row.confirmed_at) {
    timeline.push({ title: 'Thanh toán cọc thành công', time: formatDateTime(row.confirmed_at) });
  }
  if (row.host_accepted_at) {
    timeline.push({ title: 'Chủ nhà đã duyệt đơn', time: formatDateTime(row.host_accepted_at) });
  }
  if (row.host_rejected_at) {
    timeline.push({
      title: 'Chủ nhà từ chối đơn',
      time: formatDateTime(row.host_rejected_at),
      note: row.cancellation_reason || undefined,
    });
  }
  if (row.cancelled_at) {
    timeline.push({
      title: 'Đơn bị hủy',
      time: formatDateTime(row.cancelled_at),
      note: row.cancellation_reason || undefined,
    });
  }
  return timeline;
}

async function getTransactionDetail(landlordId, depositId) {
  const row = await transactionRepository.detailByLandlord(landlordId, depositId);
  if (!row) throw new AppError('NOT_FOUND', 'Không tìm thấy giao dịch.', 404);

  // Trạng thái nhất quán với danh sách: ACCEPTED tách theo việc đã giải ngân.
  let status = uiStatus(row.status);
  if (row.status === 'ACCEPTED') status = row.payment?.is_disbursed ? 'completed' : 'awaiting';
  const deposit = Number(row.deposit_amount) || 0;
  // Gross thực tế khách đã trả (transaction), fallback về deposit_amount.
  const gross = row.payment?.amount != null ? Number(row.payment.amount) : deposit;
  const subtotal = gross;

  // Hoa hồng & thực nhận theo sổ thu nhập thực (giống quy ước giải ngân Admin):
  //  - RECEIVED → dùng host_incomes.income đã giải ngân
  //  - PENDING / chưa có → ước tính theo COMMISSION_RATE (10%)
  const income = row.income;
  const settled = income?.income_status === 'RECEIVED';
  let commission;
  let netPayout;
  if (settled) {
    netPayout = Number(income.income) || 0;
    commission = subtotal - netPayout;
  } else {
    const rate = income?.commission_rate != null ? Number(income.commission_rate) / 100 : COMMISSION_RATE;
    commission = Math.round(subtotal * rate);
    netPayout = subtotal - commission;
  }
  const commissionPercent = subtotal > 0 ? Math.round((commission / subtotal) * 100) : Math.round(COMMISSION_RATE * 100);

  // Trạng thái giải ngân (chỉ có nghĩa với giao dịch đã thanh toán thành công).
  let settlementStatus = 'none';
  if (row.payment?.status === 'SUCCESS') settlementStatus = settled ? 'disbursed' : 'pending';
  const settlementLabel =
    settlementStatus === 'disbursed' ? 'Đã giải ngân' : settlementStatus === 'pending' ? 'Chờ giải ngân' : '—';

  const completedAt = row.host_accepted_at || row.confirmed_at || null;

  return {
    id: row.deposit_id,
    bookingCode: bookingCode(row.deposit_id),
    status,
    statusLabel: STATUS_LABEL[status],
    totalPayment: gross,
    paymentMethod: row.payment?.payment_method
      ? PAYMENT_METHOD_LABEL[row.payment.payment_method] || row.payment.payment_method
      : 'Chưa thanh toán',
    completedAt: completedAt ? formatDateTime(completedAt) : 'Chưa hoàn tất',
    lines: [
      {
        description: `Đặt cọc giữ phòng — ${row.room_title}`,
        unitPrice: gross,
        quantity: 1,
        amount: gross,
      },
    ],
    subtotal,
    commission: -commission,
    commissionPercent,
    netPayout,
    settlementStatus,
    settlementLabel,
    customer: {
      userId: row.tenant_id,
      name: row.tenant_name,
      avatarSrc: row.tenant_avatar || '/images/booking/host/host-avatar.jpg',
      phone: row.tenant_phone || 'Chưa cập nhật',
      email: row.tenant_email || 'Chưa cập nhật',
      completedBookings: row.tenant_completed_bookings,
    },
    room: {
      id: row.room_id,
      code: roomCode(row.room_id),
      title: row.room_title,
      address: row.room_address,
      imageSrc: row.room_cover_image_url || '/images/booking/host/studio-apartment.png',
    },
    timeline: buildTimeline(row),
  };
}

/**
 * Build a CSV of all transactions matching the given filters.
 * Returns { filename, csv } for the controller to stream as a download.
 */
async function exportTransactions(landlordId, query = {}) {
  const rows = await transactionRepository.listAllByLandlord(landlordId, {
    status: query.status && query.status !== 'all' ? query.status : undefined,
    roomId: query.roomId && query.roomId !== 'all' ? query.roomId : undefined,
    search: query.search ? String(query.search).trim() : undefined,
    dateFrom: query.dateFrom || undefined,
  });

  const headers = [
    'Mã giao dịch',
    'Khách thuê',
    'Phòng',
    'Số tiền cọc (đ)',
    'Hoa hồng (đ)',
    'Thực nhận (đ)',
    'Trạng thái',
    'Ngày tạo',
    'Ngày duyệt',
  ];

  const data = rows.map((row) => {
    const gross = Number(row.deposit_amount) || 0;
    const commission = Math.round(gross * COMMISSION_RATE);
    return [
      bookingCode(row.deposit_id),
      row.tenant_name || '',
      row.room_title || '',
      gross,
      commission,
      gross - commission,
      STATUS_LABEL[deriveStatus(row)] || '',
      formatDateTime(row.created_at),
      row.host_accepted_at ? formatDateTime(row.host_accepted_at) : '',
    ];
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return { filename: `giao-dich-${stamp}.csv`, headers, rows: data };
}

module.exports = {
  listTransactions,
  getSummary,
  getTransactionDetail,
  exportTransactions,
};
