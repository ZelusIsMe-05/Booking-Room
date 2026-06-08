import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tìm phòng trọ, căn hộ dịch vụ',
  description: 'Tìm kiếm phòng trọ, căn hộ dịch vụ xác thực, giá rẻ và đầy đủ tiện nghi.',
};

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
