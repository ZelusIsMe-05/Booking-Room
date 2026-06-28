'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import HostNotificationBell from '@/components/host/HostNotificationBell';
import HostSidebar from '@/components/host/HostSidebar';
import { hostTransactionService, type HostTransactionDetail } from '@/services/hostTransactionService';
import { useTranslation } from '@/context/LanguageContext';

function formatTransactionVND(amount: number): string {
  return (Number(amount) || 0).toLocaleString('vi-VN') + 'đ';
}

// Status badge colours, matching the tone used across the Host area.
const STATUS_BADGE: Record<string, string> = {
  completed: 'bg-[#86F2E4] text-[#006F66]',
  awaiting: 'bg-[#D6E4FF] text-[#004AC6]',   // Chờ giải ngân (chờ admin)
  pending: 'bg-[#FFDDB0] text-[#943700]',    // Chờ xác nhận (chờ chủ phòng)
  processing: 'bg-[#E5DEFF] text-[#6750A4]', // Đang xử lý thanh toán
  rejected: 'bg-[#FFDAD6] text-[#BA1A1A]',   // Chủ phòng từ chối đơn
  cancelled: 'bg-[#E1E2ED] text-[#737686]',  // Khách hủy / đơn hết hạn
};

export default function HostTransactionDetailPage({ transactionId }: { transactionId: string }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const [detail, setDetail] = useState<HostTransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    hostTransactionService
      .getDetail(transactionId)
      .then((res) => {
        if (cancelled) return;
        if (res.data) setDetail(res.data);
        else setError(t('host.transactionDetail.notFound'));
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.message || t('host.transactionDetail.loadFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [transactionId]);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <main className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <HostSidebar user={user} onLogout={handleLogout} activePage="transactions" />

      <section className="flex flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-10 flex h-[62px] items-center justify-between border-b border-[#C3C6D7] bg-[rgba(250,248,255,0.9)] px-6 backdrop-blur-md">
          <div className="relative w-full max-w-sm">
            <svg className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#737686]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4z" />
            </svg>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('host.transactionDetail.searchPlaceholder')} className="h-[45px] w-full rounded-full bg-[#EDEDF9] pl-12 pr-4 text-sm outline-none placeholder:text-[#6B7280]" />
          </div>
          <div className="ml-6 flex items-center gap-4 text-[#434655]">
            <HostNotificationBell />
            <LanguageSwitcher />
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1024px] flex-col gap-6 p-4 sm:p-6">
          {loading ? (
            <div className="rounded-2xl border border-[#C3C6D7] bg-white px-6 py-16 text-center shadow-sm">
              <p className="text-base font-semibold text-[#191B23]">{t('host.transactionDetail.loading')}</p>
            </div>
          ) : error || !detail ? (
            <div className="rounded-2xl border border-[#FFDAD6] bg-[#FFF8F7] px-6 py-16 text-center shadow-sm">
              <p className="text-base font-semibold text-[#BA1A1A]">{error || t('host.transactionDetail.notFound')}</p>
              <Link href="/host/transactions" className="mt-4 inline-block text-sm font-semibold text-[#004AC6] hover:underline">
                {t('host.transactionDetail.backToList')}
              </Link>
            </div>
          ) : (
            <>
              <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <nav className="text-base leading-6" aria-label="Breadcrumb">
                    <Link href="/host/transactions" className="text-[#434655] hover:text-[#004AC6]">{t('host.transactionDetail.historyBreadcrumb')}</Link>
                    <span className="px-1 text-[#434655]">/</span>
                    <span className="text-[#191B23]">{detail.bookingCode}</span>
                  </nav>
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <h1 className="text-[32px] font-bold leading-[38px]">{t('host.transactionDetail.title')}</h1>
                    <span className={`rounded-full px-4 py-1 text-xs font-bold leading-3 tracking-[0.6px] ${STATUS_BADGE[detail.status] || STATUS_BADGE.processing}`}>
                      {t(`host.transactions.status${detail.status.charAt(0).toUpperCase() + detail.status.slice(1)}`)}
                    </span>
                  </div>
                  <p className="mt-1 text-base leading-6 text-[#434655]">
                    {t('host.transactionDetail.txCode')} <span className="font-semibold text-[#191B23]">{detail.bookingCode}</span>
                  </p>
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <div className="flex flex-col gap-6">
                  <section className="grid gap-6 rounded-xl border border-[#E2E8F0] bg-white/70 p-6 shadow-sm backdrop-blur-md sm:grid-cols-2">
                    <div>
                      <p className="text-base uppercase leading-6 text-[#434655]">{t('host.transactionDetail.amountLabel')}</p>
                      <p className="mt-1 text-2xl font-semibold leading-[31px] text-[#004AC6]">{formatTransactionVND(detail.totalPayment)}</p>
                    </div>
                    <div>
                      <p className="text-base uppercase leading-6 text-[#434655]">{t('host.transactionDetail.paymentMethodLabel')}</p>
                      <p className="mt-1 flex items-center gap-1 text-base font-semibold leading-6">
                        <svg className="h-5 w-5 text-[#006A61]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 10h8M8 14h4" />
                        </svg>
                        {detail.paymentMethod}
                      </p>
                    </div>
                    <div>
                      <p className="text-base uppercase leading-6 text-[#434655]">{t('host.transactionDetail.timeLabel')}</p>
                      <p className="mt-1 text-base leading-6">{detail.completedAt}</p>
                    </div>
                    <div>
                      <p className="text-base uppercase leading-6 text-[#434655]">{t('host.transactionDetail.statusLabel')}</p>
                      <p className="mt-1">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold leading-3 tracking-[0.6px] ${STATUS_BADGE[detail.status] || STATUS_BADGE.processing}`}>
                          {t(`host.transactions.status${detail.status.charAt(0).toUpperCase() + detail.status.slice(1)}`)}
                        </span>
                      </p>
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white/70 shadow-sm backdrop-blur-md">
                    <h2 className="border-b border-[#C3C6D7] bg-[#F3F3FE] px-6 py-4 text-xl font-semibold leading-7">
                      {t('host.transactionDetail.financialDetailsTitle')}
                    </h2>
                    <div className="p-6">
                      <table className="w-full border-collapse text-base">
                        <thead>
                          <tr className="border-b border-[#C3C6D7] text-[#434655]">
                            <th className="py-4 text-left font-bold">{t('host.transactionDetail.thDesc')}</th>
                            <th className="py-4 text-right font-bold">{t('host.transactionDetail.thPrice')}</th>
                            <th className="py-4 text-center font-bold">{t('host.transactionDetail.thQty')}</th>
                            <th className="py-4 text-right font-bold">{t('host.transactionDetail.thAmount')}</th>
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
                        <p><span className="text-[#434655]">{t('host.transactionDetail.subtotalLabel')}</span> <span className="ml-6">{formatTransactionVND(detail.subtotal)}</span></p>
                        <p><span className="text-[#434655]">{t('host.transactionDetail.commissionLabel').replace('10%', `${detail.commissionPercent}%`)}</span> <span className="ml-6 text-[#BA1A1A]">({formatTransactionVND(Math.abs(detail.commission))})</span></p>
                        {detail.settlementStatus !== 'none' && (
                          <p className="flex items-center justify-end gap-2">
                            <span className="text-[#434655]">Trạng thái giải ngân:</span>
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold leading-3 tracking-[0.6px] ${detail.settlementStatus === 'disbursed' ? 'bg-[#86F2E4] text-[#006F66]' : 'bg-[#FFDDB0] text-[#943700]'}`}>
                              {detail.settlementLabel}
                            </span>
                          </p>
                        )}
                        <div className="border-t-2 border-[#004AC6] pt-5">
                          <p className="text-2xl font-bold leading-8 text-[#004AC6]">
                            {detail.settlementStatus === 'disbursed' ? t('host.transactionDetail.netReceivedLabel') : 'Dự kiến thực nhận:'} <span className="ml-6">{formatTransactionVND(detail.netPayout)}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <aside className="flex flex-col gap-6">
                  <section className="rounded-xl border border-[#E2E8F0] bg-white/70 p-6 shadow-sm">
                    <h2 className="text-xl font-semibold leading-7">{t('host.transactionDetail.customerTitle')}</h2>
                    <div className="mt-6 flex items-center gap-4">
                      <img src={detail.customer.avatarSrc} alt={detail.customer.name} className="h-16 w-16 rounded-full border-4 border-[#006A61] object-cover" />
                      <div>
                        <p className="text-xl font-bold leading-7">{detail.customer.name}</p>
                        <p className="text-xs font-bold uppercase tracking-[0.6px] text-[#006A61]">{t('host.transactionDetail.verified')}</p>
                      </div>
                    </div>
                    <div className="mt-6 space-y-3 border-t border-[#C3C6D7] pt-6 text-base leading-6 text-[#434655]">
                      <p>
                        <span className="font-semibold text-[#191B23]">{t('host.transactionDetail.phoneLabel')}</span> {detail.customer.phone}
                      </p>
                      <p>
                        <span className="font-semibold text-[#191B23]">{t('host.transactionDetail.emailLabel')}</span> {detail.customer.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(`/host/messages?peer=${detail.customer.userId}`)}
                      className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#006A61] px-6 text-base font-semibold text-white transition hover:bg-[#00564f]"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6.5A8 8 0 1 1 21 12z" />
                      </svg>
                      {t('host.transactionDetail.chatWith').replace('{name}', detail.customer.name)}
                    </button>
                  </section>

                  <Link
                    href={`/host/listings/${detail.room.id}`}
                    aria-label={t('host.transactionDetail.viewRoomAria').replace('{title}', detail.room.title)}
                    className="group block overflow-hidden rounded-xl border border-[#E2E8F0] bg-white/70 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.12)]"
                  >
                    <div className="relative h-32">
                      <img src={detail.room.imageSrc} alt={detail.room.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <span className="absolute left-4 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold leading-3 tracking-[0.6px] text-[#004AC6]">
                        {detail.room.code}
                      </span>
                      <h3 className="absolute bottom-4 left-4 right-4 text-xl font-bold leading-7 text-white">{detail.room.title}</h3>
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.6px] text-[#737686]">{t('host.transactionDetail.roomAssocLabel')}</p>
                      <p className="mt-1 text-base leading-6 text-[#434655]">{detail.room.address}</p>
                    </div>
                  </Link>

                  <section className="rounded-xl border border-[#E2E8F0] bg-white/70 p-6 shadow-sm">
                    <h2 className="text-xl font-semibold leading-7">{t('host.transactionDetail.progressTitle')}</h2>
                    {detail.timeline.length === 0 ? (
                      <p className="mt-4 text-base text-[#434655]">{t('host.transactionDetail.noProgress')}</p>
                    ) : (
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
                    )}
                  </section>
                </aside>
              </section>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
