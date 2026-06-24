export type BookingRoom = {
  id: string;
  title: string;
  location: string;
  district: string;
  price: number;
  priceLabel: string;
  image: string;
  verified: boolean;
  isNew?: boolean;
  type: string;
  area: string;
  rating: number;
  reviews: number;
  amenities: string[];
  description: string;
  images?: string[];
  status?: string;
  rentedBy?: string | null;
};

export const bookingRooms: BookingRoom[] = [];

export function formatRoomPrice(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value) + 'đ';
}
