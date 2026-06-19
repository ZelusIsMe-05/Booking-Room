import HostTransactionDetailPage from '@/components/host/HostTransactionDetailPage';

type HostTransactionDetailRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function HostTransactionDetailRoute({ params }: HostTransactionDetailRouteProps) {
  const { id } = await params;
  return <HostTransactionDetailPage transactionId={id} />;
}
