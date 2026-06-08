import GuestPage from './guest/page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tìm Phòng Ưng Ý, Định Cư Lâu Dài',
  description: 'Hàng ngàn phòng trọ, căn hộ dịch vụ và chỗ ở ghép xác thực, đầy đủ tiện nghi.',
};

export default function HomePage() {
  return <GuestPage />;
}
