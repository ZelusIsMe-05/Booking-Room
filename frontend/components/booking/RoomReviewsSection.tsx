'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { reviewService, RoomReview, ReviewReply } from '@/services/reviewService';
import { bookingService } from '@/services/bookingService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RoomReviewsSectionProps {
  roomId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('vi-VN');
}

function getInitials(name: string): string {
  const trimmed = (name || '?').trim();
  const parts = trimmed.split(/\s+/);
  return parts[parts.length - 1].charAt(0).toUpperCase();
}

const BG_COLORS = [
  'bg-indigo-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-violet-500', 'bg-pink-500', 'bg-amber-500', 'bg-teal-500',
];

function getBgColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return BG_COLORS[Math.abs(hash) % BG_COLORS.length];
}

// ---------------------------------------------------------------------------
// StarRow
// ---------------------------------------------------------------------------
function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`h-4 w-4 ${s <= rating ? 'text-yellow-400 fill-current' : 'text-slate-200'}`} viewBox="0 0 24 24">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReviewItem — owns collapse state, calls onSubmitReply via prop
// ---------------------------------------------------------------------------

interface ReviewItemProps {
  rev: RoomReview;
  replies: ReviewReply[];
  submittingReplyId: string | null;   // which review is currently being saved
  activeReplyBoxId: string | null;
  replyContent: string;
  user: any;
  onToggleReplyBox: (id: string) => void;
  onReplyContentChange: (v: string) => void;
  onSubmitReply: (reviewId: string, parentReplyId?: string | null) => Promise<void>;
  onCancelReply: () => void;
  // Edit review props
  editingReviewId: string | null;
  editRating: number;
  editComment: string;
  submittingEditId: string | null;
  onStartEdit: (rev: RoomReview) => void;
  onEditRatingChange: (rating: number) => void;
  onEditCommentChange: (comment: string) => void;
  onSubmitEdit: (reviewId: string) => Promise<void>;
  onCancelEdit: () => void;
  // Edit reply props
  editingReplyId: string | null;
  editReplyContent: string;
  submittingReplyEditId: string | null;
  onStartEditReply: (rep: ReviewReply) => void;
  onEditReplyContentChange: (content: string) => void;
  onSubmitEditReply: (replyId: string) => Promise<void>;
  onCancelEditReply: () => void;
}

