import Link from 'next/link';
import type { HostListing, HostListingStatus } from '@/data/hostListings';

interface BookingManageCardProps {
  listing: HostListing;
  /** Called when the host toggles visibility. Receives the desired next state. */
  onToggleVisibility?: (id: string, nextVisible: boolean) => void;
  /** Whether a visibility request is in flight for this listing. */
  toggling?: boolean;
}

const statusStyles: Record<HostListingStatus, string> = {
  active: 'bg-[#86f2e4] text-[#006f66]',
  rented: 'bg-[#e1e2ed] text-booking-muted',
  pending: 'bg-[#bc4800] text-[#ffede6]',
  hidden: 'bg-[#e1e2ed] text-booking-muted',
};

export default function BookingManageCard({ listing, onToggleVisibility, toggling = false }: BookingManageCardProps) {
  // Visibility can only be toggled for listings that are live ('active') or
  // host-hidden ('hidden'). Rented/pending rooms are locked by the system.
  const canToggle = listing.status === 'active' || listing.status === 'hidden';
  const toggleTitle =
    listing.status === 'rented'
      ? 'Phòng đang được thuê — không thể ẩn'
      : listing.status === 'pending'
        ? 'Tin đang chờ duyệt — không thể đổi hiển thị'
        : listing.isVisible
          ? 'Tạm ẩn tin đăng'
          : 'Hiển thị lại tin đăng';
  return (
    <article
      className={`group overflow-hidden rounded-xl border border-booking-border/20 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.12)] ${
        listing.status === 'rented' ? 'opacity-80' : ''
      }`}
    >
      <Link href={`/host/listings/${listing.id}`} className="relative block aspect-[4/3] overflow-hidden" aria-label={`Xem ${listing.title}`}>
        <img src={listing.imageSrc} alt={listing.imageAlt} className="h-full w-full object-cover" />
        {listing.status === 'rented' && <div className="absolute inset-0 bg-white/30 mix-blend-saturation" />}
        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold leading-3 tracking-[0.6px] shadow-sm ${statusStyles[listing.status]}`}
        >
          {listing.status === 'pending' ? (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
          ) : (
            <span className={`h-2 w-2 rounded-full ${listing.status === 'active' ? 'bg-booking-teal' : 'bg-[#737686]'}`} />
          )}
          {listing.statusLabel}
        </span>
      </Link>

      <div className="p-5">
        {/* Title — left-aligned by default; scrolls (marquee) only while the
            card is hovered, and snaps back to the left on mouse-out because the
            animation class is applied only on group-hover. */}
        <Link
          href={`/host/listings/${listing.id}`}
          title={listing.title}
          aria-label={listing.title}
          className="block text-xl font-semibold leading-7 text-booking-text transition hover:text-booking-primary"
        >
          <span className="flex overflow-hidden">
            <span className="flex w-max whitespace-nowrap group-hover:animate-marquee">
              <span className="pr-12">{listing.title}</span>
              <span className="pr-12" aria-hidden="true">{listing.title}</span>
            </span>
          </span>
        </Link>

        {/* Address + rating/favorites (left)  |  price (right) */}
        <div className="mt-3 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 items-center gap-1 text-sm leading-5 text-booking-muted">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-4.6 7-11a7 7 0 1 0-14 0c0 6.4 7 11 7 11z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
              </svg>
              <span className="truncate">{listing.address}</span>
            </p>

            {(listing.rating !== undefined || listing.favoriteCount !== undefined) && (
              <div className="mt-2 flex items-center gap-4 text-sm leading-5">
                {listing.rating !== undefined && (
                  <span className="flex items-center gap-1 font-semibold text-booking-text" title="Đánh giá trung bình">
                    <svg className="h-4 w-4 text-[#f5a623]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 2.5z" />
                    </svg>
                    {listing.rating > 0 ? listing.rating.toFixed(1) : 'Chưa có'}
                  </span>
                )}
                {listing.favoriteCount !== undefined && (
                  <span className="flex items-center gap-1 text-booking-muted" title="Lượt yêu thích">
                    <svg className="h-4 w-4 text-[#e5484d]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21s-6.7-4.3-9.3-8.3C.9 9.8 2.1 6 5.5 6c2 0 3.4 1.2 4.5 2.6C11.1 7.2 12.5 6 14.5 6c3.4 0 4.6 3.8 2.8 6.7C18.7 16.7 12 21 12 21z" />
                    </svg>
                    {listing.favoriteCount}
                  </span>
                )}
              </div>
            )}
          </div>

          <p className="shrink-0 whitespace-nowrap text-right">
            <span className="text-xl font-semibold leading-7 text-booking-primary">{listing.price}</span>
            <span className="text-sm leading-5 text-booking-muted">{listing.priceUnit}</span>
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-booking-border/20 pt-4">
          <button
            type="button"
            onClick={() => canToggle && onToggleVisibility?.(listing.id, !listing.isVisible)}
            disabled={!canToggle || toggling}
            title={toggleTitle}
            aria-label={toggleTitle}
            aria-pressed={listing.isVisible}
            className={`flex items-center gap-2 ${listing.isVisible ? 'text-booking-text' : 'text-booking-muted/55'} ${
              canToggle ? 'cursor-pointer' : 'cursor-not-allowed'
            } ${toggling ? 'opacity-60' : ''}`}
          >
            <span
              className={`relative h-6 w-10 rounded-full border transition ${
                listing.isVisible ? 'border-booking-primary bg-booking-primary' : 'border-[#737686] bg-[#e1e2ed]'
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full transition ${
                  listing.isVisible ? 'left-5 bg-white' : 'left-1 bg-[#737686]'
                }`}
              />
            </span>
            <span className="text-sm leading-5">{toggling ? 'Đang lưu…' : listing.visibilityLabel}</span>
          </button>

          <div className="flex items-center gap-2 text-booking-muted">
            <Link
              href={`/host/listings/${listing.id}/edit?r=${Date.now()}`}
              prefetch={false}
              aria-label={`Chỉnh sửa ${listing.title}`}
              title="Chỉnh sửa"
              className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-[#f3f3fe] hover:text-booking-primary"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.9 4.6l2.5 2.5M5 19l4.8-1 9.3-9.3a1.8 1.8 0 0 0-2.5-2.5l-9.3 9.3L5 19z" />
              </svg>
            </Link>
            <Link
              href={`/host/listings/${listing.id}`}
              aria-label={`Xem trước ${listing.title}`}
              title="Xem trước"
              className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-[#f3f3fe] hover:text-booking-primary"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
