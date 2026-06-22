import Image from 'next/image';
import Link from 'next/link';
import type { BookingRoom } from '@/data/bookingRooms';
import { CheckIcon, HeartIcon, MapPinIcon, StarIcon } from './Icons';

type RoomCardProps = {
  room: BookingRoom;
  featured?: boolean;
  isFavorited?: boolean;
  onToggleFavorite?: (roomId: string, e: React.MouseEvent) => void;
};

export default function RoomCard({ room, featured = false, isFavorited = false, onToggleFavorite }: RoomCardProps) {
  return (
    <Link
      href={`/rooms/${room.id}`}
      className={`group relative block overflow-hidden rounded-xl border border-booking-border/40 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl ${
        featured ? 'min-h-[260px] md:min-h-[300px]' : 'min-h-[260px]'
      }`}
    >
      <Image
        src={room.image}
        alt={room.title}
        fill
        sizes={featured ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 1024px) 33vw, 100vw'}
        className="object-cover transition duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-booking-text/85 via-booking-text/15 to-transparent" />

      <div className="absolute left-4 top-4 flex items-center gap-2">
        {room.verified ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-booking-teal px-2 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-white shadow-sm">
            <CheckIcon className="h-3.5 w-3.5" />
            Đã xác thực
          </span>
        ) : null}
        {room.isNew ? (
          <span className="rounded-md bg-booking-surface px-2 py-1 text-xs font-bold text-booking-text shadow-sm">
            Mới
          </span>
        ) : null}
      </div>

      <button
        type="button"
        aria-label="Lưu phòng"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onToggleFavorite) {
            onToggleFavorite(room.id, e);
          }
        }}
        className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-booking-surface/70 text-booking-text backdrop-blur-sm transition hover:bg-white"
      >
        <HeartIcon 
          className={`h-5 w-5 transition-colors ${isFavorited ? 'text-red-500' : 'text-booking-text'}`} 
          filled={isFavorited}
        />
      </button>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 text-white">
        <div className="min-w-0">
          <h3 className={`${featured ? 'text-lg sm:text-xl' : 'text-base'} truncate font-bold drop-shadow`}>
            {room.title}
          </h3>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-booking-surface/85">
            <span className="flex items-center gap-0.5 font-bold text-yellow-400 drop-shadow">
              <StarIcon className="h-3.5 w-3.5 fill-current" />
              {room.rating || 4.8}
            </span>
            <span className="text-white/40 drop-shadow">•</span>
            <span className="flex items-center gap-1 min-w-0 drop-shadow">
              <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-white/90" />
              <span className="truncate">{room.location}</span>
            </span>
          </div>
        </div>
        <p className="shrink-0 text-right font-bold drop-shadow">
          <span className={featured ? 'text-xl' : 'text-lg'}>{room.priceLabel}</span>
          <span className="text-xs font-normal text-booking-surface/85">/tháng</span>
        </p>
      </div>
    </Link>
  );
}
