'use client';

/**
 * MapModal.tsx — Modal bản đồ toàn màn hình
 *
 * Hiển thị phòng trọ từ DATABASE quanh vị trí người dùng hoặc địa chỉ nhập tay.
 * Dùng Leaflet + OpenStreetMap (miễn phí).
 *
 * Tính năng:
 *   - Tự động xin Geolocation khi mở
 *   - Ô tìm kiếm địa chỉ thủ công (geocode qua Nominatim OSM)
 *   - Nút "Vị trí của tôi" quay lại GPS
 *   - Fetch phòng từ DB theo nearLat/nearLng + bán kính 2/5/10/20km
 *   - Sidebar danh sách phòng (desktop)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { roomService, mapBackendRoomToBookingRoom } from '@/services/roomService';
import type { BookingRoom } from '@/data/bookingRooms';
import { useTranslation } from '@/context/LanguageContext';

interface MapModalProps {
  onClose: () => void;
}

type MapRoom = BookingRoom & { latitude: number | null; longitude: number | null };

const DEFAULT_CENTER: [number, number] = [10.7769, 106.7009]; // TP. HCM
const DEFAULT_RADIUS_KM = 5;
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

type LoadState = 'locating' | 'fetching' | 'ready' | 'error';

/** Geocode địa chỉ tiếng Việt qua Nominatim OSM (client-side, miễn phí) */
async function geocodeAddressClient(address: string): Promise<[number, number] | null> {
  try {
    const url = new URL(NOMINATIM_SEARCH_URL);
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'vn');

    const res = await fetch(url.toString(), {
      headers: { 'Accept-Language': 'vi,en' },
    });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {
    return null;
  }
}

