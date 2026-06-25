import Image from 'next/image';
import Link from 'next/link';
import type { BookingRoom } from '@/data/bookingRooms';
import { CheckIcon, HeartIcon, MapPinIcon, StarIcon } from './Icons';
import { useTranslation } from '@/context/LanguageContext';

type RoomCardProps = {
  room: BookingRoom;
  featured?: boolean;
  isFavorited?: boolean;
  onToggleFavorite?: (roomId: string, e: React.MouseEvent) => void;
};

export default function RoomCard({ room, featured = false, isFavorited = false, onToggleFavorite }: RoomCardProps) {
  const { t } = useTranslation();
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
        className={`object-cover transition duration-500 group-hover:scale-105 group-hover:blur-[1px] ${
          room.status?.toUpperCase() === 'RENTED' ? 'grayscale-[40%] brightness-[0.85]' : ''
        }`}
      />
      {room.status?.toUpperCase() === 'RENTED' && (
        <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-booking-text/85 via-booking-text/15 to-transparent transition-opacity duration-300 group-hover:opacity-0" />

      <div className="absolute left-4 top-4 flex items-center gap-2 z-10">
        {room.status?.toUpperCase() === 'RENTED' ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-white shadow-sm">
            {t('roomDetail.roomCardRented')}
          </span>
        ) : null}
        {room.verified ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-booking-teal px-2 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-white shadow-sm">
            <CheckIcon className="h-3.5 w-3.5" />
            {t('roomDetail.roomCardVerified')}
          </span>
        ) : null}
        {room.isNew && room.status?.toUpperCase() !== 'RENTED' ? (
          <span className="rounded-md bg-booking-surface px-2 py-1 text-xs font-bold text-booking-text shadow-sm">
            {t('roomDetail.roomCardNew')}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        aria-label={t('roomDetail.roomCardSave')}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onToggleFavorite) {
            onToggleFavorite(room.id, e);
          }
        }}
        className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-booking-surface/70 text-booking-text backdrop-blur-sm transition hover:bg-white z-10"
      >
        <HeartIcon 
          className={`h-5 w-5 transition-colors ${isFavorited ? 'text-red-500' : 'text-booking-text'}`} 
          filled={isFavorited}
        />
      </button>

      {/* Sliding detailed overlay panel */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-booking-text/95 via-booking-text/80 to-transparent p-4 text-white flex flex-col justify-end transition-all duration-500 ease-in-out h-[98px] group-hover:h-[82%] group-hover:bg-booking-text/95 group-hover:backdrop-blur-md">
        <div className="w-full flex flex-col min-w-0">
          
          {/* Header Row: Title and Price */}
          <div className="flex justify-between items-start gap-2 w-full">
            <h3 className={`font-bold transition-all duration-300 line-clamp-1 group-hover:line-clamp-2 leading-snug drop-shadow min-w-0 flex-1 ${
              featured ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
            }`}>
              {room.title}
            </h3>
            <p className="shrink-0 text-right font-bold drop-shadow text-sm sm:text-base text-white/95">
              <span>{room.priceLabel}</span>
              <span className="text-[10px] font-normal text-booking-surface/80">{t('roomDetail.roomCardPerMonth')}</span>
            </p>
          </div>

          {/* Subheader Row: Star rating & Quick specs */}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-booking-surface/85 min-w-0">
            {room.rating && room.rating > 0 ? (
              <span className="flex items-center gap-0.5 font-bold text-yellow-400 drop-shadow shrink-0 whitespace-nowrap">
                <StarIcon className="h-3.5 w-3.5 fill-current" />
                {room.rating.toFixed(1)}
              </span>
            ) : (
              <span className="flex items-center gap-0.5 font-semibold text-booking-surface/85 drop-shadow shrink-0 whitespace-nowrap">
                <StarIcon className="h-3.5 w-3.5 text-white/50 fill-current" />
                {t('roomDetail.roomCardNoRating')}
              </span>
            )}
            <span className="text-white/40 drop-shadow group-hover:hidden">•</span>
            
            {/* Location (hidden on hover because we show full address below) */}
            <span className="flex items-center gap-1 min-w-0 drop-shadow group-hover:hidden">
              <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-white/90" />
              <span className="truncate">{room.location}</span>
            </span>
          </div>

          {/* Divider (visible on hover) */}
          <hr className="border-white/10 my-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75" />

          {/* Sliding Details Section (visible on hover) */}
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100 h-0 group-hover:h-auto overflow-hidden flex flex-col gap-2 min-w-0">
            {/* Full exact Address */}
            <div className="flex items-start gap-1 text-[11px] sm:text-xs text-white/90">
              <MapPinIcon className="h-4 w-4 shrink-0 text-booking-surface/80" />
              <span className="leading-tight break-words">{room.location}</span>
            </div>

            {/* Room specs (Type, Area) */}
            <div className="text-[11px] sm:text-xs text-booking-teal font-extrabold flex gap-2 items-center">
              <span>🏠 {room.type}</span>
              <span className="text-white/30">•</span>
              <span>📐 {room.area}</span>
            </div>

            {/* Description excerpt */}
            {room.description && (
              <p className="text-[10px] sm:text-[11px] text-white/70 line-clamp-2 italic leading-relaxed break-words">
                {room.description}
              </p>
            )}

            {/* Amenities tags */}
            {room.amenities && room.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {room.amenities.slice(0, 3).map((amenity: string, idx: number) => (
                  <span key={idx} className="text-[9px] bg-white/10 text-white px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                    {amenity}
                  </span>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </Link>
  );
}
