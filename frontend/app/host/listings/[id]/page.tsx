import HostListingDetailPage from '@/components/host/HostListingDetailPage';

type HostListingDetailRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function HostListingDetailRoute({ params }: HostListingDetailRouteProps) {
  const { id } = await params;
  return <HostListingDetailPage listingId={id} />;
}
