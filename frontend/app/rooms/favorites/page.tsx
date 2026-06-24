'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import BookingChatFab from '@/components/booking/BookingChatFab';
import BookingFooter from '@/components/booking/BookingFooter';
import BookingHeader from '@/components/booking/BookingHeader';
import RoomCard from '@/components/booking/RoomCard';
import { favoriteService } from '@/services/favoriteService';
import { mapBackendRoomToBookingRoom } from '@/services/roomService';
import type { BookingRoom } from '@/data/bookingRooms';

// Lazy-load RoomMap to avoid SSR errors
const RoomMap = dynamic(() => import('@/components/guest/RoomMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-2xl border border-booking-border bg-booking-surface animate-pulse" style={{ height: 520 }} />
  ),
});

function FavoritesPageContent() {
  const router = useRouter();
  const [rooms, setRooms] = useState<BookingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  const ITEMS_PER_PAGE = 14;

  const fetchFavorites = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await favoriteService.listFavorites({ limit: 100 });
      if (res && res.data) {
        const items = res.data.items || [];
        const mapped = items.map((room) => mapBackendRoomToBookingRoom(room));
        setRooms(mapped);
        setFavoriteIds(new Set(mapped.map((r) => r.id)));
      } else {
        setError(res?.message || 'Lỗi khi tải danh sách phòng yêu thích.');
      }
    } catch (err: any) {
      console.error('Error fetching favorites page:', err);
      setError('Không thể kết nối đến server backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (roomId: string) => {
    try {
      const res = await favoriteService.toggleFavorite(roomId);
      if (res && res.data) {
        const action = res.data.action;
        if (action === 'ADDED') {
          // Re-add if somehow toggled back
          setFavoriteIds((prev) => new Set([...prev, roomId]));
          window.dispatchEvent(
            new CustomEvent('show-toast', {
              detail: { message: 'Đã thêm vào phòng yêu thích của bạn.', type: 'success' }
            })
          );
        } else {
          // Remove from local list snappily
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.delete(roomId);
            return next;
          });
          setRooms((prev) => prev.filter((r) => r.id !== roomId));
          window.dispatchEvent(
            new CustomEvent('show-toast', {
              detail: { message: 'Đã xóa khỏi phòng yêu thích của bạn.', type: 'error' }
            })
          );
        }
      }
    } catch (err: any) {
      console.error('Error toggling favorite:', err);
      const msg = err.response?.data?.message || err.message || 'Lỗi xử lý yêu thích';
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: { message: msg, type: 'error' }
        })
      );
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRooms = rooms.slice(startIndex, endIndex);
  const totalPages = Math.ceil(rooms.length / ITEMS_PER_PAGE);

  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-md py-20 px-4 text-center">
        <div className="rounded-2xl border border-booking-border bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-bold text-booking-text">Yêu cầu đăng nhập</h2>
          <p className="mt-2 text-sm text-booking-muted">
            Vui lòng đăng nhập để xem và quản lý danh sách phòng yêu thích của bạn.
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="mt-6 w-full rounded-xl bg-booking-primary py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-booking-primaryDark"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      {/* Header Section */}
      <section className="rounded-2xl border border-booking-border bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-booking-primary">Danh sách của bạn</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Phòng yêu thích của bạn</h1>
          </div>
          <p className="max-w-xl text-sm leading-6 text-booking-muted">
            Nơi lưu trữ những không gian sống bạn đã chọn và lưu lại để tiện theo dõi.
          </p>
        </div>
      </section>

      <section className="mt-8">
        {/* Sub-header: số lượng + toggle List/Map */}
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-xl font-bold">
            {loading ? 'Đang tải...' : `${rooms.length} phòng yêu thích`}
          </h2>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-booking-border bg-white shadow-sm overflow-hidden">
              <button
                id="view-list-btn"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-colors ${
                  viewMode === 'list'
                    ? 'bg-booking-primary text-white'
                    : 'text-booking-muted hover:bg-booking-surface'
                }`}
                title="Xem dạng danh sách"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span className="hidden sm:inline">Danh sách</span>
              </button>
              <button
                id="view-map-btn"
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-colors ${
                  viewMode === 'map'
                    ? 'bg-booking-primary text-white'
                    : 'text-booking-muted hover:bg-booking-surface'
                }`}
                title="Xem trên bản đồ"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span className="hidden sm:inline">Bản đồ</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="animate-pulse rounded-2xl border border-booking-border bg-white overflow-hidden shadow-sm h-[320px]">
                <div className="bg-slate-200 h-48 w-full" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-6 bg-slate-200 rounded w-1/4 pt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-800 font-medium text-sm">
            {error}
          </div>
        ) : rooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-booking-border bg-white p-12 text-center text-booking-muted font-medium">
            Chưa có phòng yêu thích nào trong danh sách của bạn.
          </div>
        ) : viewMode === 'map' ? (
          <RoomMap rooms={rooms} height={580} searchCenter={null} />
        ) : (
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paginatedRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  isFavorited={favoriteIds.has(room.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-xl border border-booking-border bg-white text-sm font-semibold text-booking-text hover:bg-booking-surface disabled:opacity-50 transition-colors"
                >
                  Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      currentPage === p
                        ? 'bg-booking-primary border-booking-primary text-white shadow-sm'
                        : 'bg-white border-booking-border text-booking-text hover:bg-booking-surface'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 rounded-xl border border-booking-border bg-white text-sm font-semibold text-booking-text hover:bg-booking-surface disabled:opacity-50 transition-colors"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default function FavoritesPage() {
  return (
    <div className="min-h-screen bg-booking-surface text-booking-text">
      <BookingHeader />
      <Suspense fallback={
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10 animate-pulse">
          <div className="h-40 bg-white rounded-2xl border border-booking-border mb-8" />
          <div className="h-80 bg-white rounded-2xl border border-booking-border" />
        </main>
      }>
        <FavoritesPageContent />
      </Suspense>
      <BookingFooter />
      <BookingChatFab />
    </div>
  );
}
