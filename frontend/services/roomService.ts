import { apiClient } from './apiClient';
import { ApiResponse } from '@/types/api';
import { BookingRoom } from '@/data/bookingRooms';

export interface BackendRoom {
  room_id: string;
  landlord_id: string;
  title: string;
  room_type: string;
  detailed_address: string;
  province_name?: string | null;
  district_name?: string | null;
  ward_name?: string | null;
  formatted_address?: string | null;
  place_id?: string | null;
  max_capacity: number;
  monthly_rent: number;
  deposit_amount: number;
  electricity_cost: number;
  water_cost: number;
  internet_cost: number;
  service_fee: number;
  status: string;
  approval_status: string;
  average_rating: number;
  created_at: string;
  updated_at: string;
  room_description: string;
  cover_image_url: string | null;
  /** Tọa độ địa lý — được tự động populate khi host đăng phòng qua geocoding */
  latitude: number | null;
  longitude: number | null;
  images: Array<{ image_url: string; sequence_number: number; is_cover: boolean }>;
  host: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    phone_number: string | null;
  };
}

export interface ListRoomsResponse {
  items: BackendRoom[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export function mapBackendRoomToBookingRoom(room: any, index?: number): BookingRoom {
  // Extract roomId
  const roomId = room.roomId || room.room_id || '';
  
  // Extract title
  const title = room.title || '';
  
  // Extract detailed address
  const detailedAddress = room.detailedAddress || room.addressSummary || room.detailed_address || '';
  const formattedAddress = room.formattedAddress || room.formatted_address || '';
  
  // Extract district from address
  const district = detailedAddress?.match(/(Quận \d+|Bình Thạnh|Gò Vấp|Thủ Đức|Tân Bình|Phú Nhuận|Quận [1-9]|Quận 1[0-2]|Tân Phú|Bình Tân)/i)?.[0] || 'Khác';
  
  // Extract price & deposit
  const price = Number(room.monthlyRent !== undefined ? room.monthlyRent : room.monthly_rent) || 0;
  const deposit = Number(room.depositAmount !== undefined ? room.depositAmount : room.deposit_amount) || 0;
  
  // Extract room type
  const roomType = room.roomType || room.room_type || 'Phòng trọ';
  
  // Extract average rating
  const averageRating = room.averageRating !== undefined ? room.averageRating : room.average_rating;
  
  // Extract created_at
  const createdAt = room.createdAt || room.created_at || new Date().toISOString();

  // Use cover_image_url if present, otherwise assign local mockup images (room-1.png, room-2.png, room-3.png, room-4.png) stably
  let imgIndex = 1;
  if (index !== undefined) {
    imgIndex = (index % 4) + 1;
  } else {
    // Generate a stable hash of the roomId string to get a consistent image index between 1 and 4
    let hash = 0;
    const idStr = String(roomId);
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    imgIndex = (Math.abs(hash) % 4) + 1;
  }
  // Map backend S3 image array to string array
  const backendImages = room.images || [];
  const galleryImages = backendImages.length > 0 
    ? backendImages.map((img: any) => img.image_url || img.imageUrl || img) 
    : undefined;

  // Find cover image from backend images list if coverImageUrl is missing
  const coverObj = backendImages.find((img: any) => img.isCover === true || img.is_cover === true || img.isCover === 'true');
  const detectedCover = coverObj ? (coverObj.imageUrl || coverObj.image_url) : (backendImages[0]?.imageUrl || backendImages[0]?.image_url || null);
  const s3CoverImage = room.cover_image_url || room.coverImageUrl || detectedCover;

  const mainImage = s3CoverImage ? s3CoverImage : `/images/booking/room-${imgIndex}.png`;

  return {
    id: String(roomId),
    title,
    location: formattedAddress || detailedAddress,
    district,
    price,
    priceLabel: new Intl.NumberFormat('vi-VN').format(price) + 'đ',
    image: mainImage,
    verified: true, // Seeded approved rooms are verified
    isNew: new Date().getTime() - new Date(createdAt).getTime() < 30 * 24 * 60 * 60 * 1000,
    type: roomType,
    area: `${(room.maxCapacity || room.max_capacity || 2) * 8 + 4} m²`,
    rating: averageRating || 4.8,
    reviews: 24, // Mock default review count
    amenities: room.amenities || [],
    description: room.roomDescription || room.room_description || '',
    images: galleryImages,
    electricityCost: Number(room.electricityCost !== undefined ? room.electricityCost : room.electricity_cost) || 0,
    waterCost: Number(room.waterCost !== undefined ? room.waterCost : room.water_cost) || 0,
    internetCost: Number(room.internetCost !== undefined ? room.internetCost : room.internet_cost) || 0,
    serviceFee: Number(room.serviceFee !== undefined ? room.serviceFee : room.service_fee) || 0,
    deposit: Number(room.depositAmount !== undefined ? room.depositAmount : room.deposit_amount) || 0,
    // Tọa độ địa lý cho bản đồ
    latitude: room.latitude ?? null,
    longitude: room.longitude ?? null,
    host: room.host ? {
      userId: room.host.userId || room.host.user_id || room.host.landlordId || null,
      fullName: room.host.fullName || room.host.full_name || 'Nguyễn Văn A',
      avatarUrl: room.host.avatarUrl || room.host.avatar_url || null,
      email: room.host.email,
      phoneNumber: room.host.phoneNumber || room.host.phone_number,
      createdAt: room.host.createdAt || room.host.created_at || null,
    } : undefined
  } as any;
}

export const roomService = {
  listRooms: async (params: {
    page?: number;
    limit?: number;
    sort?: string;
    keyword?: string;
    location?: string;
    roomType?: string;
    minPrice?: number;
    maxPrice?: number;
    /** Tìm phòng gần tọa độ này */
    nearLat?: number;
    nearLng?: number;
    /** Bán kính tìm kiếm (km), mặc định 5km */
    radiusKm?: number;
  }): Promise<ApiResponse<ListRoomsResponse>> => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.sort) query.append('sort', String(params.sort));
    if (params.keyword) query.append('keyword', params.keyword);
    if (params.location) query.append('location', params.location);
    if (params.roomType) query.append('roomType', params.roomType);
    if (params.minPrice !== undefined) query.append('minPrice', String(params.minPrice));
    if (params.maxPrice !== undefined) query.append('maxPrice', String(params.maxPrice));
    if (params.nearLat !== undefined) query.append('nearLat', String(params.nearLat));
    if (params.nearLng !== undefined) query.append('nearLng', String(params.nearLng));
    if (params.radiusKm !== undefined) query.append('radiusKm', String(params.radiusKm));

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get<ApiResponse<ListRoomsResponse>>(`/rooms${queryString}`);
  },

  getRoomById: async (id: string): Promise<ApiResponse<BackendRoom>> => {
    return apiClient.get<ApiResponse<BackendRoom>>(`/rooms/${id}`);
  },
};
