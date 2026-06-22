import type { Metadata } from 'next';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: {
    default: 'Booking-Room',
    template: '%s | Booking-Room',
  },
  description: 'Hệ thống quản lý và đặt phòng trực tuyến uy tín, tiện lợi.',
};

import ToastContainer from '@/components/common/ToastContainer';
import { TenantChatProvider } from '@/context/TenantChatContext';
import TenantChatContainer from '@/components/booking/TenantChatContainer';
import { SocketProvider } from '@/context/SocketContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <SocketProvider>
            <TenantChatProvider>
              {children}
              <TenantChatContainer />
            </TenantChatProvider>
          </SocketProvider>
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
