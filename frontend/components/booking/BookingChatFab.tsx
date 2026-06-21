'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import ChatWidget from '../common/ChatWidget';

// Lazy-load MapModal — Leaflet cần window object, không SSR được
const MapModal = dynamic(() => import('@/components/guest/MapModal'), { ssr: false });

export default function BookingChatFab() {
  const [showMapTooltip, setShowMapTooltip] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  return (
    <>
      {/* Modal bản đồ — render khi người dùng bấm nút */}
      {isMapOpen && <MapModal onClose={() => setIsMapOpen(false)} />}

      {/* FAB Bản đồ — Nằm trên ChatWidget một chút */}
      <div className="fixed bottom-[96px] right-6 z-50 flex items-center">
        {/* Tooltip */}
        {showMapTooltip && !isMapOpen && (
          <div className="absolute right-16 whitespace-nowrap rounded-xl border border-booking-border bg-white px-3 py-1.5 text-xs font-semibold text-booking-text shadow-lg">
            Phòng trọ gần bạn
          </div>
        )}

        <button
          id="google-maps-fab-btn"
          type="button"
          suppressHydrationWarning
          aria-label="Xem phòng trọ gần bạn trên bản đồ"
          onClick={() => setIsMapOpen(true)}
          onMouseEnter={() => setShowMapTooltip(true)}
          onMouseLeave={() => setShowMapTooltip(false)}
          className={`grid h-12 w-12 place-items-center rounded-full shadow-xl ring-1 transition hover:scale-110 hover:shadow-2xl active:scale-95 ${
            isMapOpen
              ? 'bg-[#1a73e8] ring-[#1a73e8]/30'
              : 'bg-white ring-booking-border'
          }`}
        >
          {/* Pin icon màu Google Maps */}
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
              fill={isMapOpen ? 'white' : '#EA4335'}
            />
            <circle cx="12" cy="9" r="2.5" fill={isMapOpen ? '#1a73e8' : 'white'} />
          </svg>
        </button>
      </div>

      <ChatWidget />
    </>
  );
}
