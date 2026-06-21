import type { Metadata } from 'next';
import AdminSidebar from '@/components/admin/AdminSidebar';

export const metadata: Metadata = {
  title: 'Trang quản trị',
  description: 'Hệ thống quản lý Admin dành cho dự án Booking-Room.',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden relative">
      {/* Global Top Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-booking-primary via-booking-teal to-emerald-400 opacity-80 z-50"></div>

      <AdminSidebar />
      <main className="flex-1 flex flex-col overflow-y-auto relative z-10">
        {/* We can place AdminHeader here if needed, or let each page handle its top section */}
        {children}
      </main>
    </div>
  );
}