function ReviewItem({
  rev,
  replies,
  submittingReplyId,
  activeReplyBoxId,
  replyContent,
  user,
  onToggleReplyBox,
  onReplyContentChange,
  onSubmitReply,
  onCancelReply,
  editingReviewId,
  editRating,
  editComment,
  submittingEditId,
  onStartEdit,
  onEditRatingChange,
  onEditCommentChange,
  onSubmitEdit,
  onCancelEdit,
  editingReplyId,
  editReplyContent,
  submittingReplyEditId,
  onStartEditReply,
  onEditReplyContentChange,
  onSubmitEditReply,
  onCancelEditReply,
}: ReviewItemProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isReplying = activeReplyBoxId === rev.review_id;
  const isSubmitting = submittingReplyId === rev.review_id;

  const isEditing = editingReviewId === rev.review_id;
  const isSubmittingEdit = submittingEditId === rev.review_id;

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
          <div className={`h-8 w-8 shrink-0 flex items-center justify-center rounded-full text-white text-xs font-extrabold ${rep.isHost ? 'bg-slate-800' : getBgColor(rep.authorName)}`}>
            {getInitials(rep.authorName)}
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
              <span className="text-[10px] font-bold text-booking-muted">{formatDate(rep.createdAt)}</span>
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
                onClick={() => onSubmitReply(rev.review_id, rep.id)}
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
      {/* ── Review row ───────────────────────────────── */}
      <div className="flex gap-3">
        {/* Avatar */}
        <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-white font-extrabold text-sm ${getBgColor(rev.reviewer_name)}`}>
          {getInitials(rev.reviewer_name)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-booking-text text-sm">{rev.reviewer_name}</span>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#137333] bg-[#e6f4ea] px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                ✓ Đã xác thực thuê
              </span>
            </div>
            <span className="text-[11px] font-bold text-booking-muted">{formatDate(rev.created_at)}</span>
          </div>

          <StarRow rating={rev.rating} />

          <p className={`text-sm leading-relaxed ${rev.comment ? 'text-booking-text font-medium' : 'text-slate-400 italic font-normal text-xs'}`}>
            {rev.comment || 'Khách thuê chỉ đánh giá số sao.'}
          </p>

          {/* Action row */}
          <div className="flex items-center gap-3 pt-1">
            {user && user.role === 'TENANT' && rev.reviewer_id === user.userId && (
              <button
                type="button"
                onClick={() => isEditing ? onCancelEdit() : onStartEdit(rev)}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
                {isEditing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa'}
              </button>
            )}

            {user && (
              <button
                type="button"
                onClick={() => onToggleReplyBox(rev.review_id)}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#004ac6] hover:underline transition"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6 6-6" />
                </svg>
                {isReplying ? 'Hủy phản hồi' : 'Phản hồi'}
              </button>
            )}

            {replies.length > 0 && (
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 transition"
              >
                <svg
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                </svg>
                {collapsed ? `Hiện ${replies.length} phản hồi` : 'Ẩn phản hồi'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Nested replies (visible by default) ─────── */}
      {rootReplies.length > 0 && !collapsed && (
        <div className="pl-4 mt-3 border-l-2 border-[#004ac6]/20 space-y-3" style={{ marginLeft: '3.25rem' }}>
          {rootReplies.map((rep) => renderReply(rep, 0))}
        </div>
      )}

      {/* ── Inline edit box ──────────────────────────── */}
      {isEditing && (
        <div className="mt-3 space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 animate-in slide-in-from-top-2 duration-150" style={{ marginLeft: '3.25rem' }}>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold text-booking-muted uppercase tracking-wider">Đánh giá số sao</span>
            <div className="flex items-center gap-1.5 h-[28px]">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => onEditRatingChange(star)}
                  className="transition duration-150 transform hover:scale-110 active:scale-95"
                >
                  <svg
                    className={`h-6 w-6 ${star <= editRating ? 'text-yellow-400 fill-current' : 'text-slate-200'}`}
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </button>
              ))}
              {editRating > 0 && (
                <span className="text-[10px] font-extrabold text-[#004ac6] bg-[#004ac6]/5 px-2 py-0.5 rounded-full ml-1">
                  {editRating} sao
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-booking-muted uppercase tracking-wider">
              Nội dung bình luận <span className="text-slate-400 font-normal lowercase">(Tùy chọn)</span>
            </label>
            <textarea
              rows={2}
              value={editComment}
              onChange={(e) => onEditCommentChange(e.target.value)}
              placeholder="Bạn có thể viết thêm nhận xét chi tiết hoặc bỏ trống..."
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-medium outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6]/10 resize-none transition"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancelEdit}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 transition px-3 py-1.5 rounded-lg hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => onSubmitEdit(rev.review_id)}
              disabled={editRating === 0 || isSubmittingEdit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#004ac6] px-4 py-1.5 text-[11px] font-extrabold text-white shadow-sm transition hover:bg-[#003f9e] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmittingEdit ? (
                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12zm0 0h7.5" />
                </svg>
              )}
              {isSubmittingEdit ? 'Đang cập nhật...' : 'Cập nhật'}
            </button>
          </div>
        </div>
      )}

      {/* ── Inline reply box ─────────────────────────── */}
      {isReplying && (
        <div className="mt-3 space-y-2.5 rounded-xl border border-dashed border-[#004ac6]/30 bg-slate-50 p-4 animate-in slide-in-from-top-2 duration-150" style={{ marginLeft: '3.25rem' }}>
          <textarea
            rows={2}
            value={replyContent}
            onChange={(e) => onReplyContentChange(e.target.value)}
            placeholder="Nhập nội dung phản hồi..."
            className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-medium outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6]/10 resize-none transition"
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
                onClick={() => onSubmitReply(rev.review_id)}
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
// Main export
// ---------------------------------------------------------------------------

export default function RoomReviewsSection({ roomId }: RoomReviewsSectionProps) {
  const { user } = useAuth();

  const [reviews, setReviews] = useState<RoomReview[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEligible, setIsEligible] = useState(false);
  const [eligibleDepositId, setEligibleDepositId] = useState<string | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [commentContent, setCommentContent] = useState('');

  // Reply state
  const [activeReplyBoxId, setActiveReplyBoxId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);

  // Edit review state
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number>(0);
  const [editComment, setEditComment] = useState<string>('');
  const [submittingEditId, setSubmittingEditId] = useState<string | null>(null);

  // Edit reply state
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyContent, setEditReplyContent] = useState<string>('');
  const [submittingReplyEditId, setSubmittingReplyEditId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { message: msg, type: 'success' },
      })
    );
  };

  const showErrorToast = (msg: string) => {
    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { message: msg, type: 'error' },
      })
    );
  };

  // ── Fetch reviews (includes replies from API) ─────────────────────────────
  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await reviewService.getRoomReviews(roomId, { limit: 50 });
      if (res?.data?.items) setReviews(res.data.items);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  // ── Check eligibility ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || user.role !== 'TENANT') {
      setIsEligible(false);
      setCheckingEligibility(false);
      return;
    }
    (async () => {
      try {
        setCheckingEligibility(true);
        const res = await bookingService.getMyDeposits({ status: 'ACCEPTED', limit: 100 });
        const match = res?.data?.deposits?.find(
          (dep: any) => String(dep.room_id) === String(roomId) || String(dep.roomId) === String(roomId)
        );
        if (match) {
          setIsEligible(true);
          setEligibleDepositId(match.deposit_id || null);
        } else {
          setIsEligible(false);
          setEligibleDepositId(null);
        }
      } catch {
        setIsEligible(false);
      } finally {
        setCheckingEligibility(false);
      }
    })();
  }, [user, roomId]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / totalReviews).toFixed(1)
    : '0.0';

  const starCounts = [0, 0, 0, 0, 0];
  reviews.forEach((r) => { starCounts[Math.max(1, Math.min(5, Math.round(r.rating || 5))) - 1]++; });

  const pct = (count: number) =>
    totalReviews === 0 ? '0%' : `${((count / totalReviews) * 100).toFixed(0)}%`;

  const hasAlreadyReviewed = reviews.some((r) => user && r.reviewer_id === user.userId);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { showErrorToast('Vui lòng đăng nhập!'); return; }
    if (rating === 0) { showErrorToast('Vui lòng chọn số sao đánh giá!'); return; }
    if (!eligibleDepositId) { showErrorToast('Bạn không có đơn đặt cọc hợp lệ để đánh giá phòng này.'); return; }
    try {
      const res = await reviewService.createReview({
        deposit_id: eligibleDepositId,
        rating,
        comment: commentContent.trim() || undefined,
      });
      if (res?.data) {
        setCommentContent('');
        setRating(0);
        showToast('Đăng đánh giá thành công!');
        fetchReviews();
        setIsEligible(false);
      }
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi gửi đánh giá.');
    }
  };

  const handleStartEdit = (rev: RoomReview) => {
    setEditingReviewId(rev.review_id);
    setEditRating(rev.rating);
    setEditComment(rev.comment || '');
    setActiveReplyBoxId(null); // Close reply box if editing
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setEditRating(0);
    setEditComment('');
  };

  const handleSubmitEdit = async (reviewId: string) => {
    if (editRating === 0) {
      showErrorToast('Vui lòng chọn số sao đánh giá!');
      return;
    }
    setSubmittingEditId(reviewId);
    try {
      await reviewService.updateReview(reviewId, {
        rating: editRating,
        comment: editComment.trim() || undefined,
      });
      setEditingReviewId(null);
      setEditRating(0);
      setEditComment('');
      await fetchReviews();
      showToast('Cập nhật đánh giá thành công!');
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || err.message || 'Có lỗi khi cập nhật đánh giá.');
    } finally {
      setSubmittingEditId(null);
    }
  };

  const handleStartEditReply = (rep: ReviewReply) => {
    setEditingReplyId(rep.id);
    setEditReplyContent(rep.content);
    setActiveReplyBoxId(null); // Close reply box if editing
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
      showErrorToast(err.response?.data?.message || err.message || 'Có lỗi khi cập nhật phản hồi.');
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
      setActiveReplyBoxId(null);
      // Optimistically refresh reviews to pull new reply from DB
      await fetchReviews();
      showToast('Đã gửi phản hồi thành công!');
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || err.message || 'Có lỗi khi gửi phản hồi.');
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const handleToggleReplyBox = (id: string) => {
    if (activeReplyBoxId === id) {
      setActiveReplyBoxId(null);
    } else {
      setActiveReplyBoxId(id);
      setReplyContent('');
      setEditingReplyId(null); // Close edit box if replying
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm space-y-8 mt-6">


      {/* Title */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-extrabold text-booking-text flex items-center gap-2">
          <span>💬</span> Đánh giá &amp; Bình luận từ khách thuê
        </h2>
        <p className="text-xs text-booking-muted mt-1">
          Chỉ những khách thuê đã từng đặt cọc thành công mới được đánh giá phòng này.
        </p>
      </div>

      {/* Rating summary grid */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 bg-[#faf8ff] p-5 rounded-2xl border border-[#004ac6]/5">
        <div className="flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-slate-200/60 pb-5 md:pb-0 md:pr-6">
          <span className="text-5xl font-black text-[#004ac6] tracking-tight">{avgRating}</span>
          <div className="flex items-center gap-0.5 mt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <svg key={s} className={`h-5 w-5 ${s <= Math.round(Number(avgRating)) ? 'text-yellow-400 fill-current' : 'text-slate-200'}`} viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            ))}
          </div>
          <span className="text-xs font-bold text-booking-muted mt-2 uppercase tracking-wider">
            {totalReviews} đánh giá thực tế
          </span>
        </div>
        <div className="flex flex-col justify-center space-y-2.5">
          {[5, 4, 3, 2, 1].map((stars) => (
            <div key={stars} className="flex items-center gap-3 text-xs md:text-sm font-semibold">
              <span className="w-12 text-booking-text font-bold flex items-center gap-1">{stars} sao</span>
              <div className="flex-1 h-2 rounded-full bg-slate-200/80 overflow-hidden">
                <div style={{ width: pct(starCounts[stars - 1]) }} className="h-full bg-[#004ac6] rounded-full transition-all duration-500" />
              </div>
              <span className="w-16 text-right text-booking-muted font-bold">{pct(starCounts[stars - 1])} ({starCounts[stars - 1]})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Write review form */}
      {!user ? (
        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 text-center flex flex-col items-center gap-3">
          <p className="text-sm font-semibold text-booking-muted">
            Vui lòng đăng nhập bằng tài khoản Người thuê để gửi đánh giá.
          </p>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent('show-login-prompt', {
                  detail: { redirectUrl: window.location.href }
                })
              );
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#004ac6] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#003f9e] transition active:scale-95"
          >
            Đăng nhập ngay
          </button>
        </div>
      ) : hasAlreadyReviewed ? (
        <div className="bg-blue-50 border border-blue-100/50 rounded-2xl p-5 text-center">
          <p className="text-sm font-semibold text-[#004ac6]">
            Bạn đã đánh giá phòng này rồi. Bạn có thể chỉnh sửa hoặc thay đổi câu đánh giá của mình ở phần danh sách bình luận phía dưới.
          </p>
        </div>
      ) : checkingEligibility ? (
        <div className="flex items-center justify-center p-6 text-sm text-booking-muted">
          <svg className="animate-spin h-5 w-5 mr-2 text-[#004ac6]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Đang kiểm tra quyền viết đánh giá...
        </div>
      ) : (
        <form
          onSubmit={handleAddReview}
          className={`border border-slate-100 rounded-2xl p-5 bg-white shadow-inner relative ${!isEligible ? 'opacity-50 select-none' : ''}`}
        >
          <fieldset disabled={!isEligible} className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-booking-text text-sm md:text-base flex items-center gap-1.5">
                <span>✍️</span> Viết đánh giá của bạn
              </h3>
              {!isEligible ? (
                <span className="text-xs text-rose-600 font-bold bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full">
                  🔒 Chỉ khả dụng cho khách đã thuê phòng
                </span>
              ) : (
                <span className="text-xs text-booking-muted font-semibold">
                  Đánh giá dưới tên: <strong className="text-booking-text">{user.fullName}</strong>
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-extrabold text-booking-muted uppercase tracking-wider">Đánh giá số sao</span>
              <div className="flex items-center gap-1.5 h-[38px]">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className={`transition duration-150 transform hover:scale-110 active:scale-95 ${!isEligible ? 'cursor-not-allowed' : ''}`}
                  >
                    <svg
                      className={`h-7 w-7 ${star <= (hoverRating || rating) ? 'text-yellow-400 fill-current' : 'text-slate-200'}`}
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  </button>
                ))}
                {rating > 0 && (
                  <span className="text-xs font-extrabold text-[#004ac6] bg-[#004ac6]/5 px-2.5 py-1 rounded-full ml-1.5">
                    {rating} sao
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold text-booking-muted uppercase tracking-wider">
                Nội dung bình luận <span className="text-slate-400 font-normal lowercase">(Tùy chọn)</span>
              </label>
              <textarea
                rows={3}
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Bạn có thể viết thêm nhận xét chi tiết hoặc bỏ trống nếu chỉ muốn đánh giá số sao..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:bg-white focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6]/10 outline-none transition resize-none disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-[#004ac6] hover:bg-[#003f9e] text-white font-extrabold text-xs py-3 px-5 rounded-xl transition shadow-md flex items-center gap-1.5"
              >
                <span>🚀</span> Gửi đánh giá
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {/* Review list */}
      <div className="space-y-6">
        <h3 className="font-extrabold text-booking-text text-sm md:text-base border-b border-slate-100 pb-2">
          Bình luận &amp; Đánh giá ({reviews.length})
        </h3>

        {loading ? (
          <div className="flex justify-center py-10">
            <svg className="animate-spin h-8 w-8 text-[#004ac6]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
            <span className="text-3xl">📭</span>
            <p className="text-sm font-semibold text-booking-muted mt-2">Chưa có đánh giá nào về phòng này.</p>
          </div>
        ) : (
          <ul className="space-y-0 divide-y divide-slate-100">
            {reviews.map((rev) => (
              <ReviewItem
                key={rev.review_id}
                rev={rev}
                replies={rev.replies || []}
                submittingReplyId={submittingReplyId}
                activeReplyBoxId={activeReplyBoxId}
                replyContent={replyContent}
                user={user}
                onToggleReplyBox={handleToggleReplyBox}
                onReplyContentChange={setReplyContent}
                onSubmitReply={handleSubmitReply}
                onCancelReply={() => { setActiveReplyBoxId(null); setReplyContent(''); }}
                editingReviewId={editingReviewId}
                editRating={editRating}
                editComment={editComment}
                submittingEditId={submittingEditId}
                onStartEdit={handleStartEdit}
                onEditRatingChange={setEditRating}
                onEditCommentChange={setEditComment}
                onSubmitEdit={handleSubmitEdit}
                onCancelEdit={handleCancelEdit}
                editingReplyId={editingReplyId}
                editReplyContent={editReplyContent}
                submittingReplyEditId={submittingReplyEditId}
                onStartEditReply={handleStartEditReply}
                onEditReplyContentChange={setEditReplyContent}
                onSubmitEditReply={handleSubmitEditReply}
                onCancelEditReply={handleCancelEditReply}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
