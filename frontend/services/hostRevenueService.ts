import { apiClient } from './apiClient';
import { ApiResponse } from '@/types/api';
import type {
  RevenueRange,
  RevenueSummary,
  RevenueTrendPoint,
  RevenueSettlement,
} from '@/data/hostRevenue';

export interface RevenueOverview {
  range: RevenueRange;
  summary: RevenueSummary;
  trend: RevenueTrendPoint[];
}

export type RevenueSettlementItem = RevenueSettlement & { depositId: string };

export interface RevenueSettlementsResponse {
  items: RevenueSettlementItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ListSettlementsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const hostRevenueService = {
  getOverview: async (range: RevenueRange = 'month'): Promise<ApiResponse<RevenueOverview>> => {
    return apiClient.get<ApiResponse<RevenueOverview>>(`/host/revenue/overview?range=${range}`);
  },

  listSettlements: async (
    params: ListSettlementsParams = {},
  ): Promise<ApiResponse<RevenueSettlementsResponse>> => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get<ApiResponse<RevenueSettlementsResponse>>(`/host/revenue/settlements${qs}`);
  },

  /** Download the settlement rows as a CSV file. */
  exportCsv: async (search?: string): Promise<void> => {
    const query = new URLSearchParams();
    if (search) query.append('search', search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient.downloadFile(`/host/revenue/export${qs}`, 'doanh-thu.csv');
  },
};
