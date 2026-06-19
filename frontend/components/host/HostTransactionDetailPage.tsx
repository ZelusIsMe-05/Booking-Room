'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import HostSidebar from '@/components/host/HostSidebar';
import { formatTransactionVND, getHostTransactionDetail } from '@/data/hostTransactionDetails';

export default function HostTransactionDetailPage({ transactionId }: { transactionId: string }) {
  const detail = getHostTransactionDetail(transactionId);
  const { user, logout } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <main className="flex min-h-screen bg-[#FAF8FF] text-[#191B23]">
      <HostSidebar user={user} onLogout={handleLogout} activePage="transactions" />

      <section className="flex flex-1 flex-col lg:ml-[272px]">
        <header className="sticky top-0 z-10 flex h-[62px] items-center justify-between border-b border-[#C3C6D7] bg-[rgba(250,248,255,0.9)] px-6 backdrop-blur-md">
          <div className="relative w-full max-w-sm">
            <svg className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#737686]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4z" />
            </svg>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm kiếm giao dịch..." className="h-[45px] w-full rounded-full bg-[#EDEDF9] pl-12 pr-4 text-sm outline-none placeholder:text-[#6B7280]" />
          </div>
          <div className="ml-6 flex items-center gap-4 text-[#434655]">
            <button type="button" aria-label="Thông báo" title="Thông báo" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 0 0 6 0" />
              </svg>
            </button>
            <button type="button" aria-label="Trợ giúp" title="Trợ giúp" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.1 9a3 3 0 1 1 4.8 2.4c-.9.6-1.4 1.1-1.4 2.1v.3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </button>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1024px] flex-col gap-6 p-4 sm:p-6">
          <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <nav className="text-base leading-6" aria-label="Breadcrumb">
                <Link href="/host/transactions" className="text-[#434655] hover:text-[#004AC6]">Lịch sử giao dịch</Link>
                <span className="px-1 text-[#434655]">/</span>
                <span className="text-[#191B23]">{detail.bookingCode}</span>
              </nav>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <h1 className="text-[32px] font-bold leading-[38px]">Chi tiết giao dịch {detail.bookingCode}</h1>
                <span className="rounded-full bg-[#86F2E4] px-4 py-1 text-xs font-bold leading-3 tracking-[0.6px] text-[#006F66]">
                  {detail.statusLabel}
                </span>
              </div>
            </div>
            <button type="button" className="flex h-14 w-fit items-center gap-2 rounded-xl bg-[#004AC6] px-6 text-base text-white shadow-sm hover:bg-[#003f9e]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
              </svg>
              Export PDF
            </button>
          </section>

          <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="flex flex-col gap-6">
              <section className="grid gap-6 rounded-xl border border-[#E2E8F0] bg-white/70 p-6 shadow-sm backdrop-blur-md sm:grid-cols-3">
                <div>
                  <p className="text-base uppercase leading-6 text-[#434655]">Tổng thanh toán</p>
                  <p className="mt-1 text-2xl font-semibold leading-[31px] text-[#004AC6]">{formatTransactionVND(detail.totalPayment)}</p>
                </div>
                <div>
                  <p className="text-base uppercase leading-6 text-[#434655]">Phương thức</p>
                  <p className="mt-1 flex items-center gap-1 text-base font-semibold leading-6">
                    <svg className="h-5 w-5 text-[#006A61]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 10h8M8 14h4" />
                    </svg>
                    {detail.paymentMethod}
                  </p>
                </div>
                <div>
                  <p className="text-base uppercase leading-6 text-[#434655]">Thời gian hoàn tất</p>
                  <p className="mt-1 text-base leading-6">{detail.completedAt}</p>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white/70 shadow-sm backdrop-blur-md">
                <h2 className="border-b border-[#C3C6D7] bg-[#F3F3FE] px-6 py-4 text-xl font-semibold leading-7">
                  Chi tiết tài chính
                </h2>
                <div className="p-6">
                  <table className="w-full border-collapse text-base">
                    <thead>
                      <tr className="border-b border-[#C3C6D7] text-[#434655]">
                        <th className="py-4 text-left font-bold">Mô tả</th>
                        <th className="py-4 text-right font-bold">Đơn giá</th>
                        <th className="py-4 text-center font-bold">Số lượng</th>
                        <th className="py-4 text-right font-bold">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.lines.map((line) => (
                        <tr key={line.description} className="border-b border-[#C3C6D7]">
                          <td className="py-5 pr-4">{line.description}</td>
                          <td className="py-5 text-right">{formatTransactionVND(line.unitPrice)}</td>
                          <td className="py-5 text-center">{line.quantity}</td>
                          <td className="py-5 text-right">{formatTransactionVND(line.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-6 space-y-3 text-right text-base">
                    <p><span className="text-[#434655]">Tổng cộng gộp:</span> <span className="ml-6">{formatTransactionVND(detail.subtotal)}</span></p>
                    <p><span className="text-[#434655]">Phí hoa hồng hệ thống (10%):</span> <span className="ml-6 text-[#BA1A1A]">({formatTransactionVND(Math.abs(detail.commission))})</span></p>
                    <div className="border-t-2 border-[#004AC6] pt-5">
                      <p className="text-2xl font-bold leading-8 text-[#004AC6]">
                        Thực nhận (Net Payout): <span className="ml-6">{formatTransactionVND(detail.netPayout)}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="flex flex-col justify-end gap-4 sm:flex-row">
                <button type="button" className="flex h-[58px] items-center justify-center gap-2 rounded-xl border border-[#737686] px-6 text-base hover:bg-white">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10 3h4l8 8v4l-8 8h-4l-8-8v-4l8-8z" />
                  </svg>
                  Khiếu nại giao dịch
                </button>
                <button type="button" className="flex h-[58px] items-center justify-center gap-2 rounded-xl bg-[#006A61] px-6 text-base text-white hover:bg-[#00564f]">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6.5A8 8 0 1 1 21 12z" />
                  </svg>
                  Liên hệ khách hàng
                </button>
              </div>
            </div>

            <aside className="flex flex-col gap-6">
              <section className="rounded-xl border border-[#E2E8F0] bg-white/70 p-6 shadow-sm">
                <h2 className="text-xl font-semibold leading-7">Khách hàng</h2>
                <div className="mt-6 flex items-center gap-4">
                  <img src={detail.customer.avatarSrc} alt={detail.customer.name} className="h-16 w-16 rounded-full border-4 border-[#006A61] object-cover" />
                  <div>
                    <p className="text-xl font-bold leading-7">{detail.customer.name}</p>
                    <p className="text-xs font-bold uppercase tracking-[0.6px] text-[#006A61]">Đã xác thực</p>
                  </div>
                </div>
                <div className="mt-6 space-y-5 border-t border-[#C3C6D7] pt-6 text-base leading-6 text-[#434655]">
                  <p>{detail.customer.phone}</p>
                  <p>{detail.customer.email}</p>
                  <p>{detail.customer.completedBookings} lần đặt phòng thành công</p>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white/70 shadow-sm">
                <div className="relative h-32">
                  <img src={detail.room.imageSrc} alt={detail.room.title} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <h3 className="absolute bottom-4 left-4 right-4 text-xl font-bold leading-7 text-white">{detail.room.title}</h3>
                </div>
                <div className="p-4">
                  <p className="text-base leading-6 text-[#434655]">{detail.room.address}</p>
                  <Link href={`/host/listings/${detail.room.id}`} className="mt-3 inline-flex items-center gap-1 text-sm text-[#004AC6] hover:underline">
                    Xem chi tiết tin đăng
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M9 7h8v8" />
                    </svg>
                  </Link>
                </div>
              </section>

              <section className="rounded-xl border border-[#E2E8F0] bg-white/70 p-6 shadow-sm">
                <h2 className="text-xl font-semibold leading-7">Tiến độ giao dịch</h2>
                <div className="relative mt-6 space-y-6">
                  <div className="absolute bottom-2 left-[11px] top-2 w-0.5 bg-[#C3C6D7]" />
                  {detail.timeline.map((item) => (
                    <div key={item.title} className="relative pl-12">
                      <span className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#006A61] text-white shadow-sm">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l4 4L19 6" />
                        </svg>
                      </span>
                      <p className="text-base font-bold leading-6">{item.title}</p>
                      <p className="text-xs leading-[18px] text-[#434655]">{item.time}</p>
                      {item.note && (
                        <p className="mt-2 rounded border-l-2 border-[#006A61] bg-[rgba(134,242,228,0.2)] p-2 text-[13px] italic leading-5">
                          {item.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </section>
        </div>
      </section>
    </main>
  );
}
