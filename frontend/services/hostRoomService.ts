import { apiClient } from './apiClient';
import { ApiResponse } from '@/types/api';
import type { HostListing, HostListingStatus } from '@/data/hostListings';
import type { DashboardRoom, DashboardRoomStatus } from '@/data/hostDashboard';

// ---------------------------------------------------------------------------
// Backend shapes (host-owned rooms — from GET /api/host/rooms/my)
// ---------------------------------------------------------------------------

export interface HostRoomImage {
  sequence_number: number;
  image_url: string;
  is_cover: boolean;
}

export interface HostRoom {
  room_id: string;
  title: string;
  room_type: string;
  detailed_address: string;
  room_description: string | null;
  max_capacity: number;
  monthly_rent: number;
  deposit_amount: number;
  electricity_cost: number;
  water_cost: number;
  internet_cost: number;
  service_fee: number;
  longitude: string | null;
  latitude: string | null;
  status: 'AVAILABLE' | 'LOCKED' | 'RENTED' | string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  created_at: string;
  updated_at: string;
  images: HostRoomImage[];
  cover_image_url: string | null;
}

export interface ListMyRoomsResponse {
  items: HostRoom[];
  pagination: { page: number; limit: number; total: number };
}

const FALLBACK_IMAGE = '/images/booking/host/studio-apartment.png';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a monthly rent into a compact label, e.g. 8500000 → "8,5 Tr". */
export function formatCompactPrice(amount: number): string {
  if (!amount || amount <= 0) return '0';
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const rounded = Math.round(millions * 10) / 10;
    return `${String(rounded).replace('.', ',')} Tr`;
  }
  return amount.toLocaleString('vi-VN');
}

function coverImage(room: HostRoom): string {
  if (room.cover_image_url) return room.cover_image_url;
  const cover = room.images?.find((img) => img.is_cover) || room.images?.[0];
  return cover?.image_url || FALLBACK_IMAGE;
}

/** Map backend room status + approval into the listings-card status. */
function toListingStatus(room: HostRoom): HostListingStatus {
  if (room.approval_status === 'PENDING') return 'pending';
  if (room.status === 'RENTED') return 'rented';
  return 'active';
}

const listingStatusMeta: Record<HostListingStatus, { statusLabel: string; visibilityLabel: string; isVisible: boolean }> = {
  active: { statusLabel: 'Đang hoạt động', visibilityLabel: 'Hiển thị', isVisible: true },
  rented: { statusLabel: 'Đã cho thuê', visibilityLabel: 'Tạm ẩn', isVisible: false },
  pending: { statusLabel: 'Chờ duyệt', visibilityLabel: 'Chờ duyệt', isVisible: false },
};

/** Map a backend host room to the HostListing UI shape. */
export function mapToHostListing(room: HostRoom): HostListing {
  const status = toListingStatus(room);
  const meta = listingStatusMeta[status];
  return {
    id: room.room_id,
    title: room.title,
    address: room.detailed_address,
    price: formatCompactPrice(Number(room.monthly_rent)),
    priceUnit: '/tháng',
    status,
    statusLabel: meta.statusLabel,
    visibilityLabel: meta.visibilityLabel,
    isVisible: meta.isVisible,
    imageSrc: coverImage(room),
    imageAlt: room.title,
  };
}

/** Map a backend host room to the DashboardRoom UI shape. */
export function mapToDashboardRoom(room: HostRoom): DashboardRoom {
  let status: DashboardRoomStatus;
  let statusLabel: string;
  if (room.approval_status === 'PENDING') {
    status = 'pending';
    statusLabel = 'Chờ duyệt';
  } else if (room.status === 'RENTED') {
    status = 'rented';
    statusLabel = 'Đã cho thuê';
  } else {
    status = 'available';
    statusLabel = 'Đang trống';
  }
  return {
    id: room.room_id,
    title: room.title,
    address: room.detailed_address,
    currentPrice: Number(room.monthly_rent),
    status,
    statusLabel,
    imageSrc: coverImage(room),
    imageAlt: room.title,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface ListMyRoomsParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  status?: string;
}

export const hostRoomService = {
  listMyRooms: async (params: ListMyRoomsParams = {}): Promise<ApiResponse<ListMyRoomsResponse>> => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.order) query.append('order', params.order);
    if (params.status) query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get<ApiResponse<ListMyRoomsResponse>>(`/host/rooms/my${qs}`);
  },

  /**
   * Fetch a single host-owned room by id. There is no dedicated backend
   * endpoint (a bare GET /:id on the host router would collide with the public
   * room-detail route), so we resolve it from the host's own list.
   */
  getMyRoomById: async (roomId: string): Promise<HostRoom | null> => {
    const res = await hostRoomService.listMyRooms({ page: 1, limit: 100 });
    const items = res?.data?.items || [];
    return items.find((r) => String(r.room_id) === String(roomId)) || null;
  },

  createRoom: async (formData: FormData): Promise<ApiResponse<{ roomId: string; approval: string }>> => {
    return apiClient.post<ApiResponse<{ roomId: string; approval: string }>>('/host/rooms', formData);
  },

  updateRoom: async (roomId: string, formData: FormData): Promise<ApiResponse<any>> => {
    return apiClient.patch<ApiResponse<any>>(`/host/rooms/${roomId}`, formData);
  },

  deleteRoom: async (roomId: string): Promise<ApiResponse<null>> => {
    return apiClient.delete<ApiResponse<null>>(`/host/rooms/${roomId}`);
  },
};
