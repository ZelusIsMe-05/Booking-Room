'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { roomService, mapBackendRoomToBookingRoom } from '@/services/roomService';
import RoomDetailContent from './RoomDetailContent';

interface RoomDetailClientFallbackProps {
  roomId: string;
}

export default function RoomDetailClientFallback({ roomId }: RoomDetailClientFallbackProps) {
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchRoom() {
      try {
        const res = await roomService.getRoomById(roomId);
        if (!active) return;
        if (res && res.data) {
          setRoom(mapBackendRoomToBookingRoom(res.data));
        } else {
          setError(true);
        }
      } catch (err) {
        if (!active) return;
        console.error('Client fallback room fetch failed:', err);
        setError(true);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchRoom();
    return () => {
      active = false;
    };
  }, [roomId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-booking-surface flex flex-col items-center justify-center p-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-[#004ac6] rounded-full animate-spin"></div>
          <div className="absolute w-8 h-8 bg-white rounded-full"></div>
        </div>
        <p className="mt-4 text-sm font-semibold text-booking-muted animate-pulse">
          Đang tải thông tin phòng...
        </p>
      </div>
    );
  }

  if (error || !room) {
    notFound();
    return null;
  }

  return <RoomDetailContent room={room} />;
}
