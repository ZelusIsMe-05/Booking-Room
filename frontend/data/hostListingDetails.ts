import { hostListings } from '@/data/hostListings';

export interface ListingMetric {
  label: string;
  value: string;
  note: string;
}

export interface ListingAmenity {
  label: string;
  icon: 'snow' | 'wifi' | 'kitchen' | 'washer' | 'shield' | 'parking';
}

export interface HostListingDetail {
  id: string;
  listingCode: string;
  title: string;
  statusLabel: string;
  address: string;
  price: string;
  area: string;
  roomType: string;
  maxOccupancy: string;
  images: Array<{ src: string; alt: string }>;
  metrics: ListingMetric[];
  description: string[];
  amenities: ListingAmenity[];
}

export const defaultHostListingDetail: HostListingDetail = {
  id: 'studio-q2',
  listingCode: 'AT-20349',
  title: 'Phòng Studio Hiện Đại Thoáng Mát Quận 3',
  statusLabel: 'Active',
  address: '123 Võ Văn Tần, Phường 6, Quận 3, TP.HCM',
  price: '4.500.000đ',
  area: '35 m²',
  roomType: 'Studio',
  maxOccupancy: '02 Guests',
  images: [
    {
      src: '/images/booking/host/one-bedroom-apartment.png',
      alt: 'Phòng studio hiện đại với ban công và sàn gỗ',
    },
    {
      src: '/images/booking/host/studio-apartment.png',
      alt: 'Khu bếp căn hộ studio',
    },
    {
      src: '/images/booking/host/loft-apartment.png',
      alt: 'Góc phòng ngủ căn hộ',
    },
  ],
  metrics: [
    { label: 'Giá thuê hàng tháng', value: '4.500.000đ', note: 'Last updated: 2 days ago' },
    { label: 'Area Size', value: '35 m²', note: 'Floor: 5th (Elevator)' },
    { label: 'Room Type', value: 'Studio', note: 'Full Furniture' },
    { label: 'Max Occupancy', value: '02 Guests', note: 'Pets not allowed' },
  ],
  description: [
    'Phòng Studio tại trung tâm Quận 3 với thiết kế hiện đại, tối ưu hóa không gian sống. Căn hộ có ban công rộng rãi, đón ánh sáng tự nhiên và gió trời, mang lại cảm giác thư thái tuyệt đối.',
    'Vị trí đắc địa, chỉ mất 5 phút di chuyển sang Quận 1. Khu vực an ninh, yên tĩnh, gần chợ, siêu thị và các trung tâm thương mại lớn. Phù hợp cho nhân viên văn phòng, người nước ngoài hoặc cặp đôi trẻ.',
  ],
  amenities: [
    { label: 'Air Conditioning', icon: 'snow' },
    { label: 'High-speed Wifi', icon: 'wifi' },
    { label: 'Private Kitchen', icon: 'kitchen' },
    { label: 'Washing Machine', icon: 'washer' },
    { label: '24/7 Security', icon: 'shield' },
    { label: 'Free Parking', icon: 'parking' },
  ],
};

export function getHostListingDetail(id: string): HostListingDetail {
  const listing = hostListings.find((item) => item.id === id);

  if (!listing) {
    return { ...defaultHostListingDetail, id };
  }

  return {
    ...defaultHostListingDetail,
    id: listing.id,
    title: listing.title,
    address: listing.address,
    images: [
      { src: listing.imageSrc, alt: listing.imageAlt },
      defaultHostListingDetail.images[1],
      defaultHostListingDetail.images[2],
    ],
  };
}
