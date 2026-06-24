import { notFound } from 'next/navigation';
import { roomService, mapBackendRoomToBookingRoom } from '@/services/roomService';
import RoomDetailContent from '@/components/booking/RoomDetailContent';
import RoomDetailClientFallback from '@/components/booking/RoomDetailClientFallback';

type RoomDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RoomDetailPage({ params }: RoomDetailPageProps) {
  const { id } = await params;
  
  let room: any = null;
  try {
    const res = await roomService.getRoomById(id);
    if (res && res.data) {
      room = mapBackendRoomToBookingRoom(res.data);
    }
  } catch (error) {
    // Expected to fail server-side if authentication (token) is needed (e.g. LOCKED or RENTED rooms)
  }

  // If the server-side fetch failed (e.g. room is LOCKED or requires token),
  // fallback to the client-side fetcher which includes the authentication token.
  if (!room) {
    return <RoomDetailClientFallback roomId={id} />;
  }

  return <RoomDetailContent room={room} />;
}
