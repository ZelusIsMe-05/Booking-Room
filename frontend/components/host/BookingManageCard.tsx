import Link from 'next/link';
import type { HostListing, HostListingStatus } from '@/data/hostListings';

interface BookingManageCardProps {
  listing: HostListing;
}

const statusStyles: Record<HostListingStatus, string> = {
  active: 'bg-[#86f2e4] text-[#006f66]',
  rented: 'bg-[#e1e2ed] text-booking-muted',
  pending: 'bg-[#bc4800] text-[#ffede6]',
};

export default function BookingManageCard({ listing }: BookingManageCardProps) {
  return (
    <article
      className={`overflow-hidden rounded-xl border border-booking-border/20 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${
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
        <div className="flex items-start justify-between gap-4">
          <Link
            href={`/host/listings/${listing.id}`}
            className="min-w-0 flex-1 truncate text-xl font-semibold leading-7 text-booking-text transition hover:text-booking-primary"
          >
            {listing.title}
          </Link>
          <p className="shrink-0 whitespace-nowrap pt-0.5">
            <span className="text-xl font-semibold leading-7 text-booking-primary">{listing.price}</span>
            <span className="text-sm leading-5 text-booking-muted">{listing.priceUnit}</span>
          </p>
        </div>

        <p className="mt-3 flex min-w-0 items-center gap-1 text-sm leading-5 text-booking-muted">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-4.6 7-11a7 7 0 1 0-14 0c0 6.4 7 11 7 11z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
          </svg>
          <span className="truncate">{listing.address}</span>
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-booking-border/20 pt-4">
          <div className={`flex items-center gap-2 ${listing.isVisible ? 'text-booking-text' : 'text-booking-muted/55'}`}>
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
            <span className="text-sm leading-5">{listing.visibilityLabel}</span>
          </div>

          <div className="flex items-center gap-2 text-booking-muted">
            <Link
              href={`/host/listings/${listing.id}/edit`}
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
