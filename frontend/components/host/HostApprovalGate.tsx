'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import HostPendingApprovalPage from './HostPendingApprovalPage';

interface HostApprovalGateProps {
  children: ReactNode;
}

function normalize(value?: string | null) {
  return value?.trim().toUpperCase();
}

export default function HostApprovalGate({ children }: HostApprovalGateProps) {
  const { user, loading } = useAuth();
  const role = normalize(user?.role);
  const approvalStatus = normalize(user?.approvalStatus ?? user?.approval_status);
  const isPendingLandlord =
    Boolean(user) &&
    (role === 'LANDLORD' || role === 'HOST') &&
    approvalStatus === 'PENDING';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF8F7] text-sm font-semibold text-[#4D4F5C]">
        Đang tải thông tin tài khoản...
      </div>
    );
  }

  if (isPendingLandlord) {
    return <HostPendingApprovalPage />;
  }

  return <>{children}</>;
}
