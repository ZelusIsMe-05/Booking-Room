import HostEditRoomPage from '@/components/host/HostEditRoomPage';

type HostEditRoomRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function HostEditRoomRoute({ params }: HostEditRoomRouteProps) {
  const { id } = await params;
  return <HostEditRoomPage listingId={id} />;
}
