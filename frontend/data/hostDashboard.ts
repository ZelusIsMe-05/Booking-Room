// ---------------------------------------------------------------------------
// Host Dashboard — Data Types & Mock Data
// ---------------------------------------------------------------------------
// All interfaces are designed to mirror the backend API response shapes so
// that replacing mock data with real API calls requires minimal refactoring.
// ---------------------------------------------------------------------------

// ─── Pending Booking Requests ───────────────────────────────────────────────

export interface PendingRequest {
  id: string;
  tenantName: string;
  /** Initial letter shown in the avatar circle */
  tenantInitial: string;
  /** Tailwind/hex bg colour for the avatar circle */
  avatarBg: string;
  /** Tailwind/hex text colour for the avatar circle */
  avatarColor: string;
  roomTitle: string;
  depositAmount: number; // VND
}

export const pendingRequests: PendingRequest[] = [
  {
    id: 'req-001',
    tenantName: 'Đặng Lê Đức Thịnh',
    tenantInitial: 'T',
    avatarBg: '#86F2E4',
    avatarColor: '#006F66',
    roomTitle: 'Phòng trọ studio Q1',
    depositAmount: 500_000,
  },
  {
    id: 'req-002',
    tenantName: 'Lê Nhật Thành',
    tenantInitial: 'L',
    avatarBg: '#2563EB',
    avatarColor: '#EEEFFF',
    roomTitle: 'Phòng trọ view hồ',
    depositAmount: 900_000,
  },
];

// ─── Quick Stats ─────────────────────────────────────────────────────────────

export interface QuickStat {
  id: string;
  label: string;
  value: string;
  /** Tailwind/hex bg for the icon circle */
  iconBg: string;
  iconType: 'rooms' | 'occupancy';
}

export const quickStats: QuickStat[] = [
  {
    id: 'total-rooms',
    label: 'TỔNG SỐ PHÒNG',
    value: '36 Phòng',
    iconBg: '#86F2E4',
    iconType: 'rooms',
  },
  {
    id: 'occupancy-rate',
    label: 'TỶ LỆ LẤP ĐẦY',
    value: '36%',
    iconBg: '#2563EB',
    iconType: 'occupancy',
  },
];

// ─── Revenue Chart ───────────────────────────────────────────────────────────

export interface WeeklyRevenue {
  week: string;       // e.g. "Tuần 1"
  amount: number;     // VND
  /** 0–1, controls bar height relative to maxAmount */
  heightRatio: number;
}

export interface RevenueData {
  month: string;          // e.g. "Tháng 4, 2026"
  totalRevenue: number;   // VND
  weeks: WeeklyRevenue[];
}

export const revenueData: RevenueData = {
  month: 'Tháng 4, 2026',
  totalRevenue: 36_000_000,
  weeks: [
    { week: 'Tuần 1', amount: 7_000_000,  heightRatio: 0.44 },
    { week: 'Tuần 2', amount: 10_500_000, heightRatio: 0.67 },
    { week: 'Tuần 3', amount: 5_250_000,  heightRatio: 0.33 },
    { week: 'Tuần 4', amount: 13_250_000, heightRatio: 0.84 },
  ],
};

// ─── Dashboard Room Cards ─────────────────────────────────────────────────────

export type DashboardRoomStatus = 'rented' | 'available' | 'pending';

export interface DashboardRoom {
  id: string;
  title: string;
  address: string;
  currentPrice: number;   // VND / tháng
  originalPrice?: number; // VND, shown with strikethrough when discounted
  status: DashboardRoomStatus;
  statusLabel: string;
  imageSrc: string;
  imageAlt: string;
}

export const dashboardRooms: DashboardRoom[] = [
  {
    id: 'studio-q1',
    title: 'Phòng trọ studio Q1',
    address: 'Quận 1, TP. HCM',
    currentPrice: 1_000_000,
    originalPrice: 1_200_000,
    status: 'rented',
    statusLabel: 'Đã cho thuê',
    imageSrc: '/images/booking/host/studio-apartment.png',
    imageAlt: 'Phòng trọ studio Quận 1',
  },
  {
    id: 'view-ho',
    title: 'Phòng trọ view hồ',
    address: 'Sơn Trà, Đà Nẵng',
    currentPrice: 2_500_000,
    status: 'available',
    statusLabel: 'Đang trống',
    imageSrc: '/images/booking/host/one-bedroom-apartment.png',
    imageAlt: 'Phòng trọ view hồ Đà Nẵng',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format VND currency, e.g. 36000000 → "36,000,000 ₫" */
export function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + ' ₫';
}
