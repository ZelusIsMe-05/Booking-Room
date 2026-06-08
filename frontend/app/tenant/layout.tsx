import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kênh khách thuê',
  description: 'Quản lý thông tin thuê phòng, hợp đồng và lịch sử thanh toán.',
};

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F4F5F7]/30">
      {/* 
        Sau này bạn có thể đặt Sidebar cố định hoặc Header riêng của Tenant ở đây.
        Ví dụ:
        <TenantNavbar />
        <div className="flex">
          <TenantSidebar />
          <main className="flex-1">{children}</main>
        </div>
      */}
      {children}
    </div>
  );
}
