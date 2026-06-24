export type HostListingStatus = 'active' | 'rented' | 'pending' | 'hidden';

export interface HostListing {
  id: string;
  title: string;
  address: string;
  price: string;
  priceUnit: string;
  status: HostListingStatus;
  statusLabel: string;
  visibilityLabel: string;
  isVisible: boolean;
  imageSrc: string;
  imageAlt: string;
  /** Average rating (0–5). Shown on dashboard "featured" cards. */
  rating?: number;
  /** Number of tenants who favourited this room. Shown on featured cards. */
  favoriteCount?: number;
}

export interface HostListingFilter {
  key: 'all' | HostListingStatus;
  label: string;
  count: number;
}

export const hostListingFilters: HostListingFilter[] = [
  { key: 'all', label: 'Tất cả', count: 12 },
  { key: 'active', label: 'Đang hoạt động', count: 8 },
  { key: 'rented', label: 'Đã cho thuê', count: 3 },
  { key: 'pending', label: 'Chờ duyệt', count: 1 },
];

export const hostListings: HostListing[] = [
  {
    id: 'studio-q2',
    title: 'Căn hộ Studio Q2 - view sông',
    address: '123 Lê Lợi, Phường Bến Nghé, Quận 1',
    price: '8.5 Tr',
    priceUnit: '/tháng',
    status: 'active',
    statusLabel: 'Đang hoạt động',
    visibilityLabel: 'Hiển thị',
    isVisible: true,
    imageSrc: '/images/booking/host/studio-apartment.png',
    imageAlt: 'Phòng khách căn hộ studio sáng với cửa kính lớn',
  },
  {
    id: 'vinhomes-1pn',
    title: 'CH 1PN Vinhomes Central Park',
    address: '208 Nguyễn Hữu Cảnh, P.22, Bình Thạnh',
    price: '15 Tr',
    priceUnit: '/tháng',
    status: 'rented',
    statusLabel: 'Đã cho thuê',
    visibilityLabel: 'Tạm ẩn',
    isVisible: false,
    imageSrc: '/images/booking/host/one-bedroom-apartment.png',
    imageAlt: 'Phòng ngủ căn hộ một phòng ngủ với tông màu sáng',
  },
  {
    id: 'duplex-thao-dien',
    title: 'Duplex Thảo Điền Cao cấp',
    address: 'Khu biệt thự Thảo Điền, Quận 2',
    price: '22 Tr',
    priceUnit: '/tháng',
    status: 'pending',
    statusLabel: 'Chờ duyệt',
    visibilityLabel: 'Chờ duyệt',
    isVisible: false,
    imageSrc: '/images/booking/host/loft-apartment.png',
    imageAlt: 'Căn loft tường gạch với ghế đơn và cửa sổ lớn',
  },
];
