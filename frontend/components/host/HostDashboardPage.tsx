'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import HostSidebar from '@/components/host/HostSidebar';
import { hostRoomService, mapToDashboardRoom } from '@/services/hostRoomService';
import { hostBookingService, mapToPendingRequest } from '@/services/hostBookingService';
import {
  revenueData,
  formatVND,
  type DashboardRoom,
  type DashboardRoomStatus,
  type PendingRequest,
  type QuickStat,
} from '@/data/hostDashboard';

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Pill badge shown next to the pending-requests heading */
function NewBadge({ count }: { count: number }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold tracking-[0.6px]"
      style={{ background: '#FFDAD6', color: '#93000A' }}
    >
      {count} Mới
    </span>
  );
}

/** Single pending booking request row */
function PendingRequestRow({
  request,
  onApprove,
  onReject,
  disabled,
}: {
  request: PendingRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[rgba(195,198,215,0.3)] bg-[#FAF8FF] px-3 py-2">
      {/* Tenant info */}
      <div className="flex items-center gap-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold"
          style={{ background: request.avatarBg, color: request.avatarColor }}
        >
          {request.tenantInitial}
        </span>
        <div>
          <p className="text-sm font-bold leading-[21px] text-[#191B23]">
            {request.tenantName}
          </p>
          <p className="text-sm leading-[21px] text-[#434655]">
            {request.roomTitle}&nbsp;•&nbsp;Đặt cọc {formatVND(request.depositAmount)}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onApprove(request.id)}
          disabled={disabled}
          className="rounded-lg px-2 py-1 text-base leading-6 text-[#004AC6] transition hover:bg-[#EEF3FF] disabled:opacity-50"
        >
          Duyệt
        </button>
        <button
          type="button"
          onClick={() => onReject(request.id)}
          disabled={disabled}
          className="rounded-lg px-2 py-1 text-base leading-6 text-[#BA1A1A] transition hover:bg-[#FFDAD6] disabled:opacity-50"
        >
          Từ chối
        </button>
      </div>
    </div>
  );
}

/** Quick-stat card (rooms count / occupancy rate) */
function StatCard({ stat }: { stat: QuickStat }) {
  const icon =
    stat.iconType === 'rooms' ? (
      /* Key / door icon */
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 0 1 2 2m4 0a6 6 0 0 1-7.74 5.74L13 15H11v2H9v2H6a1 1 0 0 1-1-1v-2.59a1 1 0 0 1 .3-.71l5.15-5.15A6 6 0 0 1 21 9z" />
      </svg>
    ) : (
      /* Trend-up / occupancy icon */
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l4-8 4 4 4-6 4 4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 17H3" />
      </svg>
    );

  const iconColor = stat.iconType === 'rooms' ? '#006F66' : '#EEEFFF';

  return (
    <div className="flex items-center gap-4 rounded-xl border border-[#C3C6D7] bg-[#FAF8FF] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        style={{ background: stat.iconBg, color: iconColor }}
      >
        {icon}
      </span>
      <div>
        <p className="text-xs font-bold leading-3 tracking-[0.6px] text-[#434655]">
          {stat.label}
        </p>
        <p className="mt-2 text-2xl font-semibold leading-8 text-[#191B23]">
          {stat.value}
        </p>
      </div>
    </div>
  );
}

/** CSS bar chart for weekly revenue */
function RevenueChart() {
  const [hoveredWeek, setHoveredWeek] = useState<string | null>(null);
  const maxHeight = 158; // px — matches Figma chart area height

  const barOpacities: Record<string, number> = {
    'Tuần 1': 0.2,
    'Tuần 2': 0.3,
    'Tuần 3': 0.5,
    'Tuần 4': 0.8,
  };

  return (
    <div className="rounded-xl border border-[#C3C6D7] bg-[#FAF8FF] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      {/* Chart header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xl font-semibold leading-7 text-[#191B23]">
            Doanh thu tháng này
          </p>
          <p className="mt-1 text-2xl font-semibold leading-8 text-[#004AC6]">
            {formatVND(revenueData.totalRevenue)}
          </p>
        </div>

        {/* Month selector */}
        <div className="relative">
          <select
            aria-label="Chọn tháng"
            className="appearance-none rounded-lg border border-[#C3C6D7] bg-[#F3F3FE] py-2 pl-3 pr-8 text-sm text-[#191B23] focus:outline-none focus:ring-2 focus:ring-[#004AC6]/20"
          >
            <option>Tháng 4, 2026</option>
            <option>Tháng 3, 2026</option>
            <option>Tháng 2, 2026</option>
          </select>
          <svg
            className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Bar chart */}
      <div className="mt-4 flex gap-2 pl-10">
        {revenueData.weeks.map((w) => {
          const barH = Math.round(w.heightRatio * maxHeight);
          const opacity = barOpacities[w.week] ?? 0.4;
          const isHovered = hoveredWeek === w.week;

          return (
            <div
              key={w.week}
              className="relative flex flex-1 flex-col items-center"
              onMouseEnter={() => setHoveredWeek(w.week)}
              onMouseLeave={() => setHoveredWeek(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute -top-8 z-10 whitespace-nowrap rounded bg-[#2E3039] px-2 py-1 text-xs text-[#F0F0FB]">
                  {w.amount.toLocaleString('vi-VN')} ₫
                </div>
              )}

              {/* Bar */}
              <div
                className="w-full cursor-pointer rounded-t-sm transition-opacity"
                style={{
                  height: `${barH}px`,
                  background: `rgba(0, 74, 198, ${isHovered ? Math.min(opacity + 0.2, 1) : opacity})`,
                }}
              />

              {/* X-axis label */}
              <span className="mt-2 text-center text-[10px] leading-[15px] text-[#434655]">
                {w.week}
              </span>
            </div>
          );
        })}
      </div>

      {/* Y-axis labels (left side) — absolute positioned overlay */}
      {/* (kept simple with flex column for clarity) */}
    </div>
  );
}

