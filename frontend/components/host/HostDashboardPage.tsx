'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid,
  KeyRound,
  DoorOpen,
  Clock,
  EyeOff,
  Star,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import HostSidebar from '@/components/host/HostSidebar';
import BookingManageCard from '@/components/host/BookingManageCard';
import {
  hostRoomService,
  mapFeaturedToListing,
  getListingVisibilityMeta,
  type HostOverview,
} from '@/services/hostRoomService';
import { hostBookingService, mapToPendingRequest } from '@/services/hostBookingService';
import { formatVND, type PendingRequest } from '@/data/hostDashboard';
import type { HostListing } from '@/data/hostListings';

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
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
      <div className="flex items-center gap-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold"
          style={{ background: request.avatarBg, color: request.avatarColor }}
        >
          {request.tenantInitial}
        </span>
        <div>
          <p className="text-sm font-semibold leading-[21px] text-slate-900">{request.tenantName}</p>
          <p className="text-sm leading-[21px] text-slate-500">
            {request.roomTitle}&nbsp;•&nbsp;Đặt cọc {formatVND(request.depositAmount)}
          </p>
        </div>
      </div>

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

/** Admin-style KPI card. */
function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  loading,
}: {
  label: string;
  value: string | number;
  icon: typeof LayoutGrid;
  iconBg: string;
  iconColor: string;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon size={22} className={iconColor} />
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {loading ? (
          <div className="mt-1 h-8 w-16 animate-pulse rounded bg-slate-200" />
        ) : (
          <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
        )}
      </div>
    </div>
  );
}

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => `Th${i + 1}`);

