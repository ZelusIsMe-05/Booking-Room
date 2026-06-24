'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import BookingManageCard from '@/components/host/BookingManageCard';
import HostSidebar from '@/components/host/HostSidebar';
import { hostRoomService, mapToHostListing } from '@/services/hostRoomService';
import { getListingVisibilityMeta } from '@/services/hostRoomService';
import type { HostListing, HostListingStatus } from '@/data/hostListings';

type ActiveFilter = 'all' | HostListingStatus;

const PAGE_SIZE = 6;

const FILTER_LABELS: Array<{ key: ActiveFilter; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang hoạt động' },
  { key: 'rented', label: 'Đã cho thuê' },
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'hidden', label: 'Đã ẩn' },
];

export default function HostListingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const [listings, setListings] = useState<HostListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await hostRoomService.listMyRooms({ page: 1, limit: 100 });
        if (cancelled) return;
        setListings((res.data?.items || []).map(mapToHostListing));
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Không tải được danh sách tin đăng.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filters = useMemo(
    () =>
      FILTER_LABELS.map((f) => ({
        ...f,
        count: f.key === 'all' ? listings.length : listings.filter((l) => l.status === f.key).length,
      })),
    [listings],
  );

  const filteredListings = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('vi-VN');
    return listings.filter((listing) => {
      const matchesStatus = activeFilter === 'all' || listing.status === activeFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        listing.title.toLocaleLowerCase('vi-VN').includes(normalizedSearch) ||
        listing.address.toLocaleLowerCase('vi-VN').includes(normalizedSearch);
      return matchesStatus && matchesSearch;
    });
  }, [activeFilter, searchTerm, listings]);

  const totalPages = Math.max(1, Math.ceil(filteredListings.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedListings = filteredListings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset to first page whenever filters/search change.
  useEffect(() => {
    setPage(1);
  }, [activeFilter, searchTerm]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const handleToggleVisibility = async (id: string, nextVisible: boolean) => {
    if (togglingId) return;
    const previous = listings;
    // Optimistic update.
    setTogglingId(id);
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...getListingVisibilityMeta(nextVisible) } : l)),
    );
    try {
      await hostRoomService.setVisibility(id, nextVisible);
    } catch (err: any) {
      // Revert on failure.
      setListings(previous);
      alert(err?.message || 'Không thể cập nhật trạng thái hiển thị. Vui lòng thử lại.');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <HostSidebar user={user} onLogout={handleLogout} activePage="listings" />

      <section className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-booking-border/30 bg-booking-surface px-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)] sm:px-6 lg:justify-end lg:px-12">
          <div className="flex min-w-0 items-center gap-3 lg:hidden">
            <img
              src={user?.avatarUrl || '/images/booking/host/host-avatar.jpg'}
              alt={user?.fullName || 'DPVinhIT'}
              className="h-9 w-9 rounded-full border border-booking-border object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-booking-teal">{user?.fullName || 'DPVinhIT'}</p>
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.5px] text-booking-muted">
                Chủ nhà
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-booking-muted">
            <button
              type="button"
              aria-label="Thông báo"
              title="Thông báo"
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 0 0 6 0" />
              </svg>
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#ba1a1a]" />
            </button>
            <button
              type="button"
              aria-label="Trợ giúp"
              title="Trợ giúp"
              className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.1 9a3 3 0 1 1 4.8 2.4c-.9.6-1.4 1.1-1.4 2.1v.3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
            </button>
          </div>
        </header>

        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-12 lg:py-12">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold leading-tight text-booking-text sm:text-[32px] sm:leading-[38px]">
                Quản lý tin đăng
              </h1>
              <p className="mt-2 text-base leading-6 text-booking-muted">
                Quản lý tin đăng phòng của bạn một cách hiệu quả.
              </p>
            </div>
            <Link
              href="/host/listings/new"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-6 text-base font-semibold text-[#eeefff] shadow-sm transition hover:bg-booking-primary sm:w-auto"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
              <span>Thêm tin mới</span>
            </Link>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-booking-border/30 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:p-[17px]">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Tìm kiếm tin đăng</span>
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-booking-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4z" />
              </svg>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm kiếm theo tên, địa chỉ..."
                className="h-11 w-full rounded-lg border-0 bg-[#f3f3fe] px-10 text-base text-booking-text outline-none placeholder:text-[#6b7280] focus:ring-2 focus:ring-booking-primary/20"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => {
                const isActive = activeFilter === filter.key;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setActiveFilter(filter.key)}
                    className={`h-11 rounded-full px-4 text-base transition ${
                      isActive
                        ? 'bg-booking-primary font-semibold text-white shadow-sm'
                        : 'border border-booking-border/50 bg-[#f3f3fe] text-booking-muted hover:border-booking-primary/40'
                    }`}
                  >
                    {filter.label} ({filter.count})
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-booking-border/30 bg-white px-6 py-16 text-center shadow-sm">
              <p className="text-base font-semibold text-booking-text">Đang tải danh sách tin đăng...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-[#ffdad6] bg-[#fff8f7] px-6 py-16 text-center shadow-sm">
              <p className="text-base font-semibold text-[#ba1a1a]">{error}</p>
            </div>
          ) : pagedListings.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {pagedListings.map((listing) => (
                <BookingManageCard
                  key={listing.id}
                  listing={listing}
                  onToggleVisibility={handleToggleVisibility}
                  toggling={togglingId === listing.id}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-booking-border/30 bg-white px-6 py-16 text-center shadow-sm">
              <p className="text-base font-semibold text-booking-text">
                {listings.length === 0 ? 'Bạn chưa có tin đăng nào.' : 'Không tìm thấy tin đăng phù hợp.'}
              </p>
              <p className="mt-2 text-sm text-booking-muted">
                {listings.length === 0 ? 'Nhấn "Thêm tin mới" để đăng phòng đầu tiên.' : 'Hãy thử đổi từ khóa hoặc chọn lại trạng thái.'}
              </p>
            </div>
          )}

          {!loading && !error && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                aria-label="Trang trước"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-booking-border text-booking-muted transition hover:bg-white disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border text-base font-semibold ${
                    p === currentPage
                      ? 'border-booking-primary bg-booking-primary text-white shadow-sm'
                      : 'border-booking-border text-booking-text hover:bg-white'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                aria-label="Trang sau"
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-booking-border text-booking-text transition hover:bg-white disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