/** Status badge config */
const statusConfig: Record<
  DashboardRoomStatus,
  { label: string; className: string }
> = {
  rented: {
    label: 'Đã cho thuê',
    className: 'bg-[#86F2E4] text-[#006F66] border-transparent',
  },
  available: {
    label: 'Đang trống',
    className: 'bg-[#FAF8FF] text-[#191B23] border border-[#C3C6D7]',
  },
  pending: {
    label: 'Chờ duyệt',
    className: 'bg-[#FFDAD6] text-[#93000A] border-transparent',
  },
};

/** Dashboard room card */
function DashboardRoomCard({ room }: { room: DashboardRoom }) {
  const badge = statusConfig[room.status];

  return (
    <article className="overflow-hidden rounded-xl border border-[#C3C6D7] bg-[#FAF8FF] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      {/* Room image */}
      <div className="relative aspect-[298/218] overflow-hidden bg-[#E1E2ED]">
        <img
          src={room.imageSrc}
          alt={room.imageAlt}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        {/* Status badge */}
        <span
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-bold tracking-[0.6px] ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-xl font-semibold leading-7 text-[#191B23]">
          {room.title}
        </h3>

        <p className="mt-1 flex items-center gap-1 text-sm leading-[21px] text-[#434655]">
          <svg className="h-3.5 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-4.6 7-11a7 7 0 1 0-14 0c0 6.4 7 11 7 11z" />
            <circle cx="12" cy="10" r="2" />
          </svg>
          {room.address}
        </p>

        <div className="mt-3 flex items-end justify-between">
          <div>
            {room.originalPrice && (
              <p className="text-sm leading-[21px] text-[#434655] line-through">
                {formatVND(room.originalPrice)}
              </p>
            )}
            <p className="text-xl font-semibold leading-7 text-[#004AC6]">
              {formatVND(room.currentPrice)}
              <span className="ml-1 text-sm font-normal leading-[21px] text-[#434655]">
                / tháng
              </span>
            </p>
          </div>

          {/* Edit button */}
          <Link
            href={`/host/listings/${room.id}/edit`}
            aria-label={`Chỉnh sửa ${room.title}`}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full transition hover:bg-[#E1E2ED]"
          >
            <svg className="h-[18px] w-[18px] text-[#434655]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.9 4.6l2.5 2.5M5 19l4.8-1 9.3-9.3a1.8 1.8 0 0 0-2.5-2.5l-9.3 9.3L5 19z" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HostDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [rooms, setRooms] = useState<DashboardRoom[]>([]);
  const [quickStats, setQuickStats] = useState<QuickStat[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Rooms + derived quick stats
        const roomRes = await hostRoomService.listMyRooms({ page: 1, limit: 100 });
        if (!cancelled) {
          const items = roomRes.data?.items || [];
          const total = roomRes.data?.pagination?.total ?? items.length;
          const rentedCount = items.filter((r) => r.status === 'RENTED').length;
          const occupancy = items.length > 0 ? Math.round((rentedCount / items.length) * 100) : 0;
          setRooms(items.slice(0, 6).map(mapToDashboardRoom));
          setQuickStats([
            { id: 'total-rooms', label: 'TỔNG SỐ PHÒNG', value: `${total} Phòng`, iconBg: '#86F2E4', iconType: 'rooms' },
            { id: 'occupancy-rate', label: 'TỶ LỆ LẤP ĐẦY', value: `${occupancy}%`, iconBg: '#2563EB', iconType: 'occupancy' },
          ]);
        }
      } catch (err) {
        if (!cancelled) {
          setRooms([]);
          setQuickStats([
            { id: 'total-rooms', label: 'TỔNG SỐ PHÒNG', value: '0 Phòng', iconBg: '#86F2E4', iconType: 'rooms' },
            { id: 'occupancy-rate', label: 'TỶ LỆ LẤP ĐẦY', value: '0%', iconBg: '#2563EB', iconType: 'occupancy' },
          ]);
        }
      }

      try {
        // Deposits awaiting host decision (tenant already paid → CONFIRMED)
        const depRes = await hostBookingService.listDeposits({ status: 'CONFIRMED', limit: 20 });
        if (!cancelled) {
          setRequests((depRes.data?.deposits || []).map(mapToPendingRequest));
        }
      } catch {
        if (!cancelled) setRequests([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDecision = async (id: string, decision: 'ACCEPTED' | 'REJECTED') => {
    setProcessingId(id);
    try {
      const reason = decision === 'REJECTED' ? 'Chủ nhà từ chối đơn đặt cọc' : undefined;
      await hostBookingService.updateDepositDecision(id, decision, reason);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Xử lý yêu cầu thất bại. Vui lòng thử lại.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = (id: string) => handleDecision(id, 'ACCEPTED');
  const handleReject = (id: string) => handleDecision(id, 'REJECTED');

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <main className="flex min-h-screen bg-[#FFFFFF]">
      <HostSidebar user={user} onLogout={handleLogout} activePage="overview" />

      {/* Main content — offset by sidebar width */}
      <section className="flex-1 bg-[#FAF8FF] lg:ml-[272px]">
        <div className="mx-auto max-w-[1045px] px-12 pb-16 pt-12">

          {/* ── Header ──────────────────────────────────────────────── */}
          <header className="mb-8">
            <h1 className="text-[32px] font-bold leading-[38px] text-[#191B23]">
              Tổng quan kinh doanh
            </h1>
            <p className="mt-2 text-base leading-6 text-[#434655]">
              Theo dõi hiệu suất và quản lý danh sách phòng của bạn.
            </p>
          </header>

          {/* ── Pending Requests ─────────────────────────────────────── */}
          {requests.length > 0 && (
            <section
              aria-labelledby="pending-heading"
              className="relative mb-8 overflow-hidden rounded-xl border border-[rgba(195,198,215,0.5)] bg-[#F3F3FE] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
            >
              {/* Top gradient bar */}
              <div
                className="absolute inset-x-0 top-0 h-1 rounded-t-xl"
                style={{ background: 'linear-gradient(90deg, #006A61 0%, #004AC6 100%)' }}
              />

              {/* Section header */}
              <div className="mt-1 flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-[#006A61]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 0 0 6 0" />
                </svg>
                <h2
                  id="pending-heading"
                  className="text-xl font-semibold leading-7 text-[#191B23]"
                >
                  Yêu cầu cần duyệt
                </h2>
                <NewBadge count={requests.length} />
              </div>

              {/* Request list */}
              <div className="mt-3 flex flex-col gap-2">
                {requests.map((req) => (
                  <PendingRequestRow
                    key={req.id}
                    request={req}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    disabled={processingId === req.id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Stats & Revenue Chart ─────────────────────────────────── */}
          <section aria-label="Thống kê nhanh và doanh thu" className="mb-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
              {/* Quick stats (left) */}
              <div className="flex flex-col gap-6">
                {quickStats.map((stat) => (
                  <StatCard key={stat.id} stat={stat} />
                ))}
              </div>

              {/* Revenue chart (right) */}
              <RevenueChart />
            </div>
          </section>

          {/* ── Room List ─────────────────────────────────────────────── */}
          <section aria-labelledby="rooms-heading">
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="rooms-heading"
                className="text-2xl font-semibold leading-8 text-[#191B23]"
              >
                Danh sách phòng
              </h2>
              <a
                href="/host/listings"
                className="flex items-center gap-1 text-base font-semibold leading-4 text-[#004AC6] hover:underline"
              >
                Xem tất cả
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>

            {rooms.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rooms.map((room) => (
                  <DashboardRoomCard key={room.id} room={room} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-[#C3C6D7] bg-[#FAF8FF] px-6 py-12 text-center">
                <p className="text-base font-semibold text-[#191B23]">Bạn chưa có phòng nào.</p>
                <a href="/host/listings/new" className="mt-2 inline-block text-sm font-semibold text-[#004AC6] hover:underline">
                  Đăng phòng đầu tiên
                </a>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
