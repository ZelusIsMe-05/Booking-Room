export interface FinancialLine {
  description: string;
  unitPrice: number;
  quantity: string;
  amount: number;
}

export interface TransactionTimelineItem {
  title: string;
  time: string;
  note?: string;
}

export interface HostTransactionDetail {
  id: string;
  bookingCode: string;
  statusLabel: string;
  totalPayment: number;
  paymentMethod: string;
  completedAt: string;
  lines: FinancialLine[];
  subtotal: number;
  commission: number;
  netPayout: number;
  customer: {
    name: string;
    avatarSrc: string;
    phone: string;
    email: string;
    completedBookings: number;
  };
  room: {
    id: string;
    title: string;
    address: string;
    imageSrc: string;
  };
  timeline: TransactionTimelineItem[];
}

export const defaultTransactionDetail: HostTransactionDetail = {
  id: 'txn-081',
  bookingCode: '#BK-2024-081',
  statusLabel: 'Hoàn thành',
  totalPayment: 2_450_000,
  paymentMethod: 'Ví VNPAY',
  completedAt: '14:32, 24 Th08 2024',
  lines: [
    {
      description: 'Tiền thuê phòng (Studio CentralPark)',
      unitPrice: 1_800_000,
      quantity: '1 đêm',
      amount: 1_800_000,
    },
    {
      description: 'Tiền cọc an tâm (Security Deposit)',
      unitPrice: 500_000,
      quantity: '1',
      amount: 500_000,
    },
    {
      description: 'Phí vệ sinh chuyên sâu',
      unitPrice: 150_000,
      quantity: '1',
      amount: 150_000,
    },
  ],
  subtotal: 2_450_000,
  commission: -195_000,
  netPayout: 2_255_000,
  customer: {
    name: 'Trần Anh Tuấn',
    avatarSrc: '/images/booking/host/host-avatar.jpg',
    phone: '+84 90* *** 123',
    email: 'tuan.tran***@email.com',
    completedBookings: 4,
  },
  room: {
    id: 'studio-q2',
    title: 'Studio Central Park - View Hồ',
    address: 'Vinhomes Central Park, Bình Thạnh, TP. HCM',
    imageSrc: '/images/booking/host/one-bedroom-apartment.png',
  },
  timeline: [
    { title: 'Giao dịch hoàn tất', time: '24 Th08, 2024 • 14:32' },
    {
      title: 'Xác minh thanh toán',
      time: '23 Th08, 2024 • 18:45',
      note: 'Hệ thống đã khớp lệnh thành công qua VNPAY.',
    },
    { title: 'Khởi tạo giao dịch', time: '23 Th08, 2024 • 18:40' },
  ],
};

export function getHostTransactionDetail(id: string): HostTransactionDetail {
  const normalized = decodeURIComponent(id);
  const bookingCode = normalized.startsWith('#')
    ? normalized
    : normalized.toUpperCase().startsWith('BK-') || normalized.toUpperCase().startsWith('TX-')
      ? `#${normalized.toUpperCase()}`
      : defaultTransactionDetail.bookingCode;

  return {
    ...defaultTransactionDetail,
    id: normalized,
    bookingCode,
  };
}

export function formatTransactionVND(amount: number): string {
  const prefix = amount < 0 ? '-' : '';
  return `${prefix}${Math.abs(amount).toLocaleString('vi-VN')} VND`;
}
