export interface RoomTypeOption {
  value: string;
  label: string;
}

export interface CityOption {
  value: string;
  label: string;
}

export interface AmenityOption {
  key: string;
  label: string;
}

export interface UploadedRoomImage {
  id: string;
  label: string;
  src?: string;
  alt?: string;
}

export const roomTypeOptions: RoomTypeOption[] = [
  { value: 'single-room', label: 'Phòng đơn (Room)' },
  { value: 'studio', label: 'Căn hộ Studio' },
  { value: 'one-bedroom', label: 'Căn hộ 1 phòng ngủ' },
  { value: 'shared-room', label: 'Phòng ở ghép' },
];

export const cityOptions: CityOption[] = [
  { value: 'ho-chi-minh', label: 'Hồ Chí Minh' },
  { value: 'ha-noi', label: 'Hà Nội' },
  { value: 'da-nang', label: 'Đà Nẵng' },
  { value: 'can-tho', label: 'Cần Thơ' },
];

export const amenityOptions: AmenityOption[] = [
  { key: 'air-conditioner', label: 'Điều hòa' },
  { key: 'fridge', label: 'Tủ lạnh' },
  { key: 'washing-machine', label: 'Máy giặt' },
  { key: 'parking', label: 'Bãi đậu xe' },
  { key: 'elevator', label: 'Thang máy' },
  { key: 'free-hours', label: 'Giờ tự do' },
  { key: 'pets', label: 'Thú cưng' },
  { key: 'other', label: 'Khác' },
];

export const uploadedRoomImages: UploadedRoomImage[] = [
  {
    id: 'overview',
    label: 'OVERVIEW',
    src: '/images/booking/host/one-bedroom-apartment.png',
    alt: 'Không gian phòng ngủ sáng với cửa sổ lớn',
  },
  {
    id: 'kitchen',
    label: 'KITCHEN',
    src: '/images/booking/host/studio-apartment.png',
    alt: 'Không gian bếp và phòng khách căn hộ studio',
  },
  {
    id: 'bathroom',
    label: 'BATHROOM',
  },
  {
    id: 'add-more',
    label: 'ADD MORE',
  },
];

export const MIN_REQUIRED_IMAGES = 3;
export const MAX_ROOM_IMAGES = 5;
