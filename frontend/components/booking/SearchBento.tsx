'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { MapPinIcon, SearchIcon, WalletIcon } from './Icons';
import { vietnamAdministrativeUnits } from '@/utils/vietnamAdministrativeUnits';
import LocationPickerMap from '../guest/LocationPickerMap';
import { useTranslation } from '@/context/LanguageContext';

const roomTypes = ['Phòng trọ', 'Căn hộ', 'Ở ghép'];
const budgetOptions = ['Dưới 3 triệu', '3 - 5 triệu', '5 - 10 triệu', 'Trên 10 triệu'];

// ── Nominatim autocomplete ────────────────────────────────────────────────────

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    house_number?: string;
    road?: string;
    quarter?: string;
    suburb?: string;
    city_district?: string;
    district?: string;
    county?: string;
    city?: string;
    state?: string;
  };
}

function useAddressSearch(query: string) {
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: `${query.trim()}, Việt Nam`,
          format: 'json',
          addressdetails: '1',
          countrycodes: 'vn',
          limit: '6',
          'accept-language': 'vi',
        });
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          { signal: controller.signal, headers: { 'User-Agent': 'BookingRoom/1.0' } }
        );
        const data: NominatimResult[] = await res.json();
        setResults(data);
      } catch {
        // aborted / network error
      } finally {
        setLoading(false);
      }
    }, 380);
  }, [query]);

  return { results, loading };
}

// ── Main component ────────────────────────────────────────────────────────────

