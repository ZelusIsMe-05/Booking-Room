'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileCheck, 
  Users, 
  CreditCard, 
  AlertTriangle, 
  MessageSquare,
  Settings,
  LogOut,
  Hexagon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { name: 'Tổng quan', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Duyệt bài đăng', href: '/admin/listings', icon: FileCheck },
  { name: 'Quản lý người dùng', href: '/admin/users', icon: Users },
  { name: 'Giao dịch', href: '/admin/transactions', icon: CreditCard },
  { name: 'Khiếu nại', href: '/admin/complaints', icon: AlertTriangle },
  { name: 'Hỗ trợ', href: '/admin/support', icon: MessageSquare },
];

const bottomNavItems = [
  { name: 'Cài đặt', href: '/admin/settings', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shadow-sm z-10">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Hexagon className="text-booking-primary fill-booking-primary" size={28} />
          <div>
            <h1 className="font-bold text-booking-primary leading-tight text-lg">DPVinhIT</h1>
            <p className="text-xs text-slate-500">Hệ thống Booking-Room</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive
                  ? 'bg-booking-teal/20 text-booking-teal font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-booking-teal' : 'text-slate-500'} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="p-4 border-t border-slate-200 space-y-1">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive
                  ? 'bg-slate-200 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
              }`}
            >
              <Icon size={20} className="text-slate-500" />
              <span>{item.name}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-slate-600 hover:bg-red-50 hover:text-red-600 font-medium"
        >
          <LogOut size={20} className="text-slate-500 hover:text-red-600" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
