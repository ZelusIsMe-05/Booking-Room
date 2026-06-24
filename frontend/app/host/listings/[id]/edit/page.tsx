import HostEditRoomPage from '@/components/host/HostEditRoomPage';

// Route động: tránh Router Cache giữ lại bản render cũ (client component không
// remount ⇒ useEffect không tải lại ⇒ form hiện dữ liệu cũ sau khi đã cập nhật).
export const dynamic = 'force-dynamic';

type HostEditRoomRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function HostEditRoomRoute({ params }: HostEditRoomRouteProps) {
  const { id } = await params;
  return <HostEditRoomPage listingId={id} />;
}
