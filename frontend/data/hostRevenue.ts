// ---------------------------------------------------------------------------
// Host Revenue — Data Types & Mock Data
// ---------------------------------------------------------------------------
// Shapes mirror expected backend API response for easy swap later.
// ---------------------------------------------------------------------------

export type RevenueRange = 'week' | 'month' | 'quarter' | 'year';

export interface RevenueStatusBreakdown {
  completed: number;
  processing: number;
  failed: number;
}

export interface RevenueSummary {
  /** Net revenue across ALL completed deposits, all-time. */
  totalRevenue: number;
  paidRevenue: number;
  pendingSettlement: number;
  completedOrders: number;
  growthRate: number;
  statusBreakdown: RevenueStatusBreakdown;
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
  tenantName: string;
  imageSrc: string;
  imageAlt: string;
  stayPeriod: string;
  customerPayment: number;
  platformFee: number;
  netAmount: number;
  status: SettlementStatus;
}

export const rangeOptions: Array<{ value: RevenueRange; label: string }> = [
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
  { value: 'quarter', label: 'Quý này' },
  { value: 'year', label: 'Năm nay' },
];

export function formatRevenueVND(amount: number, withSpace = true): string {
  return `${amount.toLocaleString('vi-VN')}${withSpace ? ' ' : ''}đ`;
}
