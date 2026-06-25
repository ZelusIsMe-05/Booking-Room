'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { roomService, mapBackendRoomToBookingRoom } from '@/services/roomService';
import RoomDetailContent from './RoomDetailContent';
import { useTranslation } from '@/context/LanguageContext';

interface RoomDetailClientFallbackProps {
  roomId: string;
}

export default function RoomDetailClientFallback({ roomId }: RoomDetailClientFallbackProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchRoom() {
      try {
        const res = await roomService.getRoomById(roomId);
        if (!active) return;
        if (res && res.data) {
          setRoom(mapBackendRoomToBookingRoom(res.data));
        } else {
          setErrorMsg(t('roomDetail.notFound'));
        }
      } catch (err: any) {
        if (!active) return;
        if (err.code !== 'ROOM_RENTED' && err.code !== 'ROOM_NOT_AVAILABLE') {
          console.error('Client fallback room fetch failed:', err);
        }
        const msg = err.response?.data?.message || err.message || t('roomDetail.loadError');
        setErrorMsg(msg);
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
  }, [roomId, t]);

  useEffect(() => {
    if (errorMsg) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: errorMsg, type: 'error' }
      }));
      router.push('/rooms');
    }
  }, [errorMsg, router]);

  if (loading || errorMsg || !room) {
    return (
      <div className="min-h-screen bg-booking-surface flex flex-col items-center justify-center p-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-[#004ac6] rounded-full animate-spin"></div>
          <div className="absolute w-8 h-8 bg-white rounded-full"></div>
        </div>
        <p className="mt-4 text-sm font-semibold text-booking-muted animate-pulse">
          {t('roomDetail.loading')}
        </p>
      </div>
    );
  }

  return <RoomDetailContent room={room} />;
}

