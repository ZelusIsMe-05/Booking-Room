'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import BookingChatFab from '@/components/booking/BookingChatFab';
import BookingFooter from '@/components/booking/BookingFooter';
import BookingHeader from '@/components/booking/BookingHeader';
import RoomCard from '@/components/booking/RoomCard';
import SearchBento from '@/components/booking/SearchBento';
import { roomService, mapBackendRoomToBookingRoom } from '@/services/roomService';
import { favoriteService } from '@/services/favoriteService';
import { useTranslation } from '@/context/LanguageContext';
import type { BookingRoom } from '@/data/bookingRooms';

function SearchCriteriaSummary() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const q = searchParams.get('q') || '';
  const budget = searchParams.get('budget') || '';
  const type = searchParams.get('type') || '';
  const nearLat = searchParams.get('nearLat') || '';
  const nearLng = searchParams.get('nearLng') || '';

  if (!q && !budget && !type && !nearLat) return null;

  return (
    <div className="mt-3 p-3 rounded-xl bg-booking-surface border border-booking-border/60 text-xs sm:text-sm text-booking-muted font-medium flex flex-wrap gap-x-4 gap-y-1.5 items-center">
      <span className="font-bold text-booking-primary">{t('rooms.searchResultFor')}</span>
      {q && !nearLat && (
        <span className="flex items-center gap-1 flex-wrap">
          <strong>{t('rooms.area')}</strong> 
          {q.split('|').map((loc, idx) => (
            <span key={idx} className="bg-white border border-booking-border px-2 py-0.5 rounded-md text-booking-text font-semibold">
              {loc}
            </span>
          ))}
        </span>
      )}
      {nearLat && nearLng && (
        <span className="flex items-center gap-1">
          <strong>{t('rooms.radius')}</strong> <span className="bg-white border border-booking-border px-2 py-0.5 rounded-md text-booking-text font-semibold">{t('rooms.radiusDesc')}</span>
        </span>
      )}
      {budget && (
        <span className="flex items-center gap-1">
          <strong>{t('rooms.price')}</strong> <span className="bg-white border border-booking-border px-2 py-0.5 rounded-md text-booking-text font-semibold">{budget}</span>
        </span>
      )}
      {type && (
        <span className="flex items-center gap-1">
          <strong>{t('rooms.type')}</strong> <span className="bg-white border border-booking-border px-2 py-0.5 rounded-md text-booking-text font-semibold">{type}</span>
        </span>
      )}
    </div>
  );
}

function RoomsPageContent() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<BookingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const q = searchParams.get('q') || '';
  const budget = searchParams.get('budget') || '';
  const type = searchParams.get('type') || '';
  const nearLatStr = searchParams.get('nearLat') || '';
  const nearLngStr = searchParams.get('nearLng') || '';
  const nearLat = nearLatStr ? parseFloat(nearLatStr) : undefined;
  const nearLng = nearLngStr ? parseFloat(nearLngStr) : undefined;
  const searchCenter: [number, number] | null =
    nearLat != null && nearLng != null && !isNaN(nearLat) && !isNaN(nearLng)
      ? [nearLat, nearLng]
      : null;

  const ITEMS_PER_PAGE = 14;

  const fetchFavorites = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      setFavoriteIds(new Set());
      return;
    }

    try {
      const res = await favoriteService.listFavorites({ limit: 50 });
      if (res && res.data) {
        const items = res.data.items || [];
        setFavoriteIds(new Set(items.map((r: any) => r.roomId)));
      }
    } catch (err) {
      console.error('Error loading favorites on all listing page:', err);
    }
  };

  const handleToggleFavorite = async (roomId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      window.dispatchEvent(
        new CustomEvent('show-login-prompt', {
          detail: { redirectUrl: window.location.href }
        })
      );
      return;
    }

    try {
      const res = await favoriteService.toggleFavorite(roomId);
      if (res && res.data) {
        const action = res.data.action;
        if (action === 'ADDED') {
          setFavoriteIds((prev) => new Set([...prev, roomId]));
          window.dispatchEvent(
            new CustomEvent('show-toast', {
              detail: { message: 'Đã thêm vào phòng yêu thích của bạn.', type: 'success' }
            })
          );
        } else {
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.delete(roomId);
            return next;
          });
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
    async function fetchRooms() {
      setLoading(true);
      setError(null);
      setCurrentPage(1);
      try {
        // Map UI budget string to minPrice / maxPrice numbers
        let minPrice: number | undefined;
        let maxPrice: number | undefined;
        if (budget === 'Dưới 3 triệu') {
          maxPrice = 3000000;
        } else if (budget === '3 - 5 triệu') {
          minPrice = 3000000;
          maxPrice = 5000000;
        } else if (budget === '5 - 10 triệu') {
          minPrice = 5000000;
          maxPrice = 10000000;
        } else if (budget === 'Trên 10 triệu') {
          minPrice = 10000000;
        }

        // Fetch from backend API
        const res = await roomService.listRooms({
          location: (!nearLat && !nearLng && q) ? q : undefined,
          roomType: type || undefined,
          minPrice,
          maxPrice,
          nearLat,
          nearLng,
          radiusKm: nearLat != null ? 5 : undefined,
        });

        if (res && res.data) {
          const items = res.data.items || [];
          const mapped = items.map((room, idx) => mapBackendRoomToBookingRoom(room, idx));
          setRooms(mapped);
        } else {
          setError(res?.message || 'Lỗi khi tải danh sách phòng');
        }
      } catch (err: any) {
        console.error('Error fetching rooms:', err);
        setError('Không thể kết nối đến server backend.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchRooms();
  }, [q, budget, type, nearLatStr, nearLngStr]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRooms = rooms.slice(startIndex, endIndex);
  const totalPages = Math.ceil(rooms.length / ITEMS_PER_PAGE);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <section className="rounded-2xl border border-booking-border bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-booking-primary">{t('rooms.searchRoom')}</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{t('rooms.subtitle')}</h1>
            <Suspense fallback={null}>
              <SearchCriteriaSummary />
            </Suspense>
          </div>
          <p className="max-w-xl text-sm leading-6 text-booking-muted">
            {t('rooms.filterDesc')}
          </p>
        </div>
        <SearchBento compact />
      </section>

      <section className="mt-8">
        {/* Header: số phòng + toggle List/Map */}
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-xl font-bold">
            {loading ? t('rooms.searching') : t('rooms.roomsFound', { count: rooms.length })}
          </h2>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-booking-border bg-white px-3 py-1 text-sm text-booking-muted hidden sm:block">
              {t('rooms.sortByRecommend')}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
            {[1, 2, 3, 4].map((n) => (
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
            {t('rooms.noRoomsFound')}
          </div>
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
                  {t('rooms.prev')}
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
                  {t('rooms.next')}
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default function RoomsPage() {
  return (
    <div className="min-h-screen bg-booking-surface text-booking-text pt-16">
      <BookingHeader />
      <Suspense fallback={
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10 animate-pulse">
          <div className="h-40 bg-white rounded-2xl border border-booking-border mb-8" />
          <div className="h-80 bg-white rounded-2xl border border-booking-border" />
        </main>
      }>
        <RoomsPageContent />
      </Suspense>
      <BookingFooter />
      <BookingChatFab />
    </div>
  );
}
