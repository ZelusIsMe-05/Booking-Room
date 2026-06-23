'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  TrendingUp,
  MessageSquare,
  Plus,
  Settings,
  LogOut,
  User as UserIcon,
  KeyRound,
  LifeBuoy,
  AlertTriangle,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import type { User } from '@/types/user';
import UserProfileModal from '@/components/common/UserProfileModal';
import ChangePasswordModal from '@/components/common/ChangePasswordModal';
import SupportTicketModal from '@/components/common/SupportTicketModal';
import ViolationReportModal from '@/components/common/ViolationReportModal';

// ─── Types ────────────────────────────────────────────────────────────────────

export type HostActivePage =
  | 'overview'
  | 'listings'
  | 'transactions'
  | 'revenue'
  | 'messages';

interface HostSidebarProps {
  user: User | null;
  onLogout: () => void;
  activePage?: HostActivePage;
}

// ─── Nav items config ─────────────────────────────────────────────────────────

interface NavItem {
  key: HostActivePage;
  label: string;
  href: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { key: 'overview', label: 'Tổng quan', href: '/host', icon: LayoutDashboard },
  { key: 'listings', label: 'Tin đăng', href: '/host/listings', icon: FileText },
  { key: 'transactions', label: 'Giao dịch', href: '/host/transactions', icon: CreditCard },
  { key: 'revenue', label: 'Doanh thu', href: '/host/revenue', icon: TrendingUp },
  { key: 'messages', label: 'Tin nhắn', href: '/host/messages', icon: MessageSquare },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function HostSidebar({
  user,
  onLogout,
  activePage = 'overview',
}: HostSidebarProps) {
  const displayName = user?.fullName || 'DPVinhIT';
  const avatarSrc = user?.avatarUrl || '/images/booking/host/host-avatar.jpg';

  // ── Avatar dropdown + account modals ───────────────────────────────────────
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isViolationOpen, setIsViolationOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside of it.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { label: 'Xem hồ sơ cá nhân', icon: UserIcon, onClick: () => setIsProfileOpen(true) },
    { label: 'Đổi mật khẩu', icon: KeyRound, onClick: () => setIsChangePasswordOpen(true) },
    { label: 'Đơn hỗ trợ', icon: LifeBuoy, onClick: () => setIsSupportOpen(true) },
    { label: 'Đơn khiếu nại', icon: AlertTriangle, onClick: () => setIsViolationOpen(true) },
  ];

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm lg:fixed lg:inset-y-0 lg:left-0 lg:z-10 lg:flex">
      {/* Profile area (click avatar to open the account menu) */}
      <div className="relative border-b border-slate-200" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          className="flex h-16 w-full items-center gap-3 px-6 text-left transition-colors hover:bg-slate-50 focus:outline-none"
        >
          <img
            src={avatarSrc}
            alt={displayName}
            className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold leading-tight text-booking-primary">
              {displayName}
            </p>
            <p className="truncate text-xs text-slate-500">Tài khoản đã xác thực</p>
          </div>
          <ChevronDown
            size={16}
            className={`shrink-0 text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown menu */}
        {isMenuOpen && (
          <div className="absolute left-4 right-4 top-[60px] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="border-b border-slate-100 px-4 py-2.5">
              <p className="truncate text-sm font-bold text-slate-900">{displayName}</p>
              {user?.email && <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>}
            </div>
            <div className="py-1">
              {menuItems.map(({ label, icon: Icon, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onClick();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <Icon size={16} className="text-slate-500" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add room CTA */}
      <div className="px-4 pt-6">
        <Link
          href="/host/listings/new"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-booking-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-booking-primaryDark"
        >
          <Plus size={18} />
          <span>Thêm phòng mới</span>
        </Link>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
        {navItems.map((item) => {
          const isActive = activePage === item.key;
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                isActive
                  ? 'bg-booking-teal/20 font-semibold text-booking-teal'
                  : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-booking-teal' : 'text-slate-500'} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom navigation */}
      <div className="space-y-1 border-t border-slate-200 p-4">
        <Link
          href="/host/settings"
          className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <Settings size={20} className="text-slate-500" />
          <span>Cài đặt</span>
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={20} className="text-slate-500" />
          <span>Đăng xuất</span>
        </button>
      </div>

      {/* Account modals (shared with the tenant area) */}
      <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
      <SupportTicketModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
      <ViolationReportModal isOpen={isViolationOpen} onClose={() => setIsViolationOpen(false)} />
    </aside>
  );
}
