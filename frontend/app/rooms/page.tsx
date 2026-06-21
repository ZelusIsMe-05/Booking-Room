'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import BookingChatFab from '@/components/booking/BookingChatFab';
import BookingFooter from '@/components/booking/BookingFooter';
import BookingHeader from '@/components/booking/BookingHeader';
import RoomCard from '@/components/booking/RoomCard';
import SearchBento from '@/components/booking/SearchBento';
import { roomService, mapBackendRoomToBookingRoom } from '@/services/roomService';
import type { BookingRoom } from '@/data/bookingRooms';

// Lazy-load RoomMap để tránh SSR error (Leaflet cần window object)
const RoomMap = dynamic(() => import('@/components/guest/RoomMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-2xl border border-booking-border bg-booking-surface animate-pulse" style={{ height: 520 }} />
  ),
});

function SearchCriteriaSummary() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const budget = searchParams.get('budget') || '';
  const type = searchParams.get('type') || '';
  const nearLat = searchParams.get('nearLat') || '';
  const nearLng = searchParams.get('nearLng') || '';

  if (!q && !budget && !type && !nearLat) return null;

  return (
    <div className="mt-3 p-3 rounded-xl bg-booking-surface border border-booking-border/60 text-xs sm:text-sm text-booking-muted font-medium flex flex-wrap gap-x-4 gap-y-1.5 items-center">
      <span className="font-bold text-booking-primary">Kết quả tìm kiếm cho:</span>
      {q && !nearLat && (
        <span className="flex items-center gap-1 flex-wrap">
          <strong>Khu vực:</strong> 
          {q.split('|').map((loc, idx) => (
            <span key={idx} className="bg-white border border-booking-border px-2 py-0.5 rounded-md text-booking-text font-semibold">
              {loc}
            </span>
          ))}
        </span>
      )}
      {nearLat && nearLng && (
        <span className="flex items-center gap-1">
          <strong>📍 Bán kính:</strong> <span className="bg-white border border-booking-border px-2 py-0.5 rounded-md text-booking-text font-semibold">5km quanh vị trí đã chọn</span>
        </span>
      )}
      {budget && (
        <span className="flex items-center gap-1">
          <strong>Giá:</strong> <span className="bg-white border border-booking-border px-2 py-0.5 rounded-md text-booking-text font-semibold">{budget}</span>
        </span>
      )}
      {type && (
        <span className="flex items-center gap-1">
          <strong>Loại:</strong> <span className="bg-white border border-booking-border px-2 py-0.5 rounded-md text-booking-text font-semibold">{type}</span>
        </span>
      )}
    </div>
  );
}

function RoomsPageContent() {
  const searchParams = useSearchParams();
  const [rooms, setRooms] = useState<BookingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [currentPage, setCurrentPage] = useState(1);

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

  useEffect(() => {
    async function fetchRooms() {
      setLoading(true);
      setError(null);
      setCurrentPage(1);
      try {
        // Map UI budget string to minPrice / maxPrice numbers
        let minPrice: number | undefined;
        let maxPrice: number | undefined;
        if (budget === 'Dưới 1 triệu') {
          maxPrice = 1000000;
        } else if (budget === '1 - 3 triệu') {
          minPrice = 1000000;
          maxPrice = 3000000;
        } else if (budget === 'Trên 3 triệu') {
          minPrice = 3000000;
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

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRooms = rooms.slice(startIndex, endIndex);
  const totalPages = Math.ceil(rooms.length / ITEMS_PER_PAGE);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <section className="rounded-2xl border border-booking-border bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-booking-primary">Tìm kiếm phòng</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Không gian phù hợp với nhịp sống của bạn</h1>
            <Suspense fallback={null}>
              <SearchCriteriaSummary />
            </Suspense>
          </div>
          <p className="max-w-xl text-sm leading-6 text-booking-muted">
            Lọc nhanh theo khu vực và loại phòng.
          </p>
        </div>
        <SearchBento compact />
      </section>

      <section className="mt-8">
        {/* Header: số phòng + toggle List/Map */}
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-xl font-bold">
            {loading ? 'Đang tìm kiếm...' : `${rooms.length} phòng phù hợp`}
          </h2>

          <div className="flex items-center gap-2">
            {/* Nút toggle List / Map */}
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

            <span className="rounded-full border border-booking-border bg-white px-3 py-1 text-sm text-booking-muted hidden sm:block">
              Sắp xếp: Đề xuất
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
            Không tìm thấy phòng nào phù hợp với điều kiện lọc của bạn.
          </div>
        ) : viewMode === 'map' ? (
          /* ---- Bản đồ ---- */
          <RoomMap rooms={rooms} height={580} searchCenter={searchCenter} />
        ) : (
          <div className="space-y-8">
            /* ---- Danh sách ---- */
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paginatedRooms.map((room) => (
                <RoomCard key={room.id} room={room} />
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

export default function RoomsPage() {
  return (
    <div className="min-h-screen bg-booking-surface text-booking-text">
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
