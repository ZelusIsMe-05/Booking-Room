'use client';

import Link from 'next/link';
import type { User } from '@/types/user';

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
  icon: (active: boolean) => React.ReactNode;
}

const navItems: NavItem[] = [
  {
    key: 'overview',
    label: 'Tổng quan',
    href: '/host',
    icon: (active) => (
      <svg
        className="h-[18px] w-[18px]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
        style={{ color: active ? '#006F66' : '#434655' }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
      </svg>
    ),
  },
  {
    key: 'listings',
    label: 'Tin đăng',
    href: '/host/listings',
    icon: (active) => (
      <svg
        className="h-[18px] w-[22px]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
        style={{ color: active ? '#006F66' : '#434655' }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 11h18M5 11V8a2 2 0 0 1 2-2h3v5m9 0V8a2 2 0 0 0-2-2h-3v5M5 11v6m14-6v6M4 17h16" />
      </svg>
    ),
  },
  {
    key: 'transactions',
    label: 'Giao dịch',
    href: '/host/transactions',
    icon: (active) => (
      <svg
        className="h-5 w-[18px]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
        style={{ color: active ? '#006F66' : '#434655' }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h10M7 17h6M5 3h14a1 1 0 0 1 1 1v16l-3-2-3 2-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1z" />
      </svg>
    ),
  },
  {
    key: 'revenue',
    label: 'Doanh thu',
    href: '/host/revenue',
    icon: (active) => (
      <svg
        className="h-[18px] w-[22px]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
        style={{ color: active ? '#006F66' : '#434655' }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M7 16V9m5 7V5m5 11v-4" />
      </svg>
    ),
  },
  {
    key: 'messages',
    label: 'Tin nhắn',
    href: '/host/messages',
    icon: (active) => (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
        style={{ color: active ? '#006F66' : '#434655' }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6.5A8 8 0 1 1 21 12z" />
      </svg>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function HostSidebar({
  user,
  onLogout,
  activePage = 'overview',
}: HostSidebarProps) {
  const displayName = user?.fullName || 'DPVinhIT';
  const avatarSrc = user?.avatarUrl || '/images/booking/host/host-avatar.jpg';

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-[#C3C6D7] bg-[#F3F3FE] px-4 py-4 lg:fixed lg:inset-y-0 lg:left-4 lg:flex lg:flex-col">
      {/* Profile */}
      <div className="flex items-center gap-4 pb-6">
        <img
          src={avatarSrc}
          alt={displayName}
          className="h-12 w-12 rounded-full border border-[#C3C6D7] object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold leading-7 text-[#006A61]">
            {displayName}
          </p>
          <p className="truncate text-xs font-bold leading-3 tracking-[0.6px] text-[#434655]">
            Tài khoản đã xác thực
          </p>
        </div>
      </div>

      {/* Add room CTA */}
      <Link
        href="/host/listings/new"
        className="mb-4 flex h-8 w-full items-center justify-center gap-2 rounded-lg bg-[#004AC6] px-4 text-base font-semibold text-white transition hover:bg-[#003fa3]"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
        <span>Thêm phòng mới</span>
      </Link>

      {/* Main navigation */}
      <nav aria-label="Điều hướng chính" className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const isActive = activePage === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex h-10 w-full items-center gap-4 rounded-lg px-2 text-left transition ${
                isActive
                  ? 'bg-[#86F2E4]'
                  : 'hover:bg-white/70'
              }`}
            >
              <span className="flex w-6 shrink-0 items-center justify-center">
                {item.icon(isActive)}
              </span>
              <span
                className={`truncate font-bold ${
                  isActive
                    ? 'text-base leading-6 text-[#006F66]'
                    : 'text-xs tracking-[0.6px] text-[#434655]'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-[#C3C6D7] pt-4">
        <Link
          href="/host/settings"
          className="flex h-9 w-full items-center gap-4 rounded-lg px-2 text-xs font-bold tracking-[0.6px] text-[#434655] transition hover:bg-white/70"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.3 4.3a1.8 1.8 0 0 1 3.4 0 1.8 1.8 0 0 0 2.7 1.1 1.8 1.8 0 0 1 2.4 2.4 1.8 1.8 0 0 0 1.1 2.7 1.8 1.8 0 0 1 0 3.4 1.8 1.8 0 0 0-1.1 2.7 1.8 1.8 0 0 1-2.4 2.4 1.8 1.8 0 0 0-2.7 1.1 1.8 1.8 0 0 1-3.4 0 1.8 1.8 0 0 0-2.7-1.1 1.8 1.8 0 0 1-2.4-2.4 1.8 1.8 0 0 0-1.1-2.7 1.8 1.8 0 0 1 0-3.4 1.8 1.8 0 0 0 1.1-2.7 1.8 1.8 0 0 1 2.4-2.4 1.8 1.8 0 0 0 2.7-1.1z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
          </svg>
          <span>Cài đặt</span>
        </Link>

        <button
          type="button"
          onClick={onLogout}
          className="flex h-9 w-full items-center gap-4 rounded-lg px-2 text-xs font-bold tracking-[0.6px] text-[#434655] transition hover:bg-white/70"
        >
          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17l5-5-5-5M20 12H9M12 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h7" />
          </svg>
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
