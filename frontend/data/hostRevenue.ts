// ---------------------------------------------------------------------------
// Host Revenue — Data Types & Mock Data
// ---------------------------------------------------------------------------
// Shapes mirror expected backend API response for easy swap later.
// ---------------------------------------------------------------------------

export type RevenueRange = 'month' | 'quarter' | 'year';

export interface RevenueSummary {
  paidRevenue: number;
  pendingSettlement: number;
  completedOrders: number;
  growthRate: number;
}

export interface RevenueTrendPoint {
  label: string;
  revenue: number;
  profit: number;
  highlighted?: boolean;
}

export type SettlementStatus = 'completed' | 'pending';

export interface RevenueSettlement {
  id: string;
  roomTitle: string;
  imageSrc: string;
  imageAlt: string;
  stayPeriod: string;
  customerPayment: number;
  platformFee: number;
  netAmount: number;
  status: SettlementStatus;
}

export const rangeOptions: Array<{ value: RevenueRange; label: string }> = [
  { value: 'month', label: 'Tháng này' },
  { value: 'quarter', label: 'Quý này' },
  { value: 'year', label: 'Năm nay' },
];

export const revenueSummaryByRange: Record<RevenueRange, RevenueSummary> = {
  month: {
    paidRevenue: 124_500_000,
    pendingSettlement: 18_240_000,
    completedOrders: 42,
    growthRate: 12.5,
  },
  quarter: {
    paidRevenue: 358_800_000,
    pendingSettlement: 45_620_000,
    completedOrders: 118,
    growthRate: 9.8,
  },
  year: {
    paidRevenue: 1_248_000_000,
    pendingSettlement: 96_400_000,
    completedOrders: 436,
    growthRate: 18.2,
  },
};

export const revenueTrendByRange: Record<RevenueRange, RevenueTrendPoint[]> = {
  month: [
    { label: 'T1', revenue: 42_000_000, profit: 37_800_000 },
    { label: 'T2', revenue: 58_000_000, profit: 52_200_000 },
    { label: 'T3', revenue: 52_500_000, profit: 47_250_000 },
    { label: 'T4', revenue: 79_200_000, profit: 71_280_000 },
    { label: 'T5', revenue: 95_000_000, profit: 85_500_000, highlighted: true },
    { label: 'T6', revenue: 68_500_000, profit: 61_650_000 },
  ],
  quarter: [
    { label: 'T1', revenue: 96_000_000, profit: 86_400_000 },
    { label: 'T2', revenue: 118_000_000, profit: 106_200_000 },
    { label: 'T3', revenue: 144_800_000, profit: 130_320_000, highlighted: true },
    { label: 'T4', revenue: 132_000_000, profit: 118_800_000 },
    { label: 'T5', revenue: 126_500_000, profit: 113_850_000 },
    { label: 'T6', revenue: 139_000_000, profit: 125_100_000 },
  ],
  year: [
    { label: 'T1', revenue: 178_000_000, profit: 160_200_000 },
    { label: 'T2', revenue: 205_000_000, profit: 184_500_000 },
    { label: 'T3', revenue: 196_500_000, profit: 176_850_000 },
    { label: 'T4', revenue: 236_000_000, profit: 212_400_000 },
    { label: 'T5', revenue: 248_000_000, profit: 223_200_000, highlighted: true },
    { label: 'T6', revenue: 218_500_000, profit: 196_650_000 },
  ],
};

export const settlementTransactions: RevenueSettlement[] = [
  {
    id: '#TX-9821-VN',
    roomTitle: 'Lux Studio - Landmark 81',
    imageSrc: '/images/booking/host/studio-apartment.png',
    imageAlt: 'Lux Studio Landmark 81',
    stayPeriod: '15/05/2024 - 18/05/2024',
    customerPayment: 4_500_000,
    platformFee: -450_000,
    netAmount: 4_050_000,
    status: 'completed',
  },
  {
    id: '#TX-9825-VN',
    roomTitle: 'Sky Villa - Thảo Điền',
    imageSrc: '/images/booking/host/loft-apartment.png',
    imageAlt: 'Sky Villa Thảo Điền',
    stayPeriod: '20/05/2024 - 22/05/2024',
    customerPayment: 12_000_000,
    platformFee: -1_200_000,
    netAmount: 10_800_000,
    status: 'completed',
  },
  {
    id: '#TX-9832-VN',
    roomTitle: 'Minimalist Room - D1',
    imageSrc: '/images/booking/host/one-bedroom-apartment.png',
    imageAlt: 'Minimalist Room District 1',
    stayPeriod: '22/05/2024 - 23/05/2024',
    customerPayment: 1_800_000,
    platformFee: -180_000,
    netAmount: 1_620_000,
    status: 'completed',
  },
];

export const REVENUE_ITEMS_PER_PAGE = 3;
export const TOTAL_REVENUE_TRANSACTIONS = 42;

export function formatRevenueVND(amount: number, withSpace = true): string {
  return `${amount.toLocaleString('vi-VN')}${withSpace ? ' ' : ''}đ`;
}