function SearchBentoInner({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const [location, setLocation] = useState(''); // Chuỗi nhiều địa điểm cách nhau bởi |
  const [budget, setBudget] = useState('');
  const [type, setType] = useState('');
  const [nearLat, setNearLat] = useState('');
  const [nearLng, setNearLng] = useState('');

  // Sync from URL params on mount / navigation
  useEffect(() => {
    setLocation(searchParams.get('q') || '');
    setBudget(searchParams.get('budget') || '');
    setType(searchParams.get('type') || '');
    setNearLat(searchParams.get('nearLat') || '');
    setNearLng(searchParams.get('nearLng') || '');
  }, [searchParams]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- ADMIN TAB STATE ---
  const [draftAdmins, setDraftAdmins] = useState<string[]>([]);
  const [expandedProvince, setExpandedProvince] = useState<number | null>(null);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  function handleOpenModal() {
    // Nếu trước đó tìm bằng map, khi mở lại modal hành chính thì reset
    if (nearLat && nearLng) {
      setDraftAdmins([]);
    } else {
      const currentLocs = location ? location.split('|').map(s => s.trim()).filter(Boolean) : [];
      setDraftAdmins(currentLocs);
    }
    setExpandedProvince(null);
    setAdminSearchQuery('');
    setIsModalOpen(true);
  }

  function handleToggleAdmin(name: string) {
    setDraftAdmins((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );
  }

  function handleConfirm() {
    setLocation(draftAdmins.join('|'));
    setNearLat('');
    setNearLng('');
    setIsModalOpen(false);
  }

  function handleCancel() {
    setIsModalOpen(false);
  }

  function handleSearch() {
    const params = new URLSearchParams();
    if (location.trim()) params.set('q', location.trim());
    if (budget.trim()) params.set('budget', budget.trim());
    if (type) params.set('type', type);
    if (nearLat && nearLng) {
      params.set('nearLat', nearLat);
      params.set('nearLng', nearLng);
    }
    const target = `/rooms${params.toString() ? `?${params.toString()}` : ''}`;
    // Nếu không có bộ lọc nào và đang ở /rooms → dùng replace để force re-render
    const hasNoFilter = !params.toString();
    if (hasNoFilter && pathname === '/rooms') {
      router.replace('/rooms');
    } else {
      router.push(target);
    }
  }

  // Filter provinces for the admin tab based on search query
  const filteredProvinces = vietnamAdministrativeUnits.filter(p => 
    p.name.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
    p.districts.some(d => d.name.toLowerCase().includes(adminSearchQuery.toLowerCase()))
  );

  return (
    <div className={`mx-auto w-full rounded-xl border border-booking-border bg-booking-surface p-3 shadow-[0_10px_22px_rgba(25,27,35,0.12)] ${compact ? '' : 'max-w-4xl sm:p-4'}`}>
      <div className="grid gap-2 md:grid-cols-[2fr_1.1fr_1.1fr_auto] md:items-center">

        {/* ── Location Input (Button) ── */}
        <button
          type="button"
          suppressHydrationWarning
          onClick={handleOpenModal}
          className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-booking-border bg-white px-4 text-booking-primary transition hover:border-booking-primary/60 cursor-pointer text-left"
        >
          <MapPinIcon className="h-5 w-5 shrink-0" />
          <div className="flex-1 min-w-0">
            {location ? (
              <p className="truncate text-sm font-semibold text-booking-text">
                {nearLat && nearLng ? `📍 Quanh ${location}` : location.split('|').join(', ')}
              </p>
            ) : (
              <p className="truncate text-base text-booking-muted">{t('search.chooseArea')}</p>
            )}
          </div>
        </button>

        {/* ── Budget Selector ── */}
        <div className="relative w-full">
          <select
            suppressHydrationWarning
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full min-h-14 rounded-lg border border-booking-border bg-white pl-4 pr-10 text-base text-booking-text outline-none transition focus:border-booking-primary cursor-pointer appearance-none"
          >
            <option value="">{t('search.roomPrice')}</option>
            {budgetOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
            <svg className="h-4 w-4 text-booking-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* ── Room Type Selector ── */}
        <div className="relative w-full">
          <select
            suppressHydrationWarning
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full min-h-14 rounded-lg border border-booking-border bg-white pl-4 pr-10 text-base text-booking-text outline-none transition focus:border-booking-primary cursor-pointer appearance-none"
          >
            <option value="">{t('search.roomType')}</option>
            {roomTypes.map((roomType) => (
              <option key={roomType} value={roomType}>{roomType}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
            <svg className="h-4 w-4 text-booking-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* ── Search Button ── */}
        <button
          type="button"
          suppressHydrationWarning
          onClick={handleSearch}
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-booking-primary px-6 text-sm font-bold text-white shadow-sm transition hover:bg-booking-primaryDark cursor-pointer"
        >
          <SearchIcon className="h-4 w-4" />
          {t('search.searchNow')}
        </button>

      </div>

      {/* Separate Selection Modal Panel */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={handleCancel}
        >
          <div
            className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col h-[85vh] max-h-[800px] border border-booking-border animate-in zoom-in-95 duration-200 text-booking-text"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-booking-border bg-white">
              <h3 className="text-xl font-bold text-booking-text">{t('search.searchAreaTitle')}</h3>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1.5 rounded-lg hover:bg-booking-surface text-booking-muted hover:text-booking-text transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden bg-white rounded-b-2xl flex flex-col min-h-0">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-booking-border">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-booking-muted">
                      <SearchIcon className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      placeholder={t('search.searchProvince')}
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-booking-border rounded-xl outline-none focus:border-booking-primary transition-all"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {filteredProvinces.map((province) => (
                    <div key={province.code} className="mb-2 rounded-xl border border-booking-border overflow-hidden">
                      <div 
                        className={`flex items-center justify-between px-4 py-3 cursor-pointer select-none transition-colors ${expandedProvince === province.code ? 'bg-booking-surface/50' : 'hover:bg-booking-surface/50'}`}
                        onClick={() => setExpandedProvince(expandedProvince === province.code ? null : province.code)}
                      >
                        <label className="flex items-center gap-3 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={draftAdmins.includes(province.name)}
                            onChange={() => handleToggleAdmin(province.name)}
                            className="h-4 w-4 rounded border-gray-300 text-booking-primary focus:ring-booking-primary cursor-pointer"
                          />
                          <span className={`font-semibold text-sm ${draftAdmins.includes(province.name) ? 'text-booking-primary' : 'text-booking-text'}`}>
                            {province.name}
                          </span>
                        </label>
                        <svg className={`w-5 h-5 text-booking-muted transition-transform ${expandedProvince === province.code ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      
                      {/* Districts list */}
                      {expandedProvince === province.code && (
                        <div className="px-4 pb-3 pt-1 grid grid-cols-2 md:grid-cols-3 gap-2 bg-booking-surface/10 border-t border-booking-border">
                          {province.districts.filter(d => d.name.toLowerCase().includes(adminSearchQuery.toLowerCase()) || province.name.toLowerCase().includes(adminSearchQuery.toLowerCase())).map(district => (
                            <label key={district.code} className="flex items-center gap-2 p-2 rounded-lg hover:bg-booking-surface cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={draftAdmins.includes(district.name)}
                                onChange={() => handleToggleAdmin(district.name)}
                                className="h-3.5 w-3.5 rounded border-gray-300 text-booking-primary focus:ring-booking-primary cursor-pointer"
                              />
                              <span className={`text-sm truncate ${draftAdmins.includes(district.name) ? 'text-booking-primary font-medium' : 'text-booking-text'}`}>
                                {district.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-booking-border bg-booking-surface/30">
              <button
                type="button"
                onClick={() => setDraftAdmins([])}
                disabled={draftAdmins.length === 0}
                className="text-sm text-red-600 hover:text-red-800 font-bold disabled:opacity-50 transition"
              >
                {t('search.clearSelection')} ({draftAdmins.length})
              </button>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-bold rounded-xl border border-booking-border text-booking-text hover:bg-booking-surface transition-colors cursor-pointer"
                >
                  {t('search.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-5 py-2 text-sm font-extrabold rounded-xl bg-booking-primary text-white hover:bg-booking-primaryDark shadow transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('search.apply')}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchBento(props: { compact?: boolean }) {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-4xl min-h-14 bg-booking-surface animate-pulse rounded-xl" />}>
      <SearchBentoInner {...props} />
    </Suspense>
  );
}
