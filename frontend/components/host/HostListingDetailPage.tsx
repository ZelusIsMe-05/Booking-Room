'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import HostSidebar from '@/components/host/HostSidebar';
import RoomDetailView from '@/components/booking/RoomDetailView';
import { hostRoomService, type HostRoom, type RoomReview } from '@/services/hostRoomService';
import { mapBackendRoomToBookingRoom } from '@/services/roomService';

/** Star rating display for review items. */
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

export default function HostListingDetailPage({ listingId }: { listingId: string }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [room, setRoom] = useState<HostRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<RoomReview[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);

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
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  // Reviews are public; fetch independently so a failure doesn't block the page.
  useEffect(() => {
    let cancelled = false;
    hostRoomService
      .getRoomReviews(listingId, { limit: 20 })
      .then((res) => {
        if (cancelled || !res.data) return;
        setReviews(res.data.items || []);
        setReviewsTotal(res.data.total || 0);
      })
      .catch(() => {
        if (!cancelled) {
          setReviews([]);
          setReviewsTotal(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  // Map the host-owned room into the shared booking-detail shape, injecting the
  // current landlord as the "host" so the landlord card shows the real owner.
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

  return (
    <main className="min-h-screen bg-booking-surface font-sans text-booking-text">
      <HostSidebar user={user} onLogout={handleLogout} activePage="listings" />

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
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-booking-text">
                      <svg className="h-5 w-5 text-[#f5a623]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 2.5z" />
                      </svg>
                      Đánh giá ({reviewsTotal})
                    </h2>
                    {rating > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-booking-muted">
                        <StarRating value={rating} />
                        <span className="font-semibold text-booking-text">{rating.toFixed(1)}/5</span>
                      </span>
                    )}
                  </div>

                  {reviews.length === 0 ? (
                    <p className="mt-4 text-sm text-booking-muted">Phòng này chưa có đánh giá nào.</p>
                  ) : (
                    <ul className="mt-5 space-y-5">
                      {reviews.map((rv) => (
                        <li key={rv.review_id} className="border-b border-slate-100 pb-5 last:border-0 last:pb-0">
                          <div className="flex items-center gap-3">
                            {rv.reviewer_avatar ? (
                              <img src={rv.reviewer_avatar} alt={rv.reviewer_name} className="h-10 w-10 rounded-full border border-slate-200 object-cover" />
                            ) : (
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-booking-muted">
                                {rv.reviewer_name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-booking-text">{rv.reviewer_name}</p>
                              <div className="flex items-center gap-2">
                                <StarRating value={rv.rating} />
                                <span className="text-xs text-slate-400">
                                  {new Date(rv.created_at).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                            </div>
                          </div>
                          {rv.comment && <p className="mt-3 whitespace-pre-line text-sm leading-7 text-booking-muted">{rv.comment}</p>}
                        </li>
                      ))}
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

                  {/* Inner Details Container */}
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

                  {/* CTA: Edit — kèm ?r=<timestamp> để trang chỉnh sửa luôn tải dữ liệu mới nhất */}
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

                  {/* Footnote */}
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
