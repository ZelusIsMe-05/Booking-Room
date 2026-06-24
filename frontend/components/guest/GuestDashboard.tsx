'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import BookingChatFab from '@/components/booking/BookingChatFab';
import BookingFooter from '@/components/booking/BookingFooter';
import BookingHeader from '@/components/booking/BookingHeader';
import RoomCard from '@/components/booking/RoomCard';
import SearchBento from '@/components/booking/SearchBento';
import { roomService, mapBackendRoomToBookingRoom } from '@/services/roomService';
import { favoriteService } from '@/services/favoriteService';
import type { BookingRoom } from '@/data/bookingRooms';

export default function GuestDashboard() {
  const [rooms, setRooms] = useState<BookingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteRooms, setFavoriteRooms] = useState<BookingRoom[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  const fetchFavorites = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      setFavoriteRooms([]);
      setFavoriteIds(new Set());
      return;
    }

    setFavoritesLoading(true);
    try {
      const res = await favoriteService.listFavorites({ limit: 50 });
      if (res && res.data) {
        const items = res.data.items || [];
        const mapped = items.map((room) => mapBackendRoomToBookingRoom(room));
        setFavoriteRooms(mapped);
        setFavoriteIds(new Set(items.map((r: any) => r.roomId)));
      }
    } catch (err) {
      console.error('Error loading favorites:', err);
    } finally {
      setFavoritesLoading(false);
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
        fetchFavorites();
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
    async function loadFeaturedRooms() {
      try {
        const res = await roomService.listRooms({ limit: 4, sort: 'rating_desc' });
        if (res && res.data) {
          const items = res.data.items || [];
          const mapped = items.map((room) => mapBackendRoomToBookingRoom(room));
          setRooms(mapped);
        }
      } catch (err) {
        console.error('Error loading featured rooms:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFeaturedRooms();
    fetchFavorites();
  }, []);

  return (
    <div className="min-h-screen bg-booking-surface text-booking-text">
      <BookingHeader />

      <main>
        <section className="relative flex min-h-[600px] items-center justify-center overflow-hidden bg-booking-border">
          <Image
            src="/images/booking/hero-apartment.png"
            alt="Không gian căn hộ hiện đại"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-45 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-booking-surface/45 to-booking-surface/95" />

          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pt-14 text-center sm:px-6">
            <h1 className="text-3xl font-extrabold italic leading-tight tracking-normal text-booking-text sm:text-4xl">
              Tìm Phòng Ưng Ý, Định Cư Lâu Dài
            </h1>
            <p className="mt-4 max-w-2xl text-base italic leading-7 text-booking-muted sm:text-lg">
              Hàng ngàn phòng trọ, căn hộ dịch vụ và chỗ ở ghép xác thực, đầy đủ tiện nghi.
            </p>
            <div className="mt-12 w-full">
              <SearchBento />
            </div>
          </div>
        </section>

        {/* Phòng Nổi Bật */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-booking-text">Phòng Nổi Bật</h2>
              <p className="mt-1 text-sm text-booking-muted">Những không gian được yêu thích và đánh giá cao nhất.</p>
            </div>
            <Link href="/rooms" className="shrink-0 text-sm font-bold text-booking-primary transition hover:text-booking-primaryDark sm:text-base">
              Xem tất cả
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2">
              {[1, 2].map((n) => (
                <div key={n} className="animate-pulse rounded-2xl border border-booking-border bg-white overflow-hidden shadow-sm h-[320px]">
                  <div className="bg-slate-200 h-48 w-full" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-booking-border bg-white p-12 text-center text-booking-muted font-medium">
              Chưa có phòng nổi bật nào trong hệ thống.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {rooms.map((room, index) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  featured={index === 0 || index === 3}
                  isFavorited={favoriteIds.has(room.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}
        </section>

        {/* Phòng yêu thích */}
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-booking-text">Phòng yêu thích</h2>
              <p className="mt-1 text-sm text-booking-muted">Những phòng bạn đã lưu lại để theo dõi.</p>
            </div>
            <Link href="/rooms/favorites" className="shrink-0 text-sm font-bold text-booking-primary transition hover:text-booking-primaryDark sm:text-base">
              Xem tất cả
            </Link>
          </div>

          {favoritesLoading ? (
            <div className="grid gap-6 md:grid-cols-2">
              {[1, 2].map((n) => (
                <div key={n} className="animate-pulse rounded-2xl border border-booking-border bg-white overflow-hidden shadow-sm h-[320px]">
                  <div className="bg-slate-200 h-48 w-full" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : favoriteRooms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-booking-border bg-white p-12 text-center text-booking-muted font-medium">
              Chưa có phòng yêu thích nào.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {favoriteRooms.map((room, index) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  featured={index === 0 || index === 3}
                  isFavorited={true}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <BookingFooter />
      <BookingChatFab />
    </div>
  );
}
