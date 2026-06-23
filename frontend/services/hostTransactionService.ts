import { apiClient } from './apiClient';
import { ApiResponse } from '@/types/api';
import type { TransactionStatus } from '@/data/hostTransactions';

// ---------------------------------------------------------------------------
// Shapes (from /api/host/transactions*)
// ---------------------------------------------------------------------------

export interface HostTransactionItem {
  id: string;
  bookingCode: string;
  tenantName: string;
  tenantInitial: string;
  roomId: string;
  roomTitle: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalAmount: number;
  status: TransactionStatus;
}

export interface HostTransactionSummary {
  totalRevenue: number;
  totalRevenueChange: number;
  processingAmount: number;
  processingCount: number;
  completedAmount: number;
  completionRate: number;
}

export interface HostTransactionListResponse {
  items: HostTransactionItem[];
  rooms: Array<{ value: string; label: string }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface HostTransactionLine {
  description: string;
  unitPrice: number;
  quantity: number;
  amount: number;
}

export interface HostTransactionTimelineItem {
  title: string;
  time: string;
  note?: string;
}

export interface HostTransactionDetail {
  id: string;
  bookingCode: string;
  status: TransactionStatus;
  statusLabel: string;
  totalPayment: number;
  paymentMethod: string;
  completedAt: string;
  lines: HostTransactionLine[];
  subtotal: number;
  commission: number;
  netPayout: number;
  customer: {
    userId: string;
    name: string;
    avatarSrc: string;
    phone: string;
    email: string;
    completedBookings: number;
  };
  room: { id: string; code: string; title: string; address: string; imageSrc: string };
  timeline: HostTransactionTimelineItem[];
}

export interface ListTransactionsParams {
  page?: number;
  limit?: number;
  status?: TransactionStatus | 'all';
  roomId?: string;
  search?: string;
  dateFrom?: string;
}

export const hostTransactionService = {
  list: async (params: ListTransactionsParams = {}): Promise<ApiResponse<HostTransactionListResponse>> => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.roomId && params.roomId !== 'all') query.append('roomId', params.roomId);
    if (params.search) query.append('search', params.search);
    if (params.dateFrom) query.append('dateFrom', params.dateFrom);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get<ApiResponse<HostTransactionListResponse>>(`/host/transactions${qs}`);
  },

  getSummary: async (): Promise<ApiResponse<HostTransactionSummary>> => {
    return apiClient.get<ApiResponse<HostTransactionSummary>>('/host/transactions/summary');
  },

  getDetail: async (id: string): Promise<ApiResponse<HostTransactionDetail>> => {
    return apiClient.get<ApiResponse<HostTransactionDetail>>(`/host/transactions/${id}`);
  },
};
