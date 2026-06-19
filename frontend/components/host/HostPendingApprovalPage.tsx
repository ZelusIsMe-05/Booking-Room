'use client';

import Link from 'next/link';
import { ChangeEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  idCardUploadFields,
  pendingApprovalNotes,
  pendingApprovalSteps,
} from '@/data/hostPendingApproval';
import { hostProfileService } from '@/services/hostProfileService';

const lockedNavItems = [
  {
    label: 'Tin đăng',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 11h18M5 11V8a2 2 0 0 1 2-2h3v5m9 0V8a2 2 0 0 0-2-2h-3v5M5 11v6m14-6v6M4 17h16" />
    ),
  },
  {
    label: 'Giao dịch',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h10M7 17h6M5 3h14a1 1 0 0 1 1 1v16l-3-2-3 2-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1z" />
    ),
  },
  {
    label: 'Doanh thu',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M7 16V9m5 7V5m5 11v-4" />
    ),
  },
  {
    label: 'Tin nhắn',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6.5A8 8 0 1 1 21 12z" />
    ),
  },
] as const;

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

function LockIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6z" />
    </svg>
  );
}

function StepIcon({ state }: { state: 'complete' | 'current' | 'locked' }) {
  if (state === 'complete') {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }

  if (state === 'current') {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12M6 21h12M8 3c0 4 2 6 4 7 2-1 4-3 4-7M8 21c0-4 2-6 4-7 2 1 4 3 4 7" />
      </svg>
    );
  }

  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4l7 3v5c0 4.5-2.9 7.5-7 9-4.1-1.5-7-4.5-7-9V7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-5" />
    </svg>
  );
}

function CameraPlusIcon() {
  return (
    <svg className="h-8 w-8 text-[#424752]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h3l1.6-2h4.8L15 8h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z" />
      <circle cx="10.5" cy="13.5" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 4v5M16.5 6.5h5" />
    </svg>
  );
}

