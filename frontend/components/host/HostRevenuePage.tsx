'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import HostSidebar from '@/components/host/HostSidebar';
import {
  formatRevenueVND,
  rangeOptions,
  type RevenueRange,
  type RevenueSettlement,
  type RevenueSummary,
  type RevenueTrendPoint,
} from '@/data/hostRevenue';
import {
  hostRevenueService,
  type RevenueSettlementItem,
} from '@/services/hostRevenueService';

const REVENUE_ITEMS_PER_PAGE = 8;

const EMPTY_SUMMARY: RevenueSummary = {
  totalRevenue: 0,
  paidRevenue: 0,
  pendingSettlement: 0,
  completedOrders: 0,
  growthRate: 0,
  statusBreakdown: { completed: 0, processing: 0, failed: 0 },
};

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  badge?: string;
  tone?: 'primary' | 'warning' | 'neutral';
}

function KpiCard({
  label,
  value,
  description,
  icon,
  iconBg,
  badge,
  tone = 'neutral',
}: KpiCardProps) {
  const valueColor =
    tone === 'primary' ? 'text-[#004AC6]' : tone === 'warning' ? 'text-[#943700]' : 'text-[#191B23]';

  return (
    <article className="flex min-h-[174px] flex-col gap-3 rounded-xl border border-[#C3C6D7] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: iconBg }}
        >
          {icon}
        </span>
        {badge && (
          <span className="rounded-full bg-[rgba(134,242,228,0.2)] px-2 py-1 text-[10px] leading-[15px] text-[#006A61]">
            {badge}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold leading-3 tracking-[0.6px] text-[#434655]">
          {label}
        </p>
        <div className={`text-[32px] font-bold leading-[38px] ${valueColor}`}>
          {value}
        </div>
        <p className="text-sm leading-[21px] text-[#737686]">{description}</p>
      </div>
    </article>
  );
}

function MoneyValue({ amount }: { amount: number }) {
  const formatted = amount.toLocaleString('vi-VN');
  return (
    <span className="inline-flex items-baseline gap-2">
      <span>{formatted}</span>
      <span className="text-xl font-semibold leading-7">đ</span>
    </span>
  );
}

function RevenueTrendChart({ trend }: { trend: RevenueTrendPoint[] }) {
  const maxRevenue = Math.max(1, ...trend.map((point) => point.revenue));

  return (
    <section className="rounded-xl border border-[#C3C6D7] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold leading-7 text-[#191B23]">
          Doanh thu theo tháng (VNĐ)
        </h2>
        <div className="flex items-center gap-4 text-sm leading-[21px] text-[#191B23]">
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-[#004AC6]" />
            Doanh thu
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-[#006A61]" />
            Lợi nhuận
          </span>
        </div>
      </div>

      <div className="mt-8 h-[280px] border-b border-l border-[#C3C6D7] px-4">
        <div className="flex h-full items-end justify-between gap-4 sm:gap-10">
          {trend.map((point) => {
            const height = Math.max(56, Math.round((point.revenue / maxRevenue) * 240));
            const profitHeight = Math.max(28, Math.round((point.profit / maxRevenue) * 240));

            return (
              <div key={point.label} className="group flex min-w-0 flex-1 flex-col items-center">
                <div className="relative flex h-[240px] w-full items-end justify-center">
                  <div
                    className={`w-full max-w-12 rounded-t-sm transition ${
                      point.highlighted ? 'bg-[#004AC6]' : 'bg-[#C7D8F3] group-hover:bg-[#AFC5EC]'
                    }`}
                    style={{ height }}
                    title={`${point.label}: ${formatRevenueVND(point.revenue)}`}
                  />
                  <div
                    className="absolute bottom-0 w-2 rounded-t-sm bg-[#006A61] opacity-0 transition group-hover:opacity-100"
                    style={{ height: profitHeight, right: 'calc(50% - 30px)' }}
                    title={`Lợi nhuận: ${formatRevenueVND(point.profit)}`}
                  />
                </div>
                <span className="mt-4 text-sm font-bold leading-[21px] text-[#737686]">
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-5 text-center text-sm italic leading-[21px] text-[#737686]">
        Biểu đồ thể hiện doanh thu biến động qua 6 tháng gần nhất.
      </p>
    </section>
  );
}

// Line chart — growth trend over the last 6 months (hand-built SVG, no deps).
function RevenueLineChart({ trend }: { trend: RevenueTrendPoint[] }) {
  const W = 600;
  const H = 260;
  const padX = 36;
  const padY = 28;
  const maxRevenue = Math.max(1, ...trend.map((p) => p.revenue));
  const n = trend.length;

  const xFor = (i: number) => (n <= 1 ? padX : padX + (i * (W - 2 * padX)) / (n - 1));
  const yFor = (v: number) => H - padY - (v / maxRevenue) * (H - 2 * padY);

  const linePoints = trend.map((p, i) => `${xFor(i)},${yFor(p.revenue)}`).join(' ');
  const areaPoints = `${xFor(0)},${H - padY} ${linePoints} ${xFor(n - 1)},${H - padY}`;
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <section className="rounded-xl border border-[#C3C6D7] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold leading-7 text-[#191B23]">Xu hướng tăng trưởng</h2>
        <p className="text-sm leading-[21px] text-[#737686]">Doanh thu 6 tháng gần nhất (VNĐ)</p>
      </div>

      <div className="mt-6">
        {trend.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#737686]">Chưa có dữ liệu doanh thu.</p>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Biểu đồ đường xu hướng doanh thu">
            <defs>
              <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#004AC6" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#004AC6" stopOpacity="0" />
              </linearGradient>
            </defs>

            {gridLines.map((g) => {
              const y = padY + g * (H - 2 * padY);
              return <line key={g} x1={padX} y1={y} x2={W - padX} y2={y} stroke="#E2E8F0" strokeWidth="1" />;
            })}

            <polygon points={areaPoints} fill="url(#revArea)" />
            <polyline points={linePoints} fill="none" stroke="#004AC6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {trend.map((p, i) => (
              <g key={p.label}>
                <circle cx={xFor(i)} cy={yFor(p.revenue)} r={p.highlighted ? 5 : 4} fill="#FFFFFF" stroke="#004AC6" strokeWidth="2.5">
                  <title>{`${p.label}: ${formatRevenueVND(p.revenue)}`}</title>
                </circle>
                <text x={xFor(i)} y={H - 8} textAnchor="middle" className="fill-[#737686]" fontSize="12" fontWeight="700">
                  {p.label}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>
    </section>
  );
}

// Donut chart — share of deposits by outcome (completed / processing / failed).
function StatusPieChart({ breakdown }: { breakdown: RevenueSummary['statusBreakdown'] }) {
  const slices = [
    { key: 'completed', label: 'Thành công', value: breakdown.completed, color: '#006A61' },
    { key: 'processing', label: 'Đang xử lý', value: breakdown.processing, color: '#943700' },
    { key: 'failed', label: 'Thất bại', value: breakdown.failed, color: '#BA1A1A' },
  ];
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  // Build the conic-gradient stops only when there is data.
  let acc = 0;
  const stops = slices
    .map((s) => {
      const start = total > 0 ? (acc / total) * 100 : 0;
      acc += s.value;
      const end = total > 0 ? (acc / total) * 100 : 0;
      return `${s.color} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <section className="rounded-xl border border-[#C3C6D7] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold leading-7 text-[#191B23]">Tỷ lệ giao dịch</h2>
        <p className="text-sm leading-[21px] text-[#737686]">Theo kỳ thống kê đã chọn</p>
      </div>

      <div className="mt-6 flex flex-col items-center gap-6">
        <div
          className="relative h-44 w-44 shrink-0 rounded-full"
          style={{ background: total > 0 ? `conic-gradient(${stops})` : '#E2E8F0' }}
        >
          <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
            <span className="text-2xl font-bold leading-7 text-[#191B23]">{total}</span>
            <span className="text-xs text-[#737686]">giao dịch</span>
          </div>
        </div>

        <ul className="w-full space-y-2">
          {slices.map((s) => {
            const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
            return (
              <li key={s.key} className="flex items-center justify-between text-sm leading-5">
                <span className="inline-flex items-center gap-2 text-[#434655]">
                  <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="font-semibold text-[#191B23]">
                  {s.value} <span className="text-[#737686]">({pct}%)</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function SettlementStatusBadge({ status }: { status: RevenueSettlement['status'] }) {
  const label = status === 'completed' ? 'Đã hoàn tất' : 'Đang đối soát';
  const className =
    status === 'completed'
      ? 'bg-[rgba(134,242,228,0.2)] text-[#006A61]'
      : 'bg-[rgba(148,55,0,0.1)] text-[#943700]';

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-4 ${className}`}>
      {label}
    </span>
  );
}

function SettlementTable({
  items,
  total,
  currentPage,
  totalPages,
  loading,
  onPageChange,
}: {
  items: RevenueSettlementItem[];
  total: number;
  currentPage: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  const router = useRouter();

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    for (let p = start; p <= end; p += 1) pages.push(p);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <section className="overflow-hidden rounded-xl border border-[#C3C6D7] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between px-6 py-5">
        <div>
          <h2 className="text-2xl font-semibold leading-8 text-[#191B23]">
            Giao dịch đã thành công
          </h2>
          <p className="mt-1 text-sm leading-[21px] text-[#737686]">
            Nhấn vào một dòng để xem chi tiết giao dịch.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-y border-[#C3C6D7] bg-[#F3F3FE]">
              <th className="px-6 py-4 text-left text-xs font-bold tracking-[0.6px] text-[#434655]">
                Tên phòng
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold tracking-[0.6px] text-[#434655]">
                Khách hàng
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold tracking-[0.6px] text-[#434655]">
                Tổng tiền thanh toán
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold tracking-[0.6px] text-[#434655]">
                Thực nhận
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold tracking-[0.6px] text-[#434655]">
                Phí & Hoa hồng
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold tracking-[0.6px] text-[#434655]">
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((transaction) => (
              <tr
                key={transaction.depositId}
                onClick={() => router.push(`/host/transactions/${encodeURIComponent(transaction.depositId)}`)}
                className="cursor-pointer border-b border-[#C3C6D7] transition hover:bg-[#F3F3FE]"
              >
                <td className="px-6 py-6">
                  <div className="flex items-center gap-4">
                    <img
                      src={transaction.imageSrc}
                      alt={transaction.imageAlt}
                      className="h-10 w-10 rounded-lg object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-base font-medium leading-5 text-[#191B23]">
                        {transaction.roomTitle}
                      </p>
                      <p className="mt-1 text-sm leading-4 text-[#737686]">
                        {transaction.stayPeriod}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-6 text-base leading-5 text-[#191B23]">
                  {transaction.tenantName}
                </td>
                <td className="px-6 py-6 text-right text-base leading-5 text-[#191B23]">
                  {formatRevenueVND(transaction.customerPayment)}
                </td>
                <td className="px-6 py-6 text-right text-base font-medium leading-5 text-[#006A61]">
                  {formatRevenueVND(transaction.netAmount)}
                </td>
                <td className="px-6 py-6 text-right text-base leading-5 text-[#BA1A1A]">
                  {formatRevenueVND(transaction.platformFee)}
                </td>
                <td className="px-6 py-6 text-right">
                  <SettlementStatusBadge status={transaction.status} />
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-base text-[#434655]">
                  {loading ? 'Đang tải giao dịch...' : 'Chưa có giao dịch thành công nào.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 bg-[rgba(243,243,254,0.3)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-[21px] text-[#434655]">
          {total === 0
            ? 'Không có giao dịch'
            : `Hiển thị ${(currentPage - 1) * REVENUE_ITEMS_PER_PAGE + 1} - ${Math.min(currentPage * REVENUE_ITEMS_PER_PAGE, total)} trên tổng số ${total} giao dịch`}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            aria-label="Trang trước"
            className="flex h-10 w-8 items-center justify-center rounded-lg border border-[#C3C6D7] text-[#191B23] transition hover:bg-white disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {pageNumbers.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm transition ${
                currentPage === page
                  ? 'border-[#004AC6] bg-[rgba(37,99,235,0.1)] font-bold text-[#004AC6]'
                  : 'border-[#C3C6D7] text-[#191B23] hover:bg-white'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            aria-label="Trang sau"
            className="flex h-10 w-8 items-center justify-center rounded-lg border border-[#C3C6D7] text-[#191B23] transition hover:bg-white disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

export default function HostRevenuePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [range, setRange] = useState<RevenueRange>('month');
  const [search, setSearch] = useState('');

  // Overview (summary + trend) — refetched when range changes.
  const [summary, setSummary] = useState<RevenueSummary>(EMPTY_SUMMARY);
  const [trend, setTrend] = useState<RevenueTrendPoint[]>([]);

  // Settlement table — paginated + searchable.
  const [settlements, setSettlements] = useState<RevenueSettlementItem[]>([]);
  const [settlementTotal, setSettlementTotal] = useState(0);
  const [settlementPages, setSettlementPages] = useState(1);
  const [settlementPage, setSettlementPage] = useState(1);
  const [settlementLoading, setSettlementLoading] = useState(true);

  const activeRangeLabel = useMemo(
    () => rangeOptions.find((option) => option.value === range)?.label ?? 'Tháng này',
    [range],
  );

  // Fetch overview whenever the range changes.
  useEffect(() => {
    let cancelled = false;
    hostRevenueService
      .getOverview(range)
      .then((res) => {
        if (cancelled || !res.data) return;
        setSummary(res.data.summary);
        setTrend(res.data.trend);
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(EMPTY_SUMMARY);
          setTrend([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  // Reset to first page when the search term changes.
  useEffect(() => {
    setSettlementPage(1);
  }, [search]);

  // Fetch the settlement table (debounced search + pagination).
  useEffect(() => {
    let cancelled = false;
    setSettlementLoading(true);
    const handle = setTimeout(() => {
      hostRevenueService
        .listSettlements({ page: settlementPage, limit: REVENUE_ITEMS_PER_PAGE, search: search.trim() || undefined })
        .then((res) => {
          if (cancelled || !res.data) return;
          setSettlements(res.data.items);
          setSettlementTotal(res.data.pagination.total);
          setSettlementPages(res.data.pagination.totalPages);
        })
        .catch(() => {
          if (!cancelled) {
            setSettlements([]);
            setSettlementTotal(0);
            setSettlementPages(1);
          }
        })
        .finally(() => {
          if (!cancelled) setSettlementLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [search, settlementPage]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [settlementPage]);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await hostRevenueService.exportCsv(search.trim() || undefined);
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: err?.message || 'Không xuất được báo cáo.', type: 'error' },
      }));
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <HostSidebar user={user} onLogout={handleLogout} activePage="revenue" />

      <div className="flex flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[#C3C6D7] bg-[rgba(250,248,255,0.9)] px-6 backdrop-blur-md">
          <div className="relative flex max-w-3xl flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#737686]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm kiếm giao dịch, tên khách hàng..."
              className="h-[39px] w-full rounded-full border border-[#C3C6D7] bg-[#F3F3FE] pl-10 pr-4 text-sm text-[#191B23] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#004AC6]/20"
            />
          </div>

          <div className="ml-6 hidden items-center gap-6 sm:flex">
            <button
              type="button"
              aria-label="Thông báo"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#434655] transition hover:bg-[#E1E2ED]"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 0 0 6 0" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Trợ giúp"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#434655] transition hover:bg-[#E1E2ED]"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.1 9a3 3 0 1 1 4.8 2.4c-.9.6-1.4 1.1-1.4 2.1v.3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </button>
            <div className="h-8 w-px bg-[#C3C6D7]" />
          </div>
        </header>

        <div className="flex flex-col gap-6 p-4 sm:p-6">
          <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-1">
              <nav className="text-sm leading-[21px]" aria-label="Breadcrumb">
                <span className="text-[#737686]">Dashboard</span>
                <span className="px-1 text-[#737686]">/</span>
                <span className="font-semibold text-[#004AC6]">Revenue Statistics</span>
              </nav>
              <h1 className="text-[32px] font-bold leading-[38px] text-[#191B23]">
                Thống kê doanh thu
              </h1>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex rounded-lg border border-[#C3C6D7] bg-[#EDEDF9] p-1">
                {rangeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRange(option.value)}
                    className={`h-9 rounded-md px-5 text-sm leading-[21px] transition ${
                      range === option.value
                        ? 'bg-[#FAF8FF] text-[#004AC6] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                        : 'text-[#434655] hover:bg-white/50'
                    }`}
                    aria-pressed={range === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="flex h-12 items-center justify-center gap-2 rounded-lg border border-[#C3C6D7] bg-white px-6 text-base leading-6 text-[#191B23] shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition hover:bg-[#F3F3FE] disabled:opacity-60"
              >
                <svg className="h-5 w-5 text-[#004AC6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
                </svg>
                {exporting ? 'Đang xuất...' : 'Xuất báo cáo'}
              </button>
            </div>
          </section>

          <section aria-label={`Chỉ số doanh thu ${activeRangeLabel}`} className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Tổng doanh thu (đã hoàn tất)"
              value={<MoneyValue amount={summary.totalRevenue} />}
              description="Tổng thực nhận từ mọi giao dịch hoàn tất"
              iconBg="rgba(0,106,97,0.1)"
              tone="neutral"
              icon={
                <svg className="h-5 w-5 text-[#006A61]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.7 0-3 .9-3 2s1.3 2 3 2 3 .9 3 2-1.3 2-3 2m0-10v1m0 9v1" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              }
            />
            <KpiCard
              label={`Doanh thu thực nhận (${activeRangeLabel})`}
              value={<MoneyValue amount={summary.paidRevenue} />}
              description="Đã được thanh toán vào tài khoản"
              iconBg="rgba(37,99,235,0.1)"
              badge={`+${summary.growthRate}%`}
              tone="primary"
              icon={
                <svg className="h-5 w-5 text-[#004AC6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="5" width="16" height="14" rx="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 9h8M8 13h4M16 13h.01" />
                </svg>
              }
            />
            <KpiCard
              label="Doanh thu đang đối soát"
              value={<MoneyValue amount={summary.pendingSettlement} />}
              description="Đang chờ quản trị viên phê duyệt"
              iconBg="rgba(188,72,0,0.1)"
              tone="warning"
              icon={
                <svg className="h-5 w-5 text-[#943700]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 3h4v4M18 3l-6 6" />
                </svg>
              }
            />
            <KpiCard
              label="Số lượng đơn hoàn tất"
              value={summary.completedOrders}
              description="Trong kỳ thống kê hiện tại"
              iconBg="rgba(134,242,228,0.1)"
              icon={
                <svg className="h-5 w-5 text-[#006A61]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              }
            />
          </section>

          <RevenueTrendChart trend={trend} />

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
            <RevenueLineChart trend={trend} />
            <StatusPieChart breakdown={summary.statusBreakdown} />
          </section>

          <SettlementTable
            items={settlements}
            total={settlementTotal}
            currentPage={settlementPage}
            totalPages={settlementPages}
            loading={settlementLoading}
            onPageChange={setSettlementPage}
          />
        </div>
      </div>
    </main>
  );
}
