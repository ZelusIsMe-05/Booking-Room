import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Booking-Room',
    template: '%s | Booking-Room',
  },
  description: 'Hệ thống quản lý và đặt phòng trực tuyến uy tín, tiện lợi.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