/** Monthly revenue chart with year + month selectors (no weekly breakdown). */
function RevenueSection({
  overview,
  loading,
  year,
  selectedMonth,
  yearOptions,
  onYearChange,
  onMonthSelect,
}: {
  overview: HostOverview | null;
  loading: boolean;
  year: number;
  selectedMonth: number;
  yearOptions: number[];
  onYearChange: (year: number) => void;
  onMonthSelect: (month: number) => void;
}) {
  const monthly = overview?.revenue.monthly ?? [];
  const maxAmount = Math.max(1, ...monthly.map((m) => m.amount));
  const selectedAmount = monthly.find((m) => m.month === selectedMonth)?.amount ?? 0;
  const chartHeight = 160;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-lg font-bold text-slate-900">Doanh thu theo tháng</p>
          <p className="mt-1 text-sm text-slate-500">
            Tháng {selectedMonth}/{year}
          </p>
          <p className="mt-1 text-2xl font-bold text-booking-primary">{formatVND(selectedAmount)}</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Chọn tháng"
            value={selectedMonth}
            onChange={(e) => onMonthSelect(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-booking-primary/20"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </select>
          <select
            aria-label="Chọn năm"
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-booking-primary/20"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        Tổng cả năm {year}:{' '}
        <span className="font-semibold text-slate-900">{formatVND(overview?.revenue.totalRevenue ?? 0)}</span>
      </p>

      {/* 12-month bar chart */}
      <div className="mt-4 flex items-end gap-1.5" style={{ height: chartHeight }}>
        {(loading ? Array.from({ length: 12 }, (_, i) => ({ month: i + 1, amount: 0 })) : monthly).map((m) => {
          const barH = Math.max(4, Math.round((m.amount / maxAmount) * (chartHeight - 24)));
          const isSelected = m.month === selectedMonth;
          return (
            <button
              key={m.month}
              type="button"
              onClick={() => onMonthSelect(m.month)}
              title={`Tháng ${m.month}: ${formatVND(m.amount)}`}
              className="group flex flex-1 flex-col items-center justify-end gap-1"
            >
              <span
                className={`w-full rounded-t-sm transition-all ${
                  isSelected ? 'bg-booking-primary' : 'bg-booking-primary/25 group-hover:bg-booking-primary/40'
                } ${loading ? 'animate-pulse' : ''}`}
                style={{ height: `${barH}px` }}
              />
              <span className={`text-[10px] ${isSelected ? 'font-bold text-booking-primary' : 'text-slate-400'}`}>
                {MONTH_LABELS[m.month - 1]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const now = new Date();

export default function HostDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [overview, setOverview] = useState<HostOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [year, setYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const [featured, setFeatured] = useState<HostListing[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const yearOptions = useMemo(() => {
    const current = now.getFullYear();
    return [current, current - 1, current - 2];
  }, []);

  // Load overview (re-fetch when the selected year changes).
  useEffect(() => {
    let cancelled = false;
    setLoadingOverview(true);
    hostRoomService
      .getOverview(year)
      .then((res) => {
        if (cancelled || !res.data) return;
        setOverview(res.data);
        setFeatured(res.data.featuredRooms.map(mapFeaturedToListing));
      })
      .catch(() => {
        if (!cancelled) {
          setOverview(null);
          setFeatured([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOverview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year]);

  // Load pending requests once.
  useEffect(() => {
    let cancelled = false;
    hostBookingService
      .listDeposits({ status: 'CONFIRMED', limit: 20 })
      .then((depRes) => {
        if (!cancelled) setRequests((depRes.data?.deposits || []).map(mapToPendingRequest));
      })
      .catch(() => {
        if (!cancelled) setRequests([]);
      });
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

  const handleToggleVisibility = async (id: string, nextVisible: boolean) => {
    if (togglingId) return;
    const previous = featured;
    setTogglingId(id);
    setFeatured((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...getListingVisibilityMeta(nextVisible) } : l)),
    );
    try {
      await hostRoomService.setVisibility(id, nextVisible);
    } catch (err: any) {
      setFeatured(previous);
      alert(err?.message || 'Không thể cập nhật trạng thái hiển thị. Vui lòng thử lại.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const stats = overview?.stats;
  const avgRatingLabel = stats && stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—';

  return (
    <main className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <HostSidebar user={user} onLogout={handleLogout} activePage="overview" />

      <section className="flex-1 bg-slate-50 lg:ml-64">
        <div className="mx-auto max-w-[1100px] px-8 pb-16 pt-8">
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Tổng quan kinh doanh</h1>
            <p className="mt-1 text-sm text-slate-500">
              Theo dõi hiệu suất và quản lý danh sách phòng của bạn.
            </p>
          </header>

          {/* ── Pending Requests ─────────────────────────────────────── */}
          {requests.length > 0 && (
            <section
              aria-labelledby="pending-heading"
              className="relative mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div
                className="absolute inset-x-0 top-0 h-1 rounded-t-xl"
                style={{ background: 'linear-gradient(90deg, #006A61 0%, #004AC6 100%)' }}
              />
              <div className="mt-1 flex items-center gap-2">
                <svg className="h-5 w-5 text-[#006A61]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 0 0 6 0" />
                </svg>
                <h2 id="pending-heading" className="text-lg font-bold text-slate-900">
                  Yêu cầu cần duyệt
                </h2>
                <NewBadge count={requests.length} />
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {requests.map((req) => (
                  <PendingRequestRow
                    key={req.id}
                    request={req}
                    onApprove={(id) => handleDecision(id, 'ACCEPTED')}
                    onReject={(id) => handleDecision(id, 'REJECTED')}
                    disabled={processingId === req.id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── KPI Stats ─────────────────────────────────────────────── */}
          <section aria-label="Thống kê phòng" className="mb-8">
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Tổng số phòng" value={stats?.total ?? 0} icon={LayoutGrid} iconBg="bg-blue-100" iconColor="text-blue-600" loading={loadingOverview} />
              <StatCard label="Đã cho thuê" value={stats?.rented ?? 0} icon={KeyRound} iconBg="bg-emerald-100" iconColor="text-emerald-600" loading={loadingOverview} />
              <StatCard label="Đang trống" value={stats?.available ?? 0} icon={DoorOpen} iconBg="bg-teal-100" iconColor="text-teal-600" loading={loadingOverview} />
              <StatCard label="Chờ duyệt" value={stats?.pending ?? 0} icon={Clock} iconBg="bg-orange-100" iconColor="text-orange-600" loading={loadingOverview} />
              <StatCard label="Đang ẩn" value={stats?.hidden ?? 0} icon={EyeOff} iconBg="bg-slate-200" iconColor="text-slate-600" loading={loadingOverview} />
              <StatCard label="Đánh giá TB" value={avgRatingLabel} icon={Star} iconBg="bg-amber-100" iconColor="text-amber-500" loading={loadingOverview} />
            </div>
          </section>

          {/* ── Monthly Revenue ───────────────────────────────────────── */}
          <section aria-label="Doanh thu theo tháng" className="mb-8">
            <RevenueSection
              overview={overview}
              loading={loadingOverview}
              year={year}
              selectedMonth={selectedMonth}
              yearOptions={yearOptions}
              onYearChange={setYear}
              onMonthSelect={setSelectedMonth}
            />
          </section>

          {/* ── Featured Rooms (top 3 by rating) ──────────────────────── */}
          <section aria-labelledby="featured-heading">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="featured-heading" className="text-lg font-bold text-slate-900">
                Phòng nổi bật
              </h2>
              <a href="/host/listings" className="flex items-center gap-1 text-sm font-semibold text-booking-primary hover:underline">
                Xem tất cả
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>

            {loadingOverview ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
                ))}
              </div>
            ) : featured.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((listing) => (
                  <BookingManageCard
                    key={listing.id}
                    listing={listing}
                    onToggleVisibility={handleToggleVisibility}
                    toggling={togglingId === listing.id}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                <p className="text-base font-semibold text-slate-900">Bạn chưa có phòng nào.</p>
                <a href="/host/listings/new" className="mt-2 inline-block text-sm font-semibold text-booking-primary hover:underline">
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
