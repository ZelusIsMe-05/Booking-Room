'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import HostSidebar from '@/components/host/HostSidebar';
import RoomDetailView from '@/components/booking/RoomDetailView';
import { hostRoomService, type HostRoom } from '@/services/hostRoomService';
import { reviewService, type ReviewReply, type RoomReview } from '@/services/reviewService';
import { mapBackendRoomToBookingRoom } from '@/services/roomService';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function StarRating({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Đánh giá ${value} trên 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`h-4 w-4 ${i < rounded ? 'text-[#f5a623]' : 'text-[#D7D9E4]'}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 2.5z" />
        </svg>
      ))}
    </span>
  );
}

function statusBadge(room: HostRoom): { label: string; className: string } {
  if (room.status === 'HIDDEN') return { label: 'Đã ẩn', className: 'bg-[#E1E2ED] text-[#434655]' };
  if (room.approval_status === 'PENDING') return { label: 'Chờ duyệt', className: 'bg-[#FFEDE6] text-[#BC4800]' };
  if (room.approval_status === 'REJECTED') return { label: 'Bị từ chối', className: 'bg-[#FFDAD6] text-[#BA1A1A]' };
  if (room.status === 'RENTED') return { label: 'Đã cho thuê', className: 'bg-[#E1E2ED] text-[#434655]' };
  if (room.status === 'LOCKED') return { label: 'Đang giữ chỗ', className: 'bg-[#FFEDE6] text-[#943700]' };
  return { label: 'Đang hoạt động', className: 'bg-[#86F2E4] text-[#006F66]' };
}

function HostIconBar() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-end border-b border-[#E1E2ED] bg-[#FAF8FF] px-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-4 text-[#434655]">
        <button type="button" aria-label="Thông báo" title="Thông báo" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 0 0 6 0" />
          </svg>
        </button>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// HostReviewItem — per-review component with collapse toggle for replies
// ---------------------------------------------------------------------------

interface HostReviewItemProps {
  rv: RoomReview;
  replies: ReviewReply[];
  submittingReplyId: string | null;
  activeReplyBoxId: string | null;
  replyContent: string;
  user: any;
  getInitial: (name: string) => string;
  onToggleReplyBox: (id: string) => void;
  onReplyContentChange: (v: string) => void;
  onSubmitReply: (reviewId: string, parentReplyId?: string | null) => Promise<void>;
  onCancelReply: () => void;
  // Edit reply props
  editingReplyId: string | null;
  editReplyContent: string;
  submittingReplyEditId: string | null;
  onStartEditReply: (rep: ReviewReply) => void;
  onEditReplyContentChange: (content: string) => void;
  onSubmitEditReply: (replyId: string) => Promise<void>;
  onCancelEditReply: () => void;
}

function HostReviewItem({
  rv,
  replies,
  submittingReplyId,
  activeReplyBoxId,
  replyContent,
  user,
  getInitial,
  onToggleReplyBox,
  onReplyContentChange,
  onSubmitReply,
  onCancelReply,
  editingReplyId,
  editReplyContent,
  submittingReplyEditId,
  onStartEditReply,
  onEditReplyContentChange,
  onSubmitEditReply,
  onCancelEditReply,
}: HostReviewItemProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isReplying = activeReplyBoxId === rv.review_id;
  const isSubmitting = submittingReplyId === rv.review_id;

  const replyMap = new Map(replies.map(r => [r.id, r]));
  const rootReplies = replies.filter(r => !r.parentReplyId || !replyMap.has(r.parentReplyId));

  const renderReply = (rep: ReviewReply, depth: number = 0) => {
    const isReplyingThis = activeReplyBoxId === rep.id;
    const isEditingThis = editingReplyId === rep.id;
    const isSubmittingThisReply = submittingReplyId === rep.id;
    const isSubmittingEditThisReply = submittingReplyEditId === rep.id;

    const childReplies = replies.filter(r => r.parentReplyId === rep.id);

    return (
      <div key={rep.id} className="space-y-2">
        <div className="flex gap-2.5 bg-[#f0f4ff] p-3 rounded-xl border border-[#004ac6]/10 animate-in fade-in duration-200">
          <div className={`h-8 w-8 shrink-0 flex items-center justify-center rounded-full text-white text-xs font-extrabold ${rep.isHost ? 'bg-slate-800' : 'bg-indigo-500'}`}>
            {getInitial(rep.authorName)}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-booking-text">{rep.authorName}</span>
                {rep.isHost && (
                  <span className="text-[9px] font-extrabold bg-slate-800 text-white px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Chủ phòng
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-booking-muted">{new Date(rep.createdAt).toLocaleDateString('vi-VN')}</span>
            </div>
            <p className="text-xs leading-relaxed text-booking-muted">{rep.content}</p>

            {/* Action buttons for reply */}
            <div className="flex items-center gap-3 pt-1">
              {user && rep.authorId === user.userId && (
                <button
                  type="button"
                  onClick={() => isEditingThis ? onCancelEditReply() : onStartEditReply(rep)}
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-500 hover:text-slate-800 transition"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                  {isEditingThis ? 'Hủy chỉnh sửa' : 'Chỉnh sửa'}
                </button>
              )}

              {user && (
                <button
                  type="button"
                  onClick={() => onToggleReplyBox(rep.id)}
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#004ac6] hover:underline transition"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6 6-6" />
                  </svg>
                  {isReplyingThis ? 'Hủy phản hồi' : 'Phản hồi'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Inline edit box for reply */}
        {isEditingThis && (
          <div className="space-y-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 ml-2.5 animate-in slide-in-from-top-1 duration-150">
            <textarea
              rows={2}
              value={editReplyContent}
              onChange={(e) => onEditReplyContentChange(e.target.value)}
              placeholder="Nhập nội dung phản hồi mới..."
              className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-medium outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6]/10 resize-none transition"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancelEditReply}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition px-2 py-1"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => onSubmitEditReply(rep.id)}
                disabled={!editReplyContent.trim() || isSubmittingEditThisReply}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#004ac6] px-3 py-1 text-[10px] font-extrabold text-white shadow-sm transition hover:bg-[#003f9e] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmittingEditThisReply && (
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                Lưu
              </button>
            </div>
          </div>
        )}

        {/* Inline reply box for reply */}
        {isReplyingThis && (
          <div className="space-y-2 rounded-xl border border-dashed border-[#004ac6]/30 bg-slate-50 p-3 ml-2.5 animate-in slide-in-from-top-1 duration-150">
            <textarea
              rows={2}
              value={replyContent}
              onChange={(e) => onReplyContentChange(e.target.value)}
              placeholder="Nhập phản hồi..."
              className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-medium outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6]/10 resize-none transition"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancelReply}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition px-2 py-1"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => onSubmitReply(rv.review_id, rep.id)}
                disabled={!replyContent.trim() || isSubmittingThisReply}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#004ac6] px-3 py-1 text-[10px] font-extrabold text-white shadow-sm transition hover:bg-[#003f9e] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmittingThisReply && (
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                Gửi
              </button>
            </div>
          </div>
        )}

        {/* Children replies */}
        {childReplies.length > 0 && (
          <div className="pl-3 border-l-2 border-[#004ac6]/10 space-y-2 mt-2 ml-2">
            {childReplies.map(child => renderReply(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <li className="py-5 first:pt-0 last:pb-0">
      {/* Review row */}
      <div className="flex gap-3">
        {rv.reviewer_avatar ? (
          <img src={rv.reviewer_avatar} alt={rv.reviewer_name} className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover" />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white">
            {getInitial(rv.reviewer_name)}
          </span>
        )}

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-booking-text">{rv.reviewer_name}</span>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#137333] bg-[#e6f4ea] px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                ✓ Đã xác thực thuê
              </span>
            </div>
            <span className="text-[11px] font-bold text-booking-muted">
              {new Date(rv.created_at).toLocaleDateString('vi-VN')}
            </span>
          </div>

          <StarRating value={rv.rating} />

          <p className={`text-sm leading-relaxed ${rv.comment ? 'text-booking-text font-medium' : 'text-slate-400 italic text-xs'}`}>
            {rv.comment || 'Khách thuê chỉ đánh giá số sao.'}
          </p>

          {/* Action row */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onToggleReplyBox(rv.review_id)}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#004ac6] hover:underline transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6 6-6" />
              </svg>
              {isReplying ? 'Hủy phản hồi' : 'Phản hồi'}
            </button>

            {replies.length > 0 && (
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 transition"
              >
                <svg className={`h-3.5 w-3.5 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                </svg>
                {collapsed ? `Hiện ${replies.length} phản hồi` : 'Ẩn phản hồi'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Nested replies (visible by default) */}
      {rootReplies.length > 0 && !collapsed && (
        <div className="pl-4 mt-3 border-l-2 border-[#004ac6]/20 space-y-3" style={{ marginLeft: '3.25rem' }}>
          {rootReplies.map((rep) => renderReply(rep, 0))}
        </div>
      )}

      {/* Inline reply box */}
      {isReplying && (
        <div className="mt-3 space-y-2.5 rounded-xl border border-dashed border-[#004ac6]/30 bg-slate-50 p-4 animate-in slide-in-from-top-2 duration-150" style={{ marginLeft: '3.25rem' }}>
          <textarea
            rows={2}
            value={replyContent}
            onChange={(e) => onReplyContentChange(e.target.value)}
            placeholder="Nhập nội dung phản hồi với tư cách chủ phòng..."
            className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-medium outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6]/10 resize-none transition"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSubmitReply(rv.review_id);
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Ctrl + Enter để gửi</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancelReply}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition px-3 py-1.5 rounded-lg hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => onSubmitReply(rv.review_id)}
                disabled={!replyContent.trim() || isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#004ac6] px-4 py-1.5 text-[11px] font-extrabold text-white shadow-sm transition hover:bg-[#003f9e] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12zm0 0h7.5" />
                  </svg>
                )}
                {isSubmitting ? 'Đang gửi...' : 'Gửi phản hồi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function HostListingDetailPage({ listingId }: { listingId: string }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [room, setRoom] = useState<HostRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<RoomReview[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);

  // Reply state
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Edit reply state
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyContent, setEditReplyContent] = useState<string>('');
  const [submittingReplyEditId, setSubmittingReplyEditId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Fetch reviews via reviewService (includes replies in each item)
  const fetchReviews = async () => {
    try {
      const res = await reviewService.getRoomReviews(listingId, { limit: 20 });
      if (res?.data) {
        setReviews(res.data.items || []);
        setReviewsTotal(res.data.total || 0);
      }
    } catch {
      setReviews([]);
      setReviewsTotal(0);
    }
  };

  // Load room details
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const found = await hostRoomService.getMyRoomById(listingId);
        if (cancelled) return;
        if (!found) {
          setError('Không tìm thấy tin đăng này.');
        } else {
          setRoom(found);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Không tải được tin đăng.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [listingId]);

  // Load reviews (with replies)
  useEffect(() => {
    fetchReviews();
  }, [listingId]);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const handleToggleReplyBox = (id: string) => {
    if (activeReplyId === id) {
      setActiveReplyId(null);
    } else {
      setActiveReplyId(id);
      setReplyContent('');
      setEditingReplyId(null);
    }
  };

  const handleStartEditReply = (rep: ReviewReply) => {
    setEditingReplyId(rep.id);
    setEditReplyContent(rep.content);
    setActiveReplyId(null);
  };

  const handleCancelEditReply = () => {
    setEditingReplyId(null);
    setEditReplyContent('');
  };

  const handleSubmitEditReply = async (replyId: string) => {
    if (!editReplyContent.trim()) return;
    setSubmittingReplyEditId(replyId);
    try {
      await reviewService.updateReply(replyId, editReplyContent.trim());
      setEditingReplyId(null);
      setEditReplyContent('');
      await fetchReviews();
      showToast('Cập nhật phản hồi thành công!');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Có lỗi khi cập nhật phản hồi.');
    } finally {
      setSubmittingReplyEditId(null);
    }
  };

  const handleSubmitReply = async (reviewId: string, parentReplyId?: string | null) => {
    const trimmed = replyContent.trim();
    if (!trimmed) return;
    setSubmittingReplyId(parentReplyId || reviewId);
    try {
      await reviewService.createReply(reviewId, trimmed, parentReplyId);
      setReplyContent('');
      setActiveReplyId(null);
      await fetchReviews();
      showToast('Đã gửi phản hồi thành công!');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Có lỗi khi gửi phản hồi.');
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const bookingRoom = useMemo(() => {
    if (!room) return null;
    const mapped = mapBackendRoomToBookingRoom(room) as any;
    mapped.favoriteCount = Number(room.favorite_count) || 0;
    if (user) {
      mapped.host = {
        userId: user.userId,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl ?? null,
        email: user.email,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt ?? null,
      } as any;
    }
    return mapped;
  }, [room, user]);

  const badge = room ? statusBadge(room) : null;
  const rating = Number(room?.average_rating) || 0;

  const getInitial = (name: string) => {
    const parts = (name || '?').trim().split(/\s+/);
    return parts[parts.length - 1].charAt(0).toUpperCase();
  };

  return (
    <main className="min-h-screen bg-booking-surface font-sans text-booking-text">
      <HostSidebar user={user} onLogout={handleLogout} activePage="listings" />

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-white/20 bg-[#004ac6] px-5 py-3 text-sm font-semibold text-white shadow-lg animate-bounce">
          <span>✅</span> {toastMsg}
        </div>
      )}

      <section className="flex min-h-screen flex-col lg:ml-64">
        <HostIconBar />

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
          <nav className="text-base leading-6" aria-label="Breadcrumb">
            <Link href="/host/listings" className="text-[#434655] hover:text-[#004AC6]">Tin đăng của tôi</Link>
            <span className="px-1 text-[#434655]">›</span>
            <span className="text-[#004AC6]">Chi tiết tin đăng</span>
          </nav>

          {loading ? (
            <div className="rounded-2xl border border-[#C3C6D7] bg-white px-6 py-16 text-center shadow-sm">
              <p className="text-base font-semibold text-[#191B23]">Đang tải tin đăng...</p>
            </div>
          ) : error || !room || !bookingRoom ? (
            <div className="rounded-2xl border border-[#FFDAD6] bg-[#FFF8F7] px-6 py-16 text-center shadow-sm">
              <p className="text-base font-semibold text-[#BA1A1A]">{error || 'Không tìm thấy tin đăng này.'}</p>
              <Link href="/host/listings" className="mt-4 inline-block text-sm font-semibold text-[#004AC6] hover:underline">
                ← Quay lại danh sách
              </Link>
            </div>
          ) : (
            <RoomDetailView
              room={bookingRoom}
              backLink={{ href: '/host/listings', label: 'Quay lại danh sách' }}
              bottomSlot={
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-booking-text">
                      <svg className="h-5 w-5 text-[#f5a623]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 2.5z" />
                      </svg>
                      Đánh giá từ khách thuê ({reviewsTotal})
                    </h2>
                    {rating > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-booking-muted">
                        <StarRating value={rating} />
                        <span className="font-semibold text-booking-text">{rating.toFixed(1)}/5</span>
                      </span>
                    )}
                  </div>

                  {reviews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                      <span className="text-3xl">📭</span>
                      <p className="mt-2 text-sm font-semibold text-booking-muted">Phòng này chưa có đánh giá nào.</p>
                    </div>
                  ) : (
                    <ul className="space-y-0 divide-y divide-slate-100">
                      {reviews.map((rv) => {
                        const replies: ReviewReply[] = rv.replies || [];
                        return (
                          <HostReviewItem
                            key={rv.review_id}
                            rv={rv}
                            replies={replies}
                            submittingReplyId={submittingReplyId}
                            activeReplyBoxId={activeReplyId}
                            replyContent={replyContent}
                            user={user}
                            getInitial={getInitial}
                            onToggleReplyBox={handleToggleReplyBox}
                            onReplyContentChange={setReplyContent}
                            onSubmitReply={handleSubmitReply}
                            onCancelReply={() => { setActiveReplyId(null); setReplyContent(''); }}
                            editingReplyId={editingReplyId}
                            editReplyContent={editReplyContent}
                            submittingReplyEditId={submittingReplyEditId}
                            onStartEditReply={handleStartEditReply}
                            onEditReplyContentChange={setEditReplyContent}
                            onSubmitEditReply={handleSubmitEditReply}
                            onCancelEditReply={handleCancelEditReply}
                          />
                        );
                      })}
                    </ul>
                  )}
                </div>
              }
              sidebar={
                <aside className="lg:sticky lg:top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-md flex flex-col gap-5">
                  <div>
                    <span className="text-2xl md:text-3xl font-extrabold text-booking-text">
                      {Number(room.monthly_rent).toLocaleString('vi-VN')} đ
                    </span>
                    <span className="text-sm font-semibold text-booking-muted"> / tháng</span>
                  </div>

                  <div className="border border-slate-100 rounded-xl overflow-hidden bg-[#faf8ff] p-4 flex flex-col gap-3">
                    <div>
                      <p className="text-[11px] font-bold text-booking-muted uppercase tracking-[0.02em]">Tiền cọc</p>
                      <p className="mt-1 text-sm font-bold text-booking-text">
                        {Number(room.deposit_amount) > 0 ? `${Number(room.deposit_amount).toLocaleString('vi-VN')} đ` : 'Không yêu cầu'}
                      </p>
                    </div>
                    <div className="border-t border-slate-200/50" />
                    <div>
                      <p className="text-[11px] font-bold text-booking-muted uppercase tracking-[0.02em]">Trạng thái</p>
                      {badge && (
                        <span className={`mt-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-xs font-bold leading-4 ${badge.className}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/host/listings/${room.room_id}/edit?r=${Date.now()}`}
                    prefetch={false}
                    className="w-full rounded-xl bg-[#004ac6] hover:bg-[#003f9e] text-white font-bold py-3.5 px-5 flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md shadow-booking-primary/10"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.9 4.6l2.5 2.5M5 19l4.8-1 9.3-9.3a1.8 1.8 0 0 0-2.5-2.5l-9.3 9.3L5 19z" />
                    </svg>
                    Chỉnh sửa
                  </Link>

                  <div className="flex items-center justify-center gap-1 text-[11px] text-booking-muted mt-1 font-medium">
                    <span>Tin đăng của bạn trên Booking-Room</span>
                  </div>
                </aside>
              }
            />
          )}
        </div>
      </section>
    </main>
  );
}
