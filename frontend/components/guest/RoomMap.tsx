'use client';

/**
 * RoomMap.tsx — Bản đồ phòng trọ dùng Leaflet (OpenStreetMap, miễn phí)
 *
 * Tính năng:
 * - Hiển thị marker cho từng phòng có lat/lng
 * - Click marker → popup thông tin phòng
 * - Click trên bản đồ → chọn vị trí tìm kiếm (vẽ vòng tròn bán kính 5km, tìm phòng gần đó)
 * - Nút "Tìm phòng tại đây" → navigate /rooms với nearLat/nearLng
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { BookingRoom } from '@/data/bookingRooms';
import { useTranslation } from '@/context/LanguageContext';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface RoomMapProps {
  rooms: BookingRoom[];
  height?: number;
  defaultCenter?: [number, number];
  defaultZoom?: number;
  /** Tọa độ đang được search (từ URL nearLat/nearLng), để highlight */
  searchCenter?: [number, number] | null;
}

type MapRoom = BookingRoom & { latitude: number | null; longitude: number | null };

export default function RoomMap({
  rooms,
  height = 520,
  defaultCenter = [10.7769, 106.7009],
  defaultZoom = 13,
  searchCenter = null,
}: RoomMapProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const searchCircleRef = useRef<any>(null);
  const searchMarkerRef = useRef<any>(null);
  const [noGeoCount, setNoGeoCount] = useState(0);

  // Selected point state (from click on map)
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [reverseLabel, setReverseLabel] = useState('');

  // Map search bar state
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState<NominatimResult[]>([]);
  const [mapSearchLoading, setMapSearchLoading] = useState(false);
  const mapSearchTimeoutRef = useRef<any>(null);

  const handleMapSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setMapSearchQuery(query);
    if (mapSearchTimeoutRef.current) clearTimeout(mapSearchTimeoutRef.current);
    if (!query.trim()) {
      setMapSearchResults([]);
      return;
    }
    mapSearchTimeoutRef.current = setTimeout(async () => {
      setMapSearchLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Việt Nam')}&format=json&limit=5&accept-language=vi`, { headers: { 'User-Agent': 'BookingRoom/1.0' } });
        const data = await res.json();
        setMapSearchResults(data);
      } catch (err) {}
      setMapSearchLoading(false);
    }, 400);
  };

  const handleSelectMapSearch = (result: NominatimResult) => {
    setMapSearchQuery('');
    setMapSearchResults([]);
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSelectedPoint({ lat, lng });
    const parts = result.display_name.split(', ');
    setReverseLabel(parts.slice(0, 4).join(', '));
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([lat, lng], 15);
    }
  };


  const roomsWithGeo = rooms.filter(
    (r: any) => r.latitude != null && r.longitude != null
  ) as MapRoom[];

  useEffect(() => {
    setNoGeoCount(rooms.length - roomsWithGeo.length);
  }, [rooms.length, roomsWithGeo.length]);

  // Reverse geocode selected point
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`,
        { headers: { 'User-Agent': 'BookingRoom/1.0' } }
      );
      const data = await res.json();
      const parts = (data.display_name || '').split(', ');
      setReverseLabel(parts.slice(0, 4).join(', '));
    } catch {
      setReverseLabel(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  }, []);

  const handleSearchHere = useCallback(() => {
    if (!selectedPoint) return;
    const params = new URLSearchParams();
    if (reverseLabel) params.set('q', reverseLabel);
    params.set('nearLat', String(selectedPoint.lat));
    params.set('nearLng', String(selectedPoint.lng));
    params.set('radiusKm', '5');
    router.push(`/rooms?${params.toString()}`);
  }, [selectedPoint, reverseLabel, router]);

  // Initialize / update map
  useEffect(() => {
    if (!mapRef.current) return;
    let L: any;
    let isMounted = true;

    (async () => {
      L = await import('leaflet');
      if (!isMounted || !mapRef.current) return;

      // Fix Leaflet default icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      // Init map
      if (!leafletMapRef.current) {
        const center: [number, number] = searchCenter ||
          (roomsWithGeo.length > 0
            ? [roomsWithGeo[0].latitude!, roomsWithGeo[0].longitude!]
            : defaultCenter);

        leafletMapRef.current = L.map(mapRef.current, {
          center,
          zoom: defaultZoom,
          zoomControl: true,
          scrollWheelZoom: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(leafletMapRef.current);

        // ── Click on map to select search point ──────────────────────────────
        leafletMapRef.current.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          setSelectedPoint({ lat, lng });
          setReverseLabel('');
          reverseGeocode(lat, lng);
        });
      }

      // Remove old room markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // Remove old search circle/marker
      if (searchCircleRef.current) { searchCircleRef.current.remove(); searchCircleRef.current = null; }
      if (searchMarkerRef.current) { searchMarkerRef.current.remove(); searchMarkerRef.current = null; }

      // Draw search radius circle (if coming from URL searchCenter)
      if (searchCenter) {
        searchCircleRef.current = L.circle(searchCenter, {
          radius: 5000, // 5km
          color: '#004AC6',
          fillColor: '#004AC6',
          fillOpacity: 0.07,
          weight: 2,
          dashArray: '6 4',
        }).addTo(leafletMapRef.current);

        searchMarkerRef.current = L.marker(searchCenter, {
          icon: L.divIcon({
            className: '',
            html: `<div style="
              background:#004AC6;color:white;font-size:11px;font-weight:700;
              padding:4px 10px;border-radius:20px;white-space:nowrap;
              box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white;
              transform:translateX(-50%);display:inline-block;
            ">${t('roomDetail.mapSearchLocation')}</div>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          }),
        }).addTo(leafletMapRef.current);

        leafletMapRef.current.setView(searchCenter, 14);
      }

      // Add room markers
      roomsWithGeo.forEach((room) => {
        const priceLabel = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(room.price) + 'đ';

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              background:#004AC6;color:white;font-size:11px;font-weight:700;
              padding:4px 8px;border-radius:20px;white-space:nowrap;
              box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white;
              cursor:pointer;transform:translateX(-50%);display:inline-block;
            ">${priceLabel}${t('roomDetail.mapPerMonth')}</div>
            <div style="
              width:0;height:0;
              border-left:6px solid transparent;border-right:6px solid transparent;
              border-top:8px solid #004AC6;
              margin:0 auto;transform:translateX(calc(-50% + 6px));
            "></div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        const popup = L.popup({ maxWidth: 280 }).setContent(`
          <div style="padding:4px 0;min-width:220px">
            ${room.image ? `<img src="${room.image}" alt="${room.title}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px" onerror="this.style.display='none'" />` : ''}
            <div style="font-weight:700;font-size:13px;color:#191B23;margin-bottom:4px;line-height:1.4">${room.title}</div>
            <div style="font-size:11px;color:#6B7280;margin-bottom:6px">${room.location || ''}</div>
            <div style="font-weight:800;font-size:15px;color:#004AC6;margin-bottom:8px">
              ${new Intl.NumberFormat('vi-VN').format(room.price)}đ<span style="font-size:11px;font-weight:400;color:#6B7280">/tháng</span>
            </div>
            <a href="/rooms/${room.id}" style="
              display:block;text-align:center;background:#004AC6;color:white;
              padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none
            ">${t('roomDetail.mapViewDetail')}</a>
          </div>
        `);

        const marker = L.marker([room.latitude!, room.longitude!], { icon })
          .addTo(leafletMapRef.current!)
          .bindPopup(popup);

        markersRef.current.push(marker);
      });

      // Fit bounds
      if (!searchCenter && roomsWithGeo.length > 1) {
        const bounds = L.latLngBounds(
          roomsWithGeo.map((r) => [r.latitude!, r.longitude!] as [number, number])
        );
        leafletMapRef.current.fitBounds(bounds, { padding: [40, 40] });
      }
    })();

    return () => { isMounted = false; };
  }, [rooms, roomsWithGeo, defaultCenter, defaultZoom, searchCenter, reverseGeocode]);

  // Draw selected point marker on map (click event)
  useEffect(() => {
    if (!leafletMapRef.current || !selectedPoint) return;
    (async () => {
      const L = await import('leaflet');
      // Remove old clicked marker
      if ((leafletMapRef.current as any)._clickedMarker) {
        (leafletMapRef.current as any)._clickedMarker.remove();
      }
      if ((leafletMapRef.current as any)._clickedCircle) {
        (leafletMapRef.current as any)._clickedCircle.remove();
      }

      const clickedMarker = L.marker([selectedPoint.lat, selectedPoint.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="
            width:14px;height:14px;background:#E63946;border:3px solid white;
            border-radius:50%;box-shadow:0 0 0 3px rgba(230,57,70,0.3);
            transform:translate(-50%,-50%);
          "></div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
      }).addTo(leafletMapRef.current);

      const clickedCircle = L.circle([selectedPoint.lat, selectedPoint.lng], {
        radius: 5000,
        color: '#E63946',
        fillColor: '#E63946',
        fillOpacity: 0.06,
        weight: 2,
        dashArray: '6 4',
      }).addTo(leafletMapRef.current);

      (leafletMapRef.current as any)._clickedMarker = clickedMarker;
      (leafletMapRef.current as any)._clickedCircle = clickedCircle;
    })();
  }, [selectedPoint]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-booking-border shadow-sm">
      {/* Instruction overlay */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm border border-booking-border rounded-xl px-3 py-1.5 text-xs font-medium text-booking-muted shadow-sm pointer-events-none whitespace-nowrap">
        {t('roomDetail.mapClickOnMap')}
      </div>

      {/* Room count badge */}
      {roomsWithGeo.length > 0 && (
        <div className="absolute top-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm border border-booking-border rounded-xl px-3 py-1.5 text-xs font-semibold text-booking-text shadow-sm">
          {t('roomDetail.mapRoomCount').replace('{{count}}', String(roomsWithGeo.length))}
        </div>
      )}

      {/* Map Search Bar */}
      <div className="absolute top-3 right-3 z-[1000] w-[300px] max-w-[calc(100vw-32px)]">
        <div className="relative flex items-center bg-white rounded-xl shadow-md border border-booking-border overflow-hidden focus-within:ring-2 focus-within:ring-booking-primary/20 transition-all duration-200">
          {/* Search icon */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-booking-muted pointer-events-none">
            {mapSearchLoading ? (
              <svg className="h-4 w-4 animate-spin text-booking-primary" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>
          <input
            type="text"
            value={mapSearchQuery}
            onChange={handleMapSearchInput}
            placeholder={t('roomDetail.mapSearchBarPlaceholder')}
            className="w-full py-2.5 pl-10 pr-9 text-sm text-booking-text outline-none bg-transparent"
          />
          {/* Clear button */}
          {mapSearchQuery && (
            <button
              type="button"
              onClick={() => { setMapSearchQuery(''); setMapSearchResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={t('roomDetail.mapClearSearch')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Suggestions dropdown — max 3 items visible, scroll for more */}
        {mapSearchResults.length > 0 && (
          <div className="absolute top-full right-0 left-0 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
               style={{ zIndex: 9999 }}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-100">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {t('roomDetail.mapPlaces').replace('{{count}}', String(mapSearchResults.length))}
              </span>
              {mapSearchResults.length > 3 && (
                <span className="text-[10px] text-gray-400">{t('roomDetail.mapSuggestScroll')}</span>
              )}
            </div>

            {/* Scrollable list — 3 items max visible (each ~68px), rest scroll */}
            <ul
              className="divide-y divide-gray-50 overflow-y-auto"
              style={{ maxHeight: '204px' }}
            >
              {mapSearchResults.map((res, idx) => {
                const nameParts = res.display_name.split(', ');
                const primaryName = nameParts[0];
                const secondaryName = nameParts.slice(1, 4).join(', ');
                return (
                  <li key={res.place_id}>
                    <button
                      type="button"
                      onClick={() => handleSelectMapSearch(res)}
                      className="w-full text-left px-3 py-2.5 hover:bg-blue-50 active:bg-blue-100 transition-colors duration-150 cursor-pointer flex items-start gap-2.5 group"
                    >
                      {/* Pin icon */}
                      <span className="shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 group-hover:bg-blue-100 transition-colors">
                        <svg className="w-3 h-3 text-gray-500 group-hover:text-booking-primary transition-colors" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
                        </svg>
                      </span>

                      {/* Text */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 group-hover:text-booking-primary truncate leading-snug transition-colors">
                          {primaryName}
                        </p>
                        {secondaryName && (
                          <p className="text-xs text-gray-400 truncate mt-0.5 leading-snug">
                            {secondaryName}
                          </p>
                        )}
                      </div>

                      {/* Arrow */}
                      <svg className="shrink-0 w-3.5 h-3.5 mt-1 text-gray-300 group-hover:text-booking-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Leaflet map */}
      <div ref={mapRef} style={{ height, width: '100%' }} />

      {/* Selected point panel */}
      {selectedPoint && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 bg-white rounded-2xl border border-booking-border shadow-xl px-4 py-3 max-w-[90vw]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-3 w-3 shrink-0 rounded-full bg-[#E63946]" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-booking-text">{t('roomDetail.mapSelectedPoint')}</p>
              <p className="truncate text-xs text-booking-muted max-w-[200px]">
                {reverseLabel || `${selectedPoint.lat.toFixed(5)}, ${selectedPoint.lng.toFixed(5)}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSearchHere}
            className="shrink-0 rounded-xl bg-booking-primary px-4 py-2 text-xs font-bold text-white hover:bg-booking-primaryDark transition shadow-sm"
          >
            {t('roomDetail.mapSearchHere')}
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedPoint(null);
              if (leafletMapRef.current) {
                if ((leafletMapRef.current as any)._clickedMarker) {
                  (leafletMapRef.current as any)._clickedMarker.remove();
                }
                if ((leafletMapRef.current as any)._clickedCircle) {
                  (leafletMapRef.current as any)._clickedCircle.remove();
                }
              }
            }}
            className="shrink-0 text-booking-muted hover:text-red-500 transition font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Warning: rooms without coords */}
      {noGeoCount > 0 && !selectedPoint && (
        <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800 font-medium text-center shadow-sm">
          {t('roomDetail.mapNoGeoWarning').replace('{{count}}', String(noGeoCount))}
        </div>
      )}

      {/* Empty state */}
      {roomsWithGeo.length === 0 && rooms.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-[1000]">
          <div className="text-center text-booking-muted">
            <div className="text-3xl mb-2">🗺️</div>
            <p className="font-medium text-sm">{t('roomDetail.mapEmptyTitle')}</p>
            <p className="text-xs mt-1">{t('roomDetail.mapEmptyHint')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
