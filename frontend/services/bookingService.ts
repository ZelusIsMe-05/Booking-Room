import { apiClient } from './apiClient';
import { ApiResponse } from '@/types/api';

export interface DepositResponse {
  deposit_id: string;
  tenant_id: string;
  room_id: string;
  landlord_id: string;
  deposit_amount: number;
  status: 'PROCESSING' | 'CONFIRMED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  appointment_time?: string | null;
  cancellation_reason?: string | null;
  expired_at: string;
  created_at: string;
}

export interface TransactionResponse {
  transaction_id: string;
  deposit_id: string;
  amount: number;
  payment_method: 'VNPAY' | 'MOMO' | 'BANK_TRANSFER';
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  payment_url: string;
  created_at: string;
}

export const bookingService = {
  createDeposit: async (roomId: string, appointmentTime?: string): Promise<ApiResponse<{ deposit: DepositResponse }>> => {
    return apiClient.post<ApiResponse<{ deposit: DepositResponse }>>('/bookings/deposits', {
      room_id: roomId,
      appointment_time: appointmentTime || null,
    });
  },

  createTransaction: async (
    depositId: string,
    paymentMethod: 'VNPAY' | 'MOMO' | 'BANK_TRANSFER' = 'VNPAY',
    returnUrl?: string
  ): Promise<ApiResponse<{ transaction: TransactionResponse }>> => {
    return apiClient.post<ApiResponse<{ transaction: TransactionResponse }>>('/payments/transactions', {
      deposit_id: depositId,
      payment_method: paymentMethod,
      return_url: returnUrl || `${window.location.origin}/bookings/payment-result`,
    });
  },

  cancelDeposit: async (depositId: string, reason?: string): Promise<ApiResponse<{ deposit: DepositResponse }>> => {
    return apiClient.patch<ApiResponse<{ deposit: DepositResponse }>>(`/bookings/deposits/${depositId}/cancel`, {
      reason: reason || 'Người dùng hủy đơn',
    });
  },

  getMyDeposits: async (params?: { page?: number; limit?: number; status?: string }): Promise<ApiResponse<{
    deposits: (DepositResponse & { room_title?: string; room_address?: string })[];
    pagination: { page: number; limit: number; total: number };
  }>> => {
    const queryParts = [];
    if (params) {
      if (params.page !== undefined) queryParts.push(`page=${params.page}`);
      if (params.limit !== undefined) queryParts.push(`limit=${params.limit}`);
      if (params.status !== undefined) queryParts.push(`status=${params.status}`);
    }
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return apiClient.get(`/bookings/deposits/my${queryString}`);
  },

  getActiveDeposit: async (roomId: string): Promise<ApiResponse<{
    deposit: DepositResponse;
    transaction: TransactionResponse | null;
  } | null>> => {
    return apiClient.get<ApiResponse<{
      deposit: DepositResponse;
      transaction: TransactionResponse | null;
    } | null>>(`/bookings/deposits/active?room_id=${roomId}`);
  },
};