export default function HostPendingApprovalPage() {
  const { user, logout, refreshProfile } = useAuth();
  const router = useRouter();
  const displayName = user?.fullName || 'Quản lý chủ nhà';
  const avatarSrc = user?.avatarUrl || '/images/booking/host/host-avatar.jpg';
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadMessage, setUploadMessage] = useState('');

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const submitWhenReady = async (nextFront: File | null, nextBack: File | null) => {
    if (!nextFront || !nextBack || uploadStatus === 'uploading') {
      return;
    }

    setUploadStatus('uploading');
    setUploadMessage('Đang gửi ảnh CCCD...');
    try {
      await hostProfileService.submitHostVerification({
        idCardFront: nextFront,
        idCardBack: nextBack,
      });
      setUploadStatus('success');
      setUploadMessage('Đã gửi hồ sơ CCCD. Quản trị viên sẽ kiểm tra trong 12-24 giờ làm việc.');
      await refreshProfile();
    } catch (error: any) {
      setUploadStatus('error');
      setUploadMessage(error?.message || 'Không thể gửi hồ sơ CCCD. Vui lòng thử lại.');
    }
  };

  const handleFileChange =
    (side: 'front' | 'back') => async (event: ChangeEvent<HTMLInputElement>) => {
      const selected = event.target.files?.[0] || null;
      if (!selected) return;

      const isAllowedType = ['image/jpeg', 'image/png'].includes(selected.type);
      const isAllowedSize = selected.size <= 5 * 1024 * 1024;
      if (!isAllowedType || !isAllowedSize) {
        setUploadStatus('error');
        setUploadMessage('Ảnh CCCD chỉ hỗ trợ JPG, PNG và tối đa 5MB.');
        event.target.value = '';
        return;
      }

      const nextFront = side === 'front' ? selected : frontFile;
      const nextBack = side === 'back' ? selected : backFile;
      if (side === 'front') {
        setFrontFile(selected);
      } else {
        setBackFile(selected);
      }

      setUploadStatus('idle');
      setUploadMessage('Chọn đủ hai mặt CCCD để hệ thống tự gửi hồ sơ.');
      await submitWhenReady(nextFront, nextBack);
    };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FFF8F7] text-[#1E1B1B]">
      <div className="pointer-events-none absolute right-0 top-[390px] h-96 w-96 rounded-full bg-[#003F87]/5 blur-[50px]" />
      <div className="pointer-events-none absolute bottom-0 left-64 h-80 w-80 rounded-full bg-[#004C32]/5 blur-[40px]" />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[#C2C6D4] bg-[#FAF2F1] p-4 lg:flex">
        <div className="mb-12 flex h-[72px] items-center gap-3 px-2 py-4">
          <img
            src={avatarSrc}
            alt={displayName}
            className="h-10 w-10 rounded-full border-2 border-[#FFF8F7] object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-normal leading-5 text-[#A73A00]">{displayName}</p>
            <p className="flex items-center gap-1 text-[10px] leading-[15px] text-[#424752]">
              <svg className="h-3 w-3 text-[#004C32]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 4.2-2.8 7.2-7 9-4.2-1.8-7-4.8-7-9V7z" />
              </svg>
              Tài khoản xác thực
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1" aria-label="Điều hướng tài khoản chờ duyệt">
          <div className="flex h-12 items-center gap-3 rounded-lg bg-[#FD6B2A] px-4 text-base font-bold text-[#5B1C00]">
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
            </svg>
            Tổng quan
          </div>

          {lockedNavItems.map((item) => (
            <div
              key={item.label}
              className="flex h-12 items-center justify-between rounded-lg px-4 text-[#424752]/40"
              aria-disabled="true"
            >
              <span className="flex items-center gap-3 text-base font-normal">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  {item.icon}
                </svg>
                {item.label}
              </span>
              <LockIcon />
            </div>
          ))}
        </nav>

        <div className="border-t border-[#C2C6D4] pt-4">
          <Link
            href="/host/settings"
            className="flex h-12 items-center gap-3 rounded-lg px-4 text-base font-normal text-[#424752] hover:bg-white/60"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.3 4.3a1.8 1.8 0 0 1 3.4 0 1.8 1.8 0 0 0 2.7 1.1 1.8 1.8 0 0 1 2.4 2.4 1.8 1.8 0 0 0 1.1 2.7 1.8 1.8 0 0 1 0 3.4 1.8 1.8 0 0 0-1.1 2.7 1.8 1.8 0 0 1-2.4 2.4 1.8 1.8 0 0 0-2.7 1.1 1.8 1.8 0 0 1-3.4 0 1.8 1.8 0 0 0-2.7-1.1 1.8 1.8 0 0 1-2.4-2.4 1.8 1.8 0 0 0-1.1-2.7 1.8 1.8 0 0 1 0-3.4 1.8 1.8 0 0 0 1.1-2.7 1.8 1.8 0 0 1 2.4-2.4 1.8 1.8 0 0 0 2.7-1.1z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            </svg>
            Cài đặt
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-12 items-center gap-3 rounded-lg px-4 text-base font-normal text-[#BA1A1A] hover:bg-white/60"
          >
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17l5-5-5-5M20 12H9M12 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h7" />
            </svg>
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="relative z-10 lg:ml-64">
        <header className="sticky top-0 z-20 border-b border-[#C2C6D4] bg-[#FFF8F7]/90 backdrop-blur-md">
          <div className="mx-auto flex h-[57px] max-w-[1200px] items-center px-8">
            <Link href="/" className="text-base font-black leading-6 text-[#003F87]">
              Booking-Room
            </Link>
          </div>
        </header>

        <main className="flex min-h-[calc(100vh-57px)] justify-center px-5 py-12 sm:px-8">
          <section className="relative w-full max-w-[896px] overflow-hidden rounded-3xl border border-[#C2C6D4] bg-white p-6 shadow-sm sm:p-12">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#0056B3]/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#FD6B2A]/5 blur-3xl" />

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-8 flex h-32 w-32 items-center justify-center rounded-2xl bg-[#0056B3] text-[#BBD0FF] shadow-[0_10px_15px_-3px_rgba(0,63,135,0.2),0_4px_6px_-4px_rgba(0,63,135,0.2)]">
                <svg className="h-14 w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h7M4 12h7M4 17h5" />
                  <circle cx="16" cy="11" r="3.5" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 13.5L22 17" />
                </svg>
              </div>

              <h1 className="mb-4 text-base font-normal leading-6 text-[#003F87]">
                Tài khoản đang chờ phê duyệt
              </h1>
              <p className="max-w-[672px] text-base leading-6 text-[#424752]">
                Cảm ơn bạn đã tin tưởng <strong className="font-normal text-[#003F87]">An Tâm Booking</strong>. Đội ngũ quản trị viên đang tiến hành kiểm tra thông tin định danh và giấy tờ sở hữu của bạn. Quy trình này thường mất từ{' '}
                <strong className="font-normal text-[#A73A00]">12-24 giờ làm việc.</strong>
              </p>

              <div className="relative mt-16 w-full max-w-[768px] pb-14">
                <div className="absolute left-1/4 right-1/4 top-6 h-0.5 bg-[#C2C6D4]" />
                <div className="absolute left-1/4 top-6 h-0.5 w-1/4 bg-[#006645]" />
                <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-0">
                  {pendingApprovalSteps.map((step) => (
                    <div key={step.id} className="flex flex-col items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full shadow-md ${
                          step.state === 'complete'
                            ? 'bg-[#006645] text-white'
                            : step.state === 'current'
                              ? 'bg-[#0056B3] text-white'
                              : 'bg-[#E9E1E0] text-[#424752]/40'
                        }`}
                      >
                        <StepIcon state={step.state} />
                      </div>
                      <p
                        className={`text-base leading-6 ${
                          step.state === 'complete'
                            ? 'font-normal text-[#004C32]'
                            : step.state === 'current'
                              ? 'font-bold text-[#003F87]'
                              : 'font-normal text-[#424752]/40'
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <section className="w-full rounded-2xl border border-[#C2C6D4] bg-[#FAF2F1] p-6 text-left">
                <h2 className="flex items-center gap-2 text-lg font-normal leading-7 text-[#1E1B1B]">
                  <svg className="h-5 w-5 text-[#003F87]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 7h14v13H5zM9 12h6M12 9v6" />
                  </svg>
                  Hoàn thiện hồ sơ định danh
                </h2>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  {idCardUploadFields.map((field) => {
                    const file = field.id === 'front' ? frontFile : backFile;
                    return (
                      <div key={field.id} className="space-y-3">
                        <p className="text-base font-semibold leading-6 text-[#1E1B1B]">{field.label}</p>
                        <label className="flex h-[137px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#C2C6D4] bg-white/50 p-6 text-center transition hover:border-[#0056B3] hover:bg-white">
                          <input
                            type="file"
                            accept="image/jpeg,image/png"
                            className="sr-only"
                            onChange={handleFileChange(field.id)}
                            disabled={uploadStatus === 'uploading'}
                          />
                          <CameraPlusIcon />
                          <span className="text-base font-bold leading-6 text-[#003F87]">
                            {file ? 'Đổi ảnh' : 'Tải lên'}
                          </span>
                          <span className="max-w-full truncate text-xs leading-[18px] text-[#424752]">
                            {file ? file.name : 'Định dạng: JPG, PNG. Tối đa 5MB.'}
                          </span>
                        </label>
                      </div>
                    );
                  })}
                </div>

                {uploadMessage && (
                  <p
                    className={`mt-4 rounded-lg px-4 py-3 text-sm leading-5 ${
                      uploadStatus === 'success'
                        ? 'bg-[#E6F5F1] text-[#006645]'
                        : uploadStatus === 'error'
                          ? 'bg-[#FFEDEA] text-[#BA1A1A]'
                          : 'bg-white/70 text-[#424752]'
                    }`}
                  >
                    {uploadMessage}
                  </p>
                )}
              </section>

              <div className="mt-10 grid w-full gap-4 md:grid-cols-2">
                {pendingApprovalNotes.map((note) => (
                  <article
                    key={note.id}
                    className="min-h-[154px] rounded-2xl border border-[#C2C6D4] bg-[#FAF2F1] p-6 text-left"
                  >
                    <h2 className="flex items-center gap-2 text-base font-normal leading-6 text-[#1E1B1B]">
                      <svg
                        className={`h-5 w-5 ${note.tone === 'blue' ? 'text-[#003F87]' : 'text-[#A73A00]'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        {note.tone === 'blue' ? (
                          <>
                            <circle cx="12" cy="12" r="9" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8h.01M11 11h1v5h1" />
                          </>
                        ) : (
                          <>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v12H4z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7l8 6 8-6" />
                          </>
                        )}
                      </svg>
                      {note.title}
                    </h2>
                    <p className="mt-2 text-base leading-6 text-[#424752]">{note.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
