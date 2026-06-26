'use client';

import { useEffect, useState } from 'react';
import { hostBookingService, mapToPendingRequest } from '@/services/hostBookingService';
import { formatVND, type PendingRequest } from '@/data/hostDashboard';

/** Pill badge shown next to the pending-requests heading. */
function NewBadge({ count }: { count: number }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold tracking-[0.6px]"
      style={{ background: '#FFDAD6', color: '#93000A' }}
    >
      {count} Mới
    </span>
  );
}

/** Single pending booking request row with approve / reject actions. */
function PendingRequestRow({
  request,
  onApprove,
  onReject,
  disabled,
}: {
  request: PendingRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
      <div className="flex items-center gap-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold"
          style={{ background: request.avatarBg, color: request.avatarColor }}
        >
          {request.tenantInitial}
        </span>
        <div>
          <p className="text-sm font-semibold leading-[21px] text-slate-900">{request.tenantName}</p>
          <p className="text-sm leading-[21px] text-slate-500">
            {request.roomTitle}&nbsp;•&nbsp;Đặt cọc {formatVND(request.depositAmount)}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onApprove(request.id)}
          disabled={disabled}
          className="rounded-lg px-2 py-1 text-base leading-6 text-[#004AC6] transition hover:bg-[#EEF3FF] disabled:opacity-50"
        >
          Duyệt
        </button>
        <button
          type="button"
          onClick={() => onReject(request.id)}
          disabled={disabled}
          className="rounded-lg px-2 py-1 text-base leading-6 text-[#BA1A1A] transition hover:bg-[#FFDAD6] disabled:opacity-50"
        >
          Từ chối
        </button>
      </div>
    </div>
  );
}

/**
 * Shared "Yêu cầu cần duyệt" panel: lists deposits awaiting the host's decision
 * (status CONFIRMED) and lets the host approve / reject. Renders nothing when
 * there are no pending requests. Used on both the Host Overview and the Host
 * Transactions screens.
 *
 * @param onDecision  Called after a successful approve/reject (e.g. to refetch a list).
 * @param className   Extra classes for the outer <section> (e.g. margins).
 */
export default function HostPendingRequests({
  onDecision,
  className = '',
}: {
  onDecision?: () => void;
  className?: string;
}) {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    hostBookingService
      .listDeposits({ status: 'CONFIRMED', limit: 20 })
      .then((depRes) => {
        if (!cancelled) setRequests((depRes.data?.deposits || []).map(mapToPendingRequest));
      })
      .catch(() => {
        if (!cancelled) setRequests([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDecision = async (id: string, decision: 'ACCEPTED' | 'REJECTED') => {
    setProcessingId(id);
    try {
      const reason = decision === 'REJECTED' ? 'Chủ nhà từ chối đơn đặt cọc' : undefined;
      await hostBookingService.updateDepositDecision(id, decision, reason);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      onDecision?.();
    } catch (err: any) {
      alert(err?.message || 'Xử lý yêu cầu thất bại. Vui lòng thử lại.');
    } finally {
      setProcessingId(null);
    }
  };

  if (requests.length === 0) return null;

  return (
    <section
      aria-labelledby="pending-heading"
      className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    >
      <div
        className="absolute inset-x-0 top-0 h-1 rounded-t-xl"
        style={{ background: 'linear-gradient(90deg, #006A61 0%, #004AC6 100%)' }}
      />
      <div className="mt-1 flex items-center gap-2">
        <svg className="h-5 w-5 text-[#006A61]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 0 0 6 0" />
        </svg>
        <h2 id="pending-heading" className="text-lg font-bold text-slate-900">
          Yêu cầu cần duyệt
        </h2>
        <NewBadge count={requests.length} />
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {requests.map((req) => (
          <PendingRequestRow
            key={req.id}
            request={req}
            onApprove={(id) => handleDecision(id, 'ACCEPTED')}
            onReject={(id) => handleDecision(id, 'REJECTED')}
            disabled={processingId === req.id}
          />
        ))}
      </div>
    </section>
  );
}
