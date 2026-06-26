// ---------------------------------------------------------------------------
// Host Transactions — Data Types & Mock Data
// ---------------------------------------------------------------------------
// Shapes mirror expected backend API response for easy swap later.
// ---------------------------------------------------------------------------

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransactionStatus =
  | 'completed'
  | 'awaiting'
  | 'cancelled'   // khách chủ động hủy thanh toán / đơn hết hạn
  | 'rejected'    // chủ phòng từ chối đơn
  | 'pending'
  | 'processing';

export interface Transaction {
  id: string;
  bookingCode: string;   // e.g. "#BK-2024-081"
  tenantName: string;
  tenantInitial: string;
  roomTitle: string;
  checkIn: string;       // e.g. "12/10"
  checkOut: string;      // e.g. "15/10"
  nights: number;
  guests: number;
  totalAmount: number;   // VND
  status: TransactionStatus;
}

export interface TransactionSummary {
  totalRevenue: number;
  totalRevenueChange: number; // percentage, positive = increase
  processingAmount: number;
  processingCount: number;    // number of pending transactions
  completedAmount: number;
  completionRate: number;     // percentage 0–100
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const transactionSummary: TransactionSummary = {
  totalRevenue: 124_500_000,
  totalRevenueChange: 12,
  processingAmount: 18_230_000,
  processingCount: 5,
  completedAmount: 106_270_000,
  completionRate: 92,
};

export const transactions: Transaction[] = [
  {
    id: 'txn-081',
    bookingCode: '#BK-2024-081',
    tenantName: 'Trần Anh Tuấn',
    tenantInitial: 'T',
    roomTitle: 'Studio Central Park - View Hồ',
    checkIn: '12/10',
    checkOut: '15/10',
    nights: 3,
    guests: 2,
    totalAmount: 4_250_000,
    status: 'completed',
  },
  {
    id: 'txn-079',
    bookingCode: '#BK-2024-079',
    tenantName: 'Lê Thị Mai',
    tenantInitial: 'L',
    roomTitle: 'Penthouse Indochine Style',
    checkIn: '14/10',
    checkOut: '16/10',
    nights: 2,
    guests: 4,
    totalAmount: 12_800_000,
    status: 'completed',
  },
  {
    id: 'txn-075',
    bookingCode: '#BK-2024-075',
    tenantName: 'Trấn Thành',
    tenantInitial: 'T',
    roomTitle: 'Minimalist Nest District 1',
    checkIn: '08/10',
    checkOut: '10/10',
    nights: 2,
    guests: 1,
    totalAmount: 2_100_000,
    status: 'cancelled',
  },
  {
    id: 'txn-072',
    bookingCode: '#BK-2024-072',
    tenantName: 'Thái Lê',
    tenantInitial: 'T',
    roomTitle: 'Studio Central Park - View Hồ',
    checkIn: '01/10',
    checkOut: '05/10',
    nights: 4,
    guests: 2,
    totalAmount: 5_600_000,
    status: 'completed',
  },
  {
    id: 'txn-068',
    bookingCode: '#BK-2024-068',
    tenantName: 'Nguyễn Hoàng Nam',
    tenantInitial: 'N',
    roomTitle: 'Deluxe Garden View Suite',
    checkIn: '25/09',
    checkOut: '28/09',
    nights: 3,
    guests: 2,
    totalAmount: 7_500_000,
    status: 'processing',
  },
  {
    id: 'txn-065',
    bookingCode: '#BK-2024-065',
    tenantName: 'Phạm Minh Châu',
    tenantInitial: 'P',
    roomTitle: 'Penthouse Indochine Style',
    checkIn: '20/09',
    checkOut: '23/09',
    nights: 3,
    guests: 3,
    totalAmount: 18_900_000,
    status: 'pending',
  },
];

// ─── Status config ────────────────────────────────────────────────────────────

export interface StatusConfig {
  label: string;
  bgClass: string;
  textClass: string;
  uppercase?: boolean;
}

export const statusConfig: Record<TransactionStatus, StatusConfig> = {
  completed: {
    label: 'Đã hoàn tất',
    bgClass: 'bg-[rgba(134,242,228,0.2)]',
    textClass: 'text-[#006A61]',
  },
  awaiting: {
    // ACCEPTED nhưng admin chưa giải ngân.
    label: 'Chờ giải ngân',
    bgClass: 'bg-[rgba(0,74,198,0.1)]',
    textClass: 'text-[#004AC6]',
  },
  rejected: {
    // Chủ phòng từ chối đơn.
    label: 'Đã từ chối',
    bgClass: 'bg-[rgba(186,26,26,0.1)]',
    textClass: 'text-[#BA1A1A]',
  },
  cancelled: {
    // Khách chủ động hủy thanh toán / đơn hết hạn.
    label: 'Đã hủy',
    bgClass: 'bg-[rgba(115,118,134,0.12)]',
    textClass: 'text-[#737686]',
  },
  pending: {
    // Đã cọc nhưng chủ phòng chưa đồng ý.
    label: 'Chờ xác nhận',
    bgClass: 'bg-[rgba(148,55,0,0.1)]',
    textClass: 'text-[#943700]',
  },
  processing: {
    label: 'Đang xử lý',
    bgClass: 'bg-[rgba(103,80,164,0.1)]',
    textClass: 'text-[#6750A4]',
  },
};

// ─── Filter options ────────────────────────────────────────────────────────────

export const statusFilterOptions: Array<{ value: TransactionStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'awaiting', label: 'Chờ giải ngân' },
  { value: 'completed', label: 'Đã hoàn tất' },
  { value: 'rejected', label: 'Đã từ chối' },
  { value: 'cancelled', label: 'Đã hủy' },
];

export const ITEMS_PER_PAGE = 4;
export const TOTAL_TRANSACTIONS = 84; // simulated total from backend

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ';
}
