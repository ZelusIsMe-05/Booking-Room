// =============================================================
// frontend/app/guest/page.tsx
// Router chính cho phân vùng Guest (Khách vãng lai) - Route: /guest.
// Import và render GuestDashboard component.
// =============================================================

import GuestDashboard from '@/components/guest/GuestDashboard';

export default function GuestPage() {
  return <GuestDashboard />;
}
