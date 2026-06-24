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
  province_name: string | null;
  district_name: string | null;
  ward_name: string | null;
  formatted_address: string | null;
  place_id: string | null;
  room_description: string | null;
  max_capacity: number;
  monthly_rent: number;
  deposit_amount: number;
  electricity_cost: number;
  water_cost: number;
  internet_cost: number;
  service_fee: number;
  longitude: string | number | null;
  latitude: string | number | null;
  status: 'AVAILABLE' | 'LOCKED' | 'RENTED' | 'HIDDEN' | string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  average_rating?: number;
  favorite_count?: number;
  created_at: string;
  updated_at: string;
  images: HostRoomImage[];
  cover_image_url: string | null;
}

export interface RoomReview {
  review_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  reviewer_name: string;
  reviewer_avatar: string | null;
}

export interface RoomReviewsResponse {
  items: RoomReview[];
  total: number;
  page: number;
  limit: number;
}

export interface ListMyRoomsResponse {
  items: HostRoom[];
  pagination: { page: number; limit: number; total: number };
}

// ---------------------------------------------------------------------------
// Overview / dashboard shapes (from GET /api/host/rooms/overview)
// ---------------------------------------------------------------------------

export interface HostOverviewStats {
  total: number;
  rented: number;
  available: number;
  pending: number;
  hidden: number;
  averageRating: number;
}

export interface HostMonthlyRevenue {
  month: number; // 1–12
  amount: number; // VND
}

export interface HostOverviewRevenue {
  year: number;
  totalRevenue: number;
  monthly: HostMonthlyRevenue[];
}

export interface HostFeaturedRoom {
  room_id: string;
  title: string;
  detailed_address: string;
  monthly_rent: number;
  status: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  average_rating: number;
  favorite_count: number;
  cover_image_url: string | null;
}

export interface HostOverview {
  stats: HostOverviewStats;
  revenue: HostOverviewRevenue;
  featuredRooms: HostFeaturedRoom[];
}

const FALLBACK_IMAGE = '/images/booking/host/studio-apartment.png';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a monthly rent explicitly, e.g. 9700000 → "9.700.000đ". */
export function formatExactPrice(amount: number): string {
  if (!amount || amount <= 0) return '0đ';
  return `${Number(amount).toLocaleString('vi-VN')}đ`;
}

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
  if (room.status === 'HIDDEN') return 'hidden';
  if (room.approval_status === 'PENDING') return 'pending';
  if (room.status === 'RENTED') return 'rented';
  return 'active';
}

const listingStatusMeta: Record<HostListingStatus, { statusLabel: string; visibilityLabel: string; isVisible: boolean }> = {
  active: { statusLabel: 'Đang hoạt động', visibilityLabel: 'Hiển thị', isVisible: true },
  rented: { statusLabel: 'Đã cho thuê', visibilityLabel: 'Đã cho thuê', isVisible: true },
  pending: { statusLabel: 'Chờ duyệt', visibilityLabel: 'Chờ duyệt', isVisible: false },
  hidden: { statusLabel: 'Đã ẩn', visibilityLabel: 'Đã ẩn', isVisible: false },
};

/**
 * Compute the listing fields that change after a visibility toggle, so the UI
 * can update optimistically without re-deriving from a full room object.
 */
export function getListingVisibilityMeta(
  nextVisible: boolean,
): Pick<HostListing, 'status' | 'statusLabel' | 'visibilityLabel' | 'isVisible'> {
  const status: HostListingStatus = nextVisible ? 'active' : 'hidden';
  const meta = listingStatusMeta[status];
  return {
    status,
    statusLabel: meta.statusLabel,
    visibilityLabel: meta.visibilityLabel,
    isVisible: meta.isVisible,
  };
}

/** Map a backend host room to the HostListing UI shape. */
export function mapToHostListing(room: HostRoom): HostListing {
  const status = toListingStatus(room);
  const meta = listingStatusMeta[status];
  return {
    id: room.room_id,
    title: room.title,
    address: room.detailed_address,
    price: formatExactPrice(Number(room.monthly_rent)),
    priceUnit: '/tháng',
    status,
    statusLabel: meta.statusLabel,
    visibilityLabel: meta.visibilityLabel,
    isVisible: meta.isVisible,
    imageSrc: coverImage(room),
    imageAlt: room.title,
    rating: Number(room.average_rating) || 0,
    favoriteCount: Number(room.favorite_count) || 0,
  };
}

/** Map a featured (top-rated) room to the HostListing card shape. */
export function mapFeaturedToListing(room: HostFeaturedRoom): HostListing {
  let status: HostListingStatus;
  if (room.status === 'HIDDEN') status = 'hidden';
  else if (room.approval_status === 'PENDING') status = 'pending';
  else if (room.status === 'RENTED' || room.status === 'LOCKED') status = 'rented';
  else status = 'active';
  const meta = listingStatusMeta[status];

  return {
    id: room.room_id,
    title: room.title,
    address: room.detailed_address,
    price: formatExactPrice(Number(room.monthly_rent)),
    priceUnit: '/tháng',
    status,
    statusLabel: meta.statusLabel,
    visibilityLabel: meta.visibilityLabel,
    isVisible: meta.isVisible,
    imageSrc: room.cover_image_url || FALLBACK_IMAGE,
    imageAlt: room.title,
    rating: Number(room.average_rating) || 0,
    favoriteCount: Number(room.favorite_count) || 0,
  };
}

/** Map a backend host room to the DashboardRoom UI shape. */
export function mapToDashboardRoom(room: HostRoom): DashboardRoom {
  let status: DashboardRoomStatus;
  let statusLabel: string;
  if (room.status === 'HIDDEN') {
    status = 'hidden';
    statusLabel = 'Đã ẩn';
  } else if (room.approval_status === 'PENDING') {
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

  /** Fetch public reviews for a room (used on the host listing detail page). */
  getRoomReviews: async (
    roomId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<ApiResponse<RoomReviewsResponse>> => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get<ApiResponse<RoomReviewsResponse>>(`/rooms/${roomId}/reviews${qs}`);
  },

  /** Fetch landlord dashboard overview (counts, avg rating, revenue, top rooms). */
  getOverview: async (year?: number): Promise<ApiResponse<HostOverview>> => {
    const qs = year ? `?year=${year}` : '';
    return apiClient.get<ApiResponse<HostOverview>>(`/host/rooms/overview${qs}`);
  },

  /**
   * Toggle a room's public visibility (Hiển thị / Tạm ẩn).
   * visible=false hides an AVAILABLE room; visible=true shows a HIDDEN one.
   */
  setVisibility: async (
    roomId: string,
    visible: boolean,
  ): Promise<ApiResponse<{ room_id: string; status: string }>> => {
    return apiClient.patch<ApiResponse<{ room_id: string; status: string }>>(
      `/host/rooms/${roomId}/status`,
      { visible },
    );
  },
};
