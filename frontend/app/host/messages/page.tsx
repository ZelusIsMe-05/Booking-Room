import { Suspense } from 'react';
import HostMessagesPage from '@/components/host/HostMessagesPage';

export default function MessagesRoute() {
  return (
    <Suspense fallback={null}>
      <HostMessagesPage />
    </Suspense>
  );
}
