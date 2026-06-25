'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type ApplicationRole = 'ADMIN' | 'LANDLORD' | 'TENANT';

interface RoleGateProps {
  allowedRoles: ApplicationRole[];
  children: ReactNode;
}

function normalizeRole(role?: string | null) {
  return role?.trim().toUpperCase();
}

function AccessDeniedPage() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleSwitchAccount = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Failed to logout during account switch:', error);
      router.push('/auth/login');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 text-slate-900">
      <section
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10"
        aria-labelledby="access-denied-title"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3Z" />
          </svg>
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-red-600">Lỗi 403</p>
        <h1 id="access-denied-title" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Bạn không được phép truy cập tài nguyên này
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base font-medium">
          Tài khoản hiện tại không có quyền truy cập khu vực bạn vừa yêu cầu. Vui lòng quay về trang chủ hoặc đăng nhập bằng tài khoản phù hợp.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-booking-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-booking-primaryDark focus:outline-none focus:ring-2 focus:ring-booking-primary focus:ring-offset-2"
          >
            Về trang chủ
          </Link>
          <button
            onClick={handleSwitchAccount}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            Đăng nhập tài khoản khác
          </button>
        </div>
      </section>
    </main>
  );
}

/**
 * Blocks role-specific layouts before their dashboards and client-side data
 * requests are rendered. The backend remains the source of authorization;
 * this gate keeps the frontend response consistent for an invalid URL.
 */
export default function RoleGate({ allowedRoles, children }: RoleGateProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-booking-primary border-t-transparent"></div>
          <span>Đang xác thực quyền truy cập...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-booking-primary border-t-transparent"></div>
          <span>Đang chuyển hướng đến trang đăng nhập...</span>
        </div>
      </div>
    );
  }

  const role = normalizeRole(user?.role) as ApplicationRole | undefined;
  if (!role || !allowedRoles.includes(role)) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
}