export default function MapModal({ onClose }: MapModalProps) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  const [rooms, setRooms] = useState<MapRoom[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('locating');
  const [errorMsg, setErrorMsg] = useState('');
  const [gpsPos, setGpsPos] = useState<[number, number] | null>(null);
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);

  // Ô tìm kiếm địa chỉ
  const [searchInput, setSearchInput] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Đề xuất địa chỉ
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const suggestTimeoutRef = useRef<any>(null);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    setSearchError('');
    if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);
    if (!val.trim()) {
      setSuggestions([]);
      return;
    }
    suggestTimeoutRef.current = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const url = new URL(NOMINATIM_SEARCH_URL);
        url.searchParams.set('q', val + ', Việt Nam');
        url.searchParams.set('format', 'json');
        url.searchParams.set('limit', '5');
        url.searchParams.set('accept-language', 'vi');
        const res = await fetch(url.toString(), { headers: { 'User-Agent': 'BookingRoom/1.0' } });
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {}
      setIsSuggesting(false);
    }, 400);
  };

  const handleSelectSuggestion = async (res: any) => {
    const displayName = res.display_name || '';
    setSearchInput(displayName.split(', ')[0]);
    setSuggestions([]);
    
    setSearchLoading(true);
    setSearchError('');
    const lat = parseFloat(res.lat);
    const lng = parseFloat(res.lon);
    
    setCurrentCenter([lat, lng]);
    await updateCenterMarker([lat, lng], radiusKm, false);
    await fetchNearbyRooms(lat, lng, radiusKm);
    
    setSearchLoading(false);
  };

  // Đóng modal khi bấm Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Khởi tạo Leaflet map ──
  const initMap = useCallback(async (center: [number, number]) => {
    if (!mapRef.current || leafletMapRef.current) return null;

    const L = await import('leaflet');

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });

    leafletMapRef.current = L.map(mapRef.current, {
      center,
      zoom: 14,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(leafletMapRef.current);

    return L;
  }, []);

  // ── Cập nhật marker vị trí trung tâm + vòng tròn bán kính ──
  const updateCenterMarker = useCallback(async (pos: [number, number], km: number, isGps: boolean) => {
    const L = await import('leaflet');
    if (!leafletMapRef.current) return;

    // Xóa marker cũ
    if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
    if (circleRef.current) { circleRef.current.remove(); circleRef.current = null; }

    // Marker vị trí
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:16px;height:16px;border-radius:50%;
        background:${isGps ? '#1a73e8' : '#16a34a'};
        border:3px solid white;
        box-shadow:0 0 0 3px ${isGps ? 'rgba(26,115,232,0.3)' : 'rgba(22,163,74,0.3)'};
      "></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    userMarkerRef.current = L.marker(pos, { icon })
      .addTo(leafletMapRef.current)
      .bindPopup(`<strong>${isGps ? t('roomDetail.mapGpsPopup') : t('roomDetail.mapSearchPopup')}</strong>`);

    // Vòng tròn bán kính
    circleRef.current = L.circle(pos, {
      radius: km * 1000,
      color: isGps ? '#1a73e8' : '#16a34a',
      fillColor: isGps ? '#1a73e8' : '#16a34a',
      fillOpacity: 0.05,
      weight: 1.5,
      dashArray: '6 4',
    }).addTo(leafletMapRef.current);

    // Pan map đến vị trí mới
    leafletMapRef.current.setView(pos, leafletMapRef.current.getZoom());
  }, []);

  // ── Render room markers ──
  const renderRoomMarkers = useCallback(async (roomList: MapRoom[]) => {
    if (!leafletMapRef.current) return;
    const L = await import('leaflet');

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    roomList
      .filter((r: any) => r.latitude != null && r.longitude != null)
      .forEach((room) => {
        const priceLabel = new Intl.NumberFormat('vi-VN', {
          notation: 'compact',
          maximumFractionDigits: 1,
        }).format(room.price) + 'đ';

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              background:#004AC6;color:white;font-size:11px;font-weight:700;
              padding:4px 9px;border-radius:20px;white-space:nowrap;
              box-shadow:0 2px 8px rgba(0,0,0,0.25);border:2px solid white;
              cursor:pointer;transform:translateX(-50%);display:inline-block;
            ">${priceLabel}${t('roomDetail.mapPerMonth')}</div>
            <div style="
              width:0;height:0;border-left:6px solid transparent;
              border-right:6px solid transparent;border-top:8px solid #004AC6;
              margin:0 auto;transform:translateX(calc(-50% + 6px));
            "></div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        const imgHtml = room.image
          ? `<img src="${room.image}" alt="${room.title}"
              style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px"
              onerror="this.style.display='none'" />`
          : '';

        const popup = L.popup({ maxWidth: 260 }).setContent(`
          <div style="padding:2px 0;min-width:210px;font-family:system-ui,sans-serif">
            ${imgHtml}
            <div style="font-weight:700;font-size:13px;color:#191B23;margin-bottom:3px;line-height:1.4">${room.title}</div>
            <div style="font-size:11px;color:#6B7280;margin-bottom:5px">📍 ${room.location || ''}</div>
            <div style="font-size:12px;color:#555;margin-bottom:2px">🏠 ${room.type || ''} &nbsp;·&nbsp; ⭐ ${room.rating?.toFixed(1) || '–'}</div>
            <div style="font-weight:800;font-size:16px;color:#004AC6;margin:6px 0 10px">
              ${new Intl.NumberFormat('vi-VN').format(room.price)}đ
              <span style="font-size:11px;font-weight:400;color:#6B7280">/tháng</span>
            </div>
            <a href="/rooms/${room.id}" style="
              display:block;text-align:center;background:#004AC6;color:white;
              padding:7px 12px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none">
              ${t('roomDetail.mapViewDetail')}
            </a>
          </div>
        `);

        const marker = L.marker([(room as any).latitude!, (room as any).longitude!], { icon })
          .addTo(leafletMapRef.current!)
          .bindPopup(popup);
        markersRef.current.push(marker);
      });
  }, []);

  // ── Fetch phòng từ DB ──
  const fetchNearbyRooms = useCallback(async (lat: number, lng: number, km: number) => {
    setLoadState('fetching');
    setErrorMsg('');
    try {
      const res = await roomService.listRooms({ nearLat: lat, nearLng: lng, radiusKm: km, limit: 50 });
      if (res?.data) {
        const items = (res.data.items || []).map((r: any, i: number) =>
          mapBackendRoomToBookingRoom(r, i)
        ) as MapRoom[];
        setRooms(items);
        await renderRoomMarkers(items);
        setLoadState('ready');
      } else {
        setErrorMsg(t('roomDetail.mapCannotLoad'));
        setLoadState('error');
      }
    } catch {
      setErrorMsg(t('roomDetail.mapConnError'));
      setLoadState('error');
    }
  }, [renderRoomMarkers, t]);

  const radiusKmRef = useRef(radiusKm);
  useEffect(() => {
    radiusKmRef.current = radiusKm;
  }, [radiusKm]);

  // ── Khởi động: xin GPS → init map → fetch phòng ──
  useEffect(() => {
    let isMounted = true;

    async function start() {
      let center: [number, number] = DEFAULT_CENTER;
      let isGps = false;

      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 })
          );
          if (!isMounted) return;
          center = [pos.coords.latitude, pos.coords.longitude];
          isGps = true;
          setGpsPos(center);
        } catch { /* dùng default HCM */ }
      }

      if (!isMounted) return;
      setCurrentCenter(center);

      await initMap(center);
      if (!isMounted) return;

      // ── Click on map to select search point ──
      if (leafletMapRef.current) {
        leafletMapRef.current.on('click', async (e: any) => {
          const { lat, lng } = e.latlng;
          setSearchLoading(true);
          setSearchInput(`${lat.toFixed(5)}, ${lng.toFixed(5)}`); // Hiển thị tạm trong lúc load
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`, { headers: { 'User-Agent': 'BookingRoom/1.0' } });
            const data = await res.json();
            if (data && data.display_name) {
              setSearchInput(data.display_name.split(', ')[0]);
            }
          } catch {
            // keep the coord string
          }
          setSearchLoading(false);
          setCurrentCenter([lat, lng]);
          await updateCenterMarker([lat, lng], radiusKmRef.current, false);
          await fetchNearbyRooms(lat, lng, radiusKmRef.current);
        });
      }

      await updateCenterMarker(center, DEFAULT_RADIUS_KM, isGps);
      await fetchNearbyRooms(center[0], center[1], DEFAULT_RADIUS_KM);
    }

    start();
    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Đổi bán kính ──
  const handleRadiusChange = async (newKm: number) => {
    setRadiusKm(newKm);
    await updateCenterMarker(currentCenter, newKm, currentCenter === gpsPos);
    await fetchNearbyRooms(currentCenter[0], currentCenter[1], newKm);
  };

  // ── Tìm kiếm địa chỉ thủ công ──
  const handleAddressSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = searchInput.trim();
    if (!q) return;

    setSearchLoading(true);
    setSearchError('');

    const coords = await geocodeAddressClient(q);
    setSearchLoading(false);

    if (!coords) {
      setSearchError(t('roomDetail.mapAddressNotFound'));
      return;
    }

    setCurrentCenter(coords);
    await updateCenterMarker(coords, radiusKm, false);
    await fetchNearbyRooms(coords[0], coords[1], radiusKm);
  };

  // ── Quay về GPS ──
  const handleReturnToGps = async () => {
    if (!gpsPos) return;
    setSearchInput('');
    setSearchError('');
    setCurrentCenter(gpsPos);
    await updateCenterMarker(gpsPos, radiusKm, true);
    await fetchNearbyRooms(gpsPos[0], gpsPos[1], radiusKm);
  };

  const roomsOnMap = rooms.filter((r: any) => r.latitude != null);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-x-3 bottom-3 top-3 z-[9999] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:inset-x-6 sm:bottom-6 sm:top-6 md:inset-x-10 lg:inset-x-16">

        {/* ── Header ── */}
        <div className="shrink-0 border-b border-gray-100 px-4 py-3">
          {/* Row 1: tiêu đề + bán kính + đóng */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335" />
                <circle cx="12" cy="9" r="2.8" fill="white" />
              </svg>
              <div>
                <h2 className="text-sm font-bold leading-none text-gray-900">{t('roomDetail.mapTitle')}</h2>
                {loadState === 'ready' && (
                  <p className="mt-0.5 text-xs text-gray-500">{t('roomDetail.mapRoomsInRadius').replace('{{count}}', String(roomsOnMap.length)).replace('{{radius}}', String(radiusKm))}</p>
                )}
                {(loadState === 'locating' || loadState === 'fetching') && (
                  <p className="mt-0.5 text-xs text-blue-500 animate-pulse">
                    {loadState === 'locating' ? t('roomDetail.mapLocating') : t('roomDetail.mapFetching')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Bán kính */}
              <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-2 py-1">
                <span className="text-[11px] text-gray-500 font-medium hidden sm:block">{t('roomDetail.mapRadius')}</span>
                {[2, 5, 10, 20].map((km) => (
                  <button
                    key={km}
                    onClick={() => handleRadiusChange(km)}
                    className={`rounded-lg px-2 py-0.5 text-xs font-semibold transition ${radiusKm === km ? 'bg-[#004AC6] text-white' : 'text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {km}km
                  </button>
                ))}
              </div>

              {/* Đóng */}
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
                aria-label={t('roomDetail.mapCloseBtn')}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Row 2: Ô tìm kiếm địa chỉ */}
          <form onSubmit={handleAddressSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              {/* Icon kính lúp */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                {isSuggesting ? (
                  <span className="flex h-4 w-4 rounded-full border-2 border-[#004AC6] border-t-transparent animate-spin" />
                ) : (
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchInputChange}
                placeholder={t('roomDetail.mapSearchPlaceholder')}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:border-[#004AC6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004AC6]/20 transition"
              />
              {/* Đề xuất dropdown */}
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
                     style={{ zIndex: 9999 }}>
                  <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      {t('roomDetail.mapPlaces').replace('{{count}}', String(suggestions.length))}
                    </span>
                    {suggestions.length > 3 && (
                      <span className="text-[10px] text-gray-400">{t('roomDetail.mapSuggestScroll')}</span>
                    )}
                  </div>
                  <ul className="divide-y divide-gray-50 overflow-y-auto" style={{ maxHeight: '204px' }}>
                    {suggestions.map((res: any) => {
                      const nameParts = (res.display_name || '').split(', ');
                      const primaryName = nameParts[0] || '';
                      const secondaryName = nameParts.slice(1, 4).join(', ');
                      return (
                        <li key={res.place_id}>
                          <button
                            type="button"
                            onClick={() => handleSelectSuggestion(res)}
                            className="w-full text-left px-3 py-2.5 hover:bg-blue-50 active:bg-blue-100 transition-colors duration-150 cursor-pointer flex items-start gap-2.5 group"
                          >
                            <span className="shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 group-hover:bg-blue-100 transition-colors">
                              <svg className="w-3 h-3 text-gray-500 group-hover:text-[#004AC6] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
                              </svg>
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-800 group-hover:text-[#004AC6] truncate leading-snug transition-colors">
                                {primaryName}
                              </p>
                              {secondaryName && (
                                <p className="text-xs text-gray-400 truncate mt-0.5 leading-snug">
                                  {secondaryName}
                                </p>
                              )}
                            </div>
                            <svg className="shrink-0 w-3.5 h-3.5 mt-1 text-gray-300 group-hover:text-[#004AC6] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* Nút tìm */}
            <button
              type="submit"
              disabled={searchLoading || !searchInput.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-[#004AC6] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#003faa] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {searchLoading ? (
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              <span className="hidden sm:inline">{t('roomDetail.mapSearchBtn')}</span>
            </button>

            {/* Nút về GPS */}
            {gpsPos && (
              <button
                type="button"
                onClick={handleReturnToGps}
                title={t('roomDetail.mapGpsTitle')}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-blue-50 hover:text-[#1a73e8] hover:border-[#1a73e8]/30 shrink-0"
              >
                {/* GPS icon */}
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </form>

          {/* Thông báo lỗi tìm kiếm */}
          {searchError && (
            <p className="mt-1.5 text-xs text-red-500 font-medium">{searchError}</p>
          )}
        </div>

        {/* ── Body: Map + Sidebar ── */}
        <div className="relative flex flex-1 overflow-hidden">

          {/* Bản đồ */}
          <div ref={mapRef} className="flex-1" />

          {/* Instruction overlay */}
          {loadState === 'ready' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm pointer-events-none whitespace-nowrap">
              {t('roomDetail.mapClickHint')}
            </div>
          )}

          {/* Loading overlay */}
          {(loadState === 'locating' || loadState === 'fetching') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm z-[1000]">
              <div className="h-10 w-10 rounded-full border-4 border-[#004AC6] border-t-transparent animate-spin mb-3" />
              <p className="text-sm font-semibold text-gray-700">
                {loadState === 'locating' ? t('roomDetail.mapLocating') : t('roomDetail.mapLoadingRooms')}
              </p>
            </div>
          )}

          {/* Error overlay */}
          {loadState === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-[1000]">
              <div className="text-4xl mb-2">😕</div>
              <p className="text-sm font-semibold text-red-600">{errorMsg}</p>
              <button
                onClick={() => fetchNearbyRooms(currentCenter[0], currentCenter[1], radiusKm)}
                className="mt-3 rounded-xl bg-[#004AC6] px-4 py-2 text-xs font-bold text-white hover:bg-[#003f9e]"
              >
                {t('roomDetail.mapRetry')}
              </button>
            </div>
          )}

          {/* Sidebar danh sách phòng (desktop) */}
          {loadState === 'ready' && rooms.length > 0 && (
            <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-gray-100 bg-white lg:block xl:w-80">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  {t('roomDetail.mapSidebarRooms').replace('{{count}}', String(roomsOnMap.length)).replace('{{radius}}', String(radiusKm))}
                </p>
              </div>
              {roomsOnMap.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400 font-medium">
                  {t('roomDetail.mapNoGeoRooms')}
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {roomsOnMap.map((room) => (
                    <li key={room.id}>
                      <a
                        href={`/rooms/${room.id}`}
                        className="flex gap-3 px-4 py-3 transition hover:bg-gray-50"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          {room.image && (
                            <img
                              src={room.image}
                              alt={room.title}
                              className="h-full w-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-gray-800 leading-snug">{room.title}</p>
                          <p className="mt-0.5 truncate text-[11px] text-gray-500">{room.location}</p>
                          <p className="mt-1 text-sm font-extrabold text-[#004AC6]">
                            {new Intl.NumberFormat('vi-VN').format(room.price)}đ
                            <span className="text-[10px] font-normal text-gray-400">/tháng</span>
                          </p>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          )}
        </div>

        {/* ── Footer mobile ── */}
        {loadState === 'ready' && (
          <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-2 lg:hidden">
            <p className="text-xs text-center text-gray-500 font-medium">
              {t('roomDetail.mapFooter').replace('{{count}}', String(roomsOnMap.length)).replace('{{radius}}', String(radiusKm))}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
