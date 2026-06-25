import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // 1. Import font Inter từ Google
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { AuthProvider } from '@/context/AuthContext';

// 2. Cấu hình font (hỗ trợ tiếng Việt để không bị lỗi dấu)
const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Booking-Room',
    template: '%s | Booking-Room',
  },
  description: 'Hệ thống quản lý và đặt phòng trực tuyến uy tín, tiện lợi.',
};

import ToastContainer from '@/components/common/ToastContainer';
import LoginPromptModal from '@/components/common/LoginPromptModal';
import { TenantChatProvider } from '@/context/TenantChatContext';
import TenantChatContainer from '@/components/booking/TenantChatContainer';
import { SocketProvider } from '@/context/SocketContext';
import { LanguageProvider } from '@/context/LanguageContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      {/* 3. Áp dụng font vào thẻ body */}
      <body suppressHydrationWarning className={inter.className}>
        <LanguageProvider>
          <AuthProvider>
            <SocketProvider>
              <TenantChatProvider>
                {children}
                <TenantChatContainer />
              </TenantChatProvider>
            </SocketProvider>
            <ToastContainer />
            <LoginPromptModal />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}