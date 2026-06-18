import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: {
    default: 'Booking-Room',
    template: '%s | Booking-Room',
  },
  description: 'Hệ thống quản lý và đặt phòng trực tuyến uy tín, tiện lợi.',
};

import ToastContainer from '@/components/common/ToastContainer';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>
          {children}
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
