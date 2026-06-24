'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import HostSidebar from '@/components/host/HostSidebar';
import {
  statusConfig,
  statusFilterOptions,
  formatVND,
  type TransactionStatus,
} from '@/data/hostTransactions';
import {
  hostTransactionService,
  type HostTransactionItem,
  type HostTransactionSummary,
} from '@/services/hostTransactionService';

const ITEMS_PER_PAGE = 8;

/** Map the month dropdown selection to an ISO `dateFrom` (or undefined). */
function dateFromForRange(label: string): string | undefined {
  const now = new Date();
  if (label.startsWith('Tháng này')) return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  if (label.startsWith('Tháng trước')) return new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  if (label.startsWith('3 tháng')) return new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
  if (label.startsWith('6 tháng')) return new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString();
  if (label.startsWith('Năm nay')) return new Date(now.getFullYear(), 0, 1).toISOString();
  return undefined;
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string;
  sub: React.ReactNode;
  icon: React.ReactNode;
  iconBg: string;
}

function SummaryCard({ label, value, sub, icon, iconBg }: SummaryCardProps) {
  return (
    <div className="flex flex-1 items-center justify-between rounded-xl border border-[#C3C6D7] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold tracking-[0.6px] text-[#434655] uppercase">
          {label}
        </span>
        <span className="text-2xl font-semibold leading-8 text-[#191B23]">{value}</span>
        <div className="flex items-center gap-1 text-base leading-6">{sub}</div>
      </div>
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TransactionStatus }) {
  const cfg = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold leading-4 ${cfg.bgClass} ${cfg.textClass} ${cfg.uppercase ? 'uppercase tracking-[-0.55px]' : ''}`}
    >
      {cfg.label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HostTransactionsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState('Tất cả thời gian');

  // ── Data from API ──────────────────────────────────────────────────────────
  const [items, setItems] = useState<HostTransactionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<HostTransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [exporting, setExporting] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await hostTransactionService.exportCsv({
        status: statusFilter,
        search: search.trim() || undefined,
        dateFrom: dateFromForRange(selectedMonth),
      });
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: err?.message || 'Không xuất được báo cáo.', type: 'error' },
      }));
    } finally {
      setExporting(false);
    }
  };

  // Reset to first page whenever a filter changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, selectedMonth]);

  // Fetch the summary once.
  useEffect(() => {
    let cancelled = false;
    hostTransactionService
      .getSummary()
      .then((res) => {
        if (!cancelled && res.data) setSummary(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch the list (server-side filtered + paginated); debounce the search box.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(() => {
      hostTransactionService
        .list({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          status: statusFilter,
          search: search.trim() || undefined,
          dateFrom: dateFromForRange(selectedMonth),
        })
        .then((res) => {
          if (cancelled || !res.data) return;
          setItems(res.data.items);
          setTotal(res.data.pagination.total);
          setTotalPages(res.data.pagination.totalPages);
        })
        .catch(() => {
          if (!cancelled) {
            setItems([]);
            setTotal(0);
            setTotalPages(1);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [search, statusFilter, selectedMonth, currentPage]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const paginated = items;

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('all');
  };

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    for (let p = start; p <= end; p += 1) pages.push(p);
    return pages;
  }, [currentPage, totalPages]);

  const hasActiveFilters = statusFilter !== 'all' || search.trim().length > 0;

  return (
    <main className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <HostSidebar user={user} onLogout={handleLogout} activePage="transactions" />

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:ml-64">

        {/* ── Top Nav Bar ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[#C3C6D7] bg-[rgba(250,248,255,0.9)] px-6 backdrop-blur-md">
          {/* Search */}
          <div className="relative flex-1 max-w-3xl">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#737686]"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm giao dịch, tên khách hàng..."
              className="h-[39px] w-full rounded-full border border-[#C3C6D7] bg-[#F3F3FE] pl-10 pr-4 text-sm text-[#191B23] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#004AC6]/20"
            />
          </div>

          {/* Action buttons */}
          <div className="ml-6 flex items-center gap-6">
            <button type="button" aria-label="Thông báo" className="flex h-8 w-8 items-center justify-center rounded-full text-[#434655] hover:bg-[#E1E2ED]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 0 0 6 0" />
              </svg>
            </button>
            <div className="h-8 w-px bg-[#C3C6D7]" />
            <button type="button" aria-label="Trợ giúp" className="flex h-9 w-9 items-center justify-center rounded-full text-[#434655] hover:bg-[#E1E2ED]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.1 9a3 3 0 1 1 4.8 2.4c-.9.6-1.4 1.1-1.4 2.1v.3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </button>
          </div>
        </header>

        {/* ── Dashboard Content ───────────────────────────────────────── */}
        <div className="flex flex-col gap-6 p-6">

          {/* ── Page Header ──────────────────────────────────────────── */}
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-[32px] font-bold leading-[38px] text-[#191B23]">
                Lịch sử giao dịch và Cho thuê phòng
              </h1>
              <p className="text-base leading-6 text-[#434655]">
                Quản lý và theo dõi dòng tiền từ các lượt đặt phòng của bạn.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-1 rounded-lg border border-[#C3C6D7] bg-white px-4 py-2 text-base font-semibold text-[#191B23] transition hover:bg-[#F3F3FE] disabled:opacity-60"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1M12 12V4M8 8l4-4 4 4" />
                </svg>
                {exporting ? 'Đang xuất...' : 'Xuất báo cáo'}
              </button>
            </div>
          </div>

          {/* ── Summary Cards ─────────────────────────────────────────── */}
          <div className="flex gap-6">
            <SummaryCard
              label="Tổng giao dịch"
              value={formatVND(summary?.totalRevenue ?? 0)}
              sub={
                <>
                  <svg className="h-3 w-3 text-[#006A61]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                  <span className="text-[#006A61]">
                    {(summary?.totalRevenueChange ?? 0) >= 0 ? '+' : ''}{summary?.totalRevenueChange ?? 0}% so với tháng trước
                  </span>
                </>
              }
              iconBg="rgba(0,74,198,0.1)"
              icon={
                <svg className="h-6 w-6 text-[#004AC6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
                </svg>
              }
            />
            <SummaryCard
              label="Đang xử lý"
              value={formatVND(summary?.processingAmount ?? 0)}
              sub={
                <span className="text-[#434655]">
                  {String(summary?.processingCount ?? 0).padStart(2, '0')} giao dịch chờ duyệt
                </span>
              }
              iconBg="rgba(148,55,0,0.1)"
              icon={
                <svg className="h-6 w-6 text-[#943700]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h4" />
                </svg>
              }
            />
            <SummaryCard
              label="Giao dịch thành công"
              value={formatVND(summary?.completedAmount ?? 0)}
              sub={
                <span className="text-[#006A61]">
                  {summary?.completionRate ?? 0}% tỷ lệ hoàn tất
                </span>
              }
              iconBg="rgba(0,106,97,0.1)"
              icon={
                <svg className="h-6 w-6 text-[#006A61]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
              }
            />
          </div>

          {/* ── Filter Bar ────────────────────────────────────────────── */}
          <div className="flex items-center gap-4 rounded-xl border border-[#C3C6D7] bg-white px-4 py-[18px] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            {/* Date picker */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <svg className="h-5 w-[18px] shrink-0 text-[#737686]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <div className="relative">
                <select
                  aria-label="Chọn khoảng thời gian"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="appearance-none rounded-lg border border-[#C3C6D7] bg-white py-1.5 pl-3 pr-8 text-sm font-semibold text-[#191B23] focus:outline-none"
                >
                  <option>Tất cả thời gian</option>
                  <option>Tháng này</option>
                  <option>Tháng trước</option>
                  <option>3 tháng gần đây</option>
                  <option>6 tháng gần đây</option>
                  <option>Năm nay</option>
                </select>
                <svg className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-[#C3C6D7]" />

            {/* Status filter */}
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-[#434655]">Trạng thái:</span>
              <div className="relative">
                <select
                  aria-label="Lọc theo trạng thái"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TransactionStatus | 'all')}
                  className="appearance-none rounded-full border border-[#C3C6D7] bg-white py-1 pl-3 pr-7 text-sm text-[#191B23] focus:outline-none"
                >
                  {statusFilterOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="shrink-0 text-base font-semibold text-[#004AC6] hover:underline"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          {/* ── Data Table ────────────────────────────────────────────── */}
          <div className="overflow-hidden rounded-xl border border-[#C3C6D7] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                {/* Table head */}
                <thead>
                  <tr className="border-b border-[#C3C6D7] bg-[#F3F3FE]">
                    <th className="px-4 py-4 text-left text-xs font-bold tracking-[0.6px] text-[#434655]">
                      KHÁCH HÀNG
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold tracking-[0.6px] text-[#434655]">
                      TÊN PHÒNG
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-bold tracking-[0.6px] text-[#434655]">
                      TỔNG TIỀN
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold tracking-[0.6px] text-[#434655]">
                      TRẠNG THÁI
                    </th>
                  </tr>
                </thead>

                {/* Table body */}
                <tbody>
                  {paginated.map((txn, idx) => (
                    <tr
                      key={txn.id}
                      onClick={() => router.push(`/host/transactions/${txn.id}`)}
                      className={`cursor-pointer border-b border-[#C3C6D7] transition hover:bg-[#F3F3FE] ${
                        idx === paginated.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      {/* Tenant */}
                      <td className="px-4 py-6">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E1E2ED] text-sm font-bold text-[#434655]">
                            {txn.tenantInitial}
                          </span>
                          <span className="text-base font-semibold leading-5 text-[#191B23]">
                            {txn.tenantName}
                          </span>
                        </div>
                      </td>

                      {/* Room */}
                      <td className="px-4 py-6">
                        <span className="text-base leading-5 text-[#191B23]">
                          {txn.roomTitle}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-6 text-right">
                        <span className="text-base font-bold leading-5 text-[#191B23]">
                          {formatVND(txn.totalAmount)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-6">
                        <StatusBadge status={txn.status} />
                      </td>
                    </tr>
                  ))}

                  {/* Loading / empty state */}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-16 text-center text-base text-[#434655]">
                        {loading ? 'Đang tải giao dịch...' : 'Không tìm thấy giao dịch phù hợp.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between border-t border-[#C3C6D7] px-4 py-3">
              <p className="text-sm text-[#434655]">
                {total === 0
                  ? 'Không có giao dịch'
                  : `Hiển thị ${(currentPage - 1) * ITEMS_PER_PAGE + 1} - ${Math.min(currentPage * ITEMS_PER_PAGE, total)} trong tổng số ${total} giao dịch`}
              </p>

              <div className="flex items-center gap-1">
                {/* Prev */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Trang trước"
                  className="flex h-8 w-8 items-center justify-center rounded text-[#434655] transition hover:bg-[#F3F3FE] disabled:opacity-40"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Page numbers (windowed) */}
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`flex h-8 w-8 items-center justify-center rounded text-sm font-semibold transition ${
                      currentPage === page
                        ? 'bg-[#004AC6] text-white'
                        : 'text-[#191B23] hover:bg-[#F3F3FE]'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                {/* Next */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  aria-label="Trang sau"
                  className="flex h-8 w-8 items-center justify-center rounded text-[#434655] transition hover:bg-[#F3F3FE] disabled:opacity-40"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
