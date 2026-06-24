import HostListingDetailPage from '@/components/host/HostListingDetailPage';

// Route động: tránh Router Cache giữ bản render cũ sau khi chủ phòng cập nhật.
export const dynamic = 'force-dynamic';

type HostListingDetailRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function HostListingDetailRoute({ params }: HostListingDetailRouteProps) {
  const { id } = await params;
  return <HostListingDetailPage listingId={id} />;
}
