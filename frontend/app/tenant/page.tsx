// =============================================================
// frontend/app/tenant/page.tsx
// Router chính cho phân vùng Tenant (Người thuê) - Route: /tenant.
// Import và render TenantDashboard component.
// =============================================================

import TenantDashboard from '@/components/tenant/TenantDashboard';

export default function TenantPage() {
  return <TenantDashboard />;
}
