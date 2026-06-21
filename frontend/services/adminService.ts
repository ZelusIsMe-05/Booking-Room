import { apiClient } from './apiClient';
import { User } from '@/types/user';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserListResponse {
  items: User[];
  pagination: Pagination;
}

export interface LandlordListResponse {
  items: any[];
  pagination: Pagination;
}

export interface TransactionListResponse {
  items: any[];
  pagination: Pagination;
}

export interface RoomListResponse {
  items: any[];
  pagination: Pagination;
}

export interface ViolationReportListResponse {
  items: any[];
  pagination: Pagination;
}

export interface SupportTicketListResponse {
  items: any[];
  pagination: Pagination;
}

export interface DashboardOverview {
  users: {
    total: number;
  };
  rooms: {
    total: number;
    pendingApproval: number;
  };
  transactions: {
    total: number;
    today: number;
    todayAmount: number;
  };
  support: {
    totalTickets: number;
    totalViolationReports: number;
  };
  logs: {
    total: number;
  };
}

const buildQueryString = (params?: Record<string, any>): string => {
  if (!params) return '';
  const cleanParams: Record<string, string> = {};
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      if (key === 'search') {
        cleanParams['keyword'] = String(params[key]);
      } else {
        cleanParams[key] = String(params[key]);
      }
    }
  });
  return new URLSearchParams(cleanParams).toString();
};

export const adminService = {
  getDashboardOverview: async (): Promise<DashboardOverview> => {
    const response = await apiClient.get<{ status: number; message: string; data: DashboardOverview }>('/admin/dashboard/overview');
    return response.data;
  },

  getUsers: async (params?: Record<string, any>): Promise<UserListResponse> => {
    const queryString = buildQueryString(params);
    const response = await apiClient.get<{ data: UserListResponse }>(`/admin/users?${queryString}`);
    return response.data;
  },

  getUserDetail: async (userId: string): Promise<any> => {
    const response = await apiClient.get<{ data: { user: any } }>(`/admin/users/${userId}`);
    return response.data.user;
  },

  lockUser: async (userId: string): Promise<any> => {
    const response = await apiClient.patch<{ data: any }>(`/admin/users/${userId}/lock`);
    return response.data;
  },

  unlockUser: async (userId: string): Promise<any> => {
    const response = await apiClient.patch<{ data: any }>(`/admin/users/${userId}/unlock`);
    return response.data;
  },

  getLandlords: async (params?: Record<string, any>): Promise<LandlordListResponse> => {
    const queryString = buildQueryString(params);
    const response = await apiClient.get<{ data: LandlordListResponse }>(`/admin/landlords?${queryString}`);
    return response.data;
  },

  approveLandlord: async (userId: string): Promise<any> => {
    const response = await apiClient.patch<{ data: any }>(`/admin/landlords/${userId}/approve`);
    return response.data;
  },

  rejectLandlord: async (userId: string, reason: string): Promise<any> => {
    const response = await apiClient.patch<{ data: any }>(`/admin/landlords/${userId}/reject`, { reason });
    return response.data;
  },

  getTransactions: async (params?: Record<string, any>): Promise<TransactionListResponse> => {
    const queryString = buildQueryString(params);
    // The backend returns { data: { transactions: [...], pagination: {...} } }
    const response = await apiClient.get<{ data: { transactions: any[], pagination: Pagination } }>(`/admin/transactions?${queryString}`);
    return {
      items: response.data.transactions,
      pagination: response.data.pagination,
    };
  },

  getPendingRooms: async (params?: Record<string, any>): Promise<RoomListResponse> => {
    const queryString = buildQueryString(params);
    const response = await apiClient.get<{ data: RoomListResponse }>(`/admin/rooms/pending?${queryString}`);
    return response.data;
  },

  approveRoom: async (roomId: string): Promise<any> => {
    const response = await apiClient.patch<{ data: any }>(`/admin/rooms/${roomId}/approve`);
    return response.data;
  },

  rejectRoom: async (roomId: string, reason: string): Promise<any> => {
    const response = await apiClient.patch<{ data: any }>(`/admin/rooms/${roomId}/reject`, { reason });
    return response.data;
  },

  getViolationReports: async (params?: Record<string, any>): Promise<ViolationReportListResponse> => {
    const queryString = buildQueryString(params);
    const response = await apiClient.get<{ data: ViolationReportListResponse }>(`/admin/violation-reports?${queryString}`);
    return response.data;
  },

  updateViolationReportStatus: async (reportId: string, status: string): Promise<any> => {
    const response = await apiClient.patch<{ data: any }>(`/admin/violation-reports/${reportId}/status`, { status });
    return response.data;
  },

  getSupportTickets: async (params?: Record<string, any>): Promise<SupportTicketListResponse> => {
    const queryString = buildQueryString(params);
    const response = await apiClient.get<{ data: SupportTicketListResponse }>(`/admin/support-tickets?${queryString}`);
    return response.data;
  },

  updateSupportTicketStatus: async (ticketId: string, status: string): Promise<any> => {
    const response = await apiClient.patch<{ data: any }>(`/admin/support-tickets/${ticketId}/status`, { status });
    return response.data;
  },

  getUserStats: async () => {
    // We use parallel requests to fetch totals for KPI cards
    const [allRes, hostRes, bannedRes, pendingRes] = await Promise.all([
      adminService.getUsers({ limit: 1 }),
      adminService.getUsers({ role: 'LANDLORD', limit: 1 }),
      adminService.getUsers({ status: 'BANNED', limit: 1 }),
      adminService.getLandlords({ status: 'PENDING', limit: 1 }),
    ]);

    return {
      total: allRes.pagination.total,
      hostTotal: hostRes.pagination.total,
      bannedTotal: bannedRes.pagination.total,
      pendingTotal: pendingRes.pagination.total,
    };
  },
};
