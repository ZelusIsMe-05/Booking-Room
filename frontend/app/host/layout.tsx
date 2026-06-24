import type { Metadata } from 'next';
import RoleGate from '@/components/common/RoleGate';
import HostApprovalGate from '@/components/host/HostApprovalGate';

export const metadata: Metadata = {
  title: 'Kênh Chủ Nhà',
  description: 'Quản lý danh sách phòng cho thuê, theo dõi doanh thu và giao dịch.',
};

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allowedRoles={['LANDLORD']}>
      <HostApprovalGate>{children}</HostApprovalGate>
    </RoleGate>
  );
}
