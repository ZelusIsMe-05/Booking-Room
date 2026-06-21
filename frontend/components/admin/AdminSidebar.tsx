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
  LogOut
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
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shadow-sm z-10">
      {/* Logo Area */}
      <div className="h-[90px] px-6 border-b border-slate-200 flex items-center">
        <div className="flex items-center gap-3.5 w-full max-w-[14rem]">
          <img src="/booking_logo.png" alt="Booking System Logo" className="w-11 h-11 object-cover rounded-[14px] shadow-sm border border-slate-100" />
          <div className="overflow-hidden flex-1">
            <h1 className="font-bold text-booking-primary leading-tight text-[1.1rem] truncate" title={user?.fullName || 'Hệ thống'}>
              {user?.fullName || 'Hệ thống'}
            </h1>
            <p className="text-[13px] text-slate-500 truncate mt-0.5">Booking-Room Admin</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${isActive
                  ? 'bg-gradient-to-r from-booking-teal/20 to-booking-teal/5 text-booking-teal font-semibold shadow-sm border border-booking-teal/10'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-booking-primary font-medium border border-transparent'
                }`}
            >
              <Icon
                size={20}
                className={`transition-transform duration-300 flex-shrink-0 group-hover:scale-110 ${isActive ? 'text-booking-teal drop-shadow-sm' : 'text-slate-400 group-hover:text-booking-primary'}`}
              />
              <span className="whitespace-nowrap">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="p-4 border-t border-slate-200/60 space-y-1.5 bg-slate-50/30">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${isActive
                  ? 'bg-slate-200/80 text-slate-900 font-semibold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-medium'
                }`}
            >
              <Icon size={20} className="text-slate-500 flex-shrink-0 transition-transform duration-300 group-hover:rotate-45" />
              <span className="whitespace-nowrap">{item.name}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="w-full group flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-300 font-medium border border-transparent hover:border-red-100"
        >
          <LogOut size={20} className="text-red-500 flex-shrink-0 transition-transform duration-300 group-hover:-translate-x-1" />
          <span className="whitespace-nowrap">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
