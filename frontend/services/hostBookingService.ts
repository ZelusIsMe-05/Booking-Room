import { apiClient } from './apiClient';
import { ApiResponse } from '@/types/api';
import type { PendingRequest } from '@/data/hostDashboard';

// ---------------------------------------------------------------------------
// Backend shapes (host deposit list — GET /api/host/bookings/deposits)
// ---------------------------------------------------------------------------

export type HostDepositStatus =
  | 'PROCESSING'
  | 'CONFIRMED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface HostDeposit {
  deposit_id: string;
  tenant_id: string;
  room_id: string;
  landlord_id: string;
  deposit_amount: number;
  status: HostDepositStatus;
  appointment_time: string | null;
  cancellation_reason: string | null;
  expired_at: string;
  created_at: string;
  confirmed_at?: string | null;
  room_title?: string;
  room_address?: string;
  tenant_name?: string;
  tenant_phone?: string;
}

export interface ListHostDepositsResponse {
  deposits: HostDeposit[];
  pagination: { page: number; limit: number; total: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AVATAR_PALETTE: Array<{ bg: string; color: string }> = [
  { bg: '#86F2E4', color: '#006F66' },
  { bg: '#2563EB', color: '#EEEFFF' },
  { bg: '#FFDAD6', color: '#93000A' },
  { bg: '#E7E7F3', color: '#434655' },
];

function pickAvatar(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

/** Map a backend deposit (awaiting host decision) to the PendingRequest shape. */
export function mapToPendingRequest(deposit: HostDeposit): PendingRequest {
  const name = deposit.tenant_name || 'Khách thuê';
  const avatar = pickAvatar(deposit.deposit_id);
  return {
    id: deposit.deposit_id,
    tenantName: name,
    tenantInitial: name.trim().charAt(0).toUpperCase() || '?',
    avatarBg: avatar.bg,
    avatarColor: avatar.color,
    roomTitle: deposit.room_title || 'Phòng',
    depositAmount: Number(deposit.deposit_amount) || 0,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const hostBookingService = {
  listDeposits: async (params: {
    page?: number;
    limit?: number;
    status?: HostDepositStatus;
  } = {}): Promise<ApiResponse<ListHostDepositsResponse>> => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.status) query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get<ApiResponse<ListHostDepositsResponse>>(`/host/bookings/deposits${qs}`);
  },

  /** Host accepts or rejects a deposit (only valid once tenant has paid → CONFIRMED). */
  updateDepositDecision: async (
    depositId: string,
    status: 'ACCEPTED' | 'REJECTED',
    reason?: string,
  ): Promise<ApiResponse<{ deposit: HostDeposit }>> => {
    return apiClient.patch<ApiResponse<{ deposit: HostDeposit }>>(
      `/host/bookings/deposits/${depositId}/status`,
      { status, reason: reason || null },
    );
  },
};
