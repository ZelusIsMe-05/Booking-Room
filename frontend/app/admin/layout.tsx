import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trang quản trị',
  description: 'Hệ thống quản lý Admin dành cho dự án Booking-Room.',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
