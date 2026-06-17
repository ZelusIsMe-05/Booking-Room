'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import BookingChatFab from '@/components/booking/BookingChatFab';
import BookingFooter from '@/components/booking/BookingFooter';
import BookingHeader from '@/components/booking/BookingHeader';
import RoomCard from '@/components/booking/RoomCard';
import SearchBento from '@/components/booking/SearchBento';
import { roomService, mapBackendRoomToBookingRoom } from '@/services/roomService';
import type { BookingRoom } from '@/data/bookingRooms';

function SearchCriteriaSummary() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const budget = searchParams.get('budget') || '';
  const type = searchParams.get('type') || '';

  if (!q && !budget && !type) return null;

  return (
    <div className="mt-3 p-3 rounded-xl bg-booking-surface border border-booking-border/60 text-xs sm:text-sm text-booking-muted font-medium flex flex-wrap gap-x-4 gap-y-1.5 items-center">
      <span className="font-bold text-booking-primary">Kết quả tìm kiếm cho:</span>
      {q && (
        <span className="flex items-center gap-1">
          <strong>Khu vực:</strong> <span className="bg-white border border-booking-border px-2 py-0.5 rounded-md text-booking-text font-semibold">{q}</span>
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

  const q = searchParams.get('q') || '';
  const budget = searchParams.get('budget') || '';
  const type = searchParams.get('type') || '';

  useEffect(() => {
    async function fetchRooms() {
      setLoading(true);
      setError(null);
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
          location: q || undefined,
          roomType: type || undefined,
          minPrice,
          maxPrice,
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
  }, [q, budget, type]);

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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {loading ? 'Đang tìm kiếm...' : `${rooms.length} phòng phù hợp`}
          </h2>
          <span className="rounded-full border border-booking-border bg-white px-3 py-1 text-sm text-booking-muted">
            Sắp xếp: Đề xuất
          </span>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            Không tìm thấy phòng nào phù hợp với điều kiện lọc của bạn.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
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
