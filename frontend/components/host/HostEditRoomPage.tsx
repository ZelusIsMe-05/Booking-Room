'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import HostNotificationBell from '@/components/host/HostNotificationBell';
import HostSidebar from '@/components/host/HostSidebar';
import GoogleAddressInput, { type SelectedPlace } from '@/components/host/GoogleAddressInput';
import { hostRoomService, type HostRoom, type HostRoomImage } from '@/services/hostRoomService';
import { MAX_ROOM_IMAGES, MIN_REQUIRED_IMAGES, getRoomTypeOptions } from '@/data/hostCreateRoom';
import { useTranslation } from '@/context/LanguageContext';

interface EditableRoomImage {
  id: string;
  url: string;
  kind: 'existing' | 'new';
  file?: File;
}

function orderRoomImages(images: HostRoomImage[]): HostRoomImage[] {
  const sorted = [...images].sort((a, b) => a.sequence_number - b.sequence_number);
  const cover = sorted.find((image) => image.is_cover);
  return cover ? [cover, ...sorted.filter((image) => image !== cover)] : sorted;
}

function EditSection({
  title,
  icon,
  children,
  className = '',
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-[rgba(226,232,240,0.5)] bg-white/80 p-6 shadow-sm backdrop-blur-md ${className}`}>
      <div className="flex items-center gap-2 border-b border-[#C3C6D7] pb-4">
        <span className="text-[#004AC6]">{icon}</span>
        <h2 className="text-2xl font-semibold leading-[31px] text-[#191B23]">{title}</h2>
      </div>
      <div className="pt-6">{children}</div>
    </section>
  );
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-bold uppercase leading-3 tracking-[0.6px] text-[#434655]">
      {children}
    </label>
  );
}

function TopIcons() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-end border-b border-[#E1E2ED] bg-[#FAF8FF] px-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-6 text-[#434655]">
        <HostNotificationBell />
        <LanguageSwitcher />
      </div>
    </header>
  );
}

const inputClass =
  'h-[58px] rounded-lg border border-[#C3C6D7] bg-white px-4 text-base outline-none focus:ring-2 focus:ring-[#004AC6]/20';

/** Format a numeric string with Vietnamese thousand separators, e.g. "6500000" → "6.500.000". */
function formatMoneyInput(value: string | number): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('vi-VN');
}

/** Strip separators back to a plain digit string, e.g. "6.500.000" → "6500000". */
function parseMoneyInput(value: string): string {
  return String(value ?? '').replace(/\D/g, '');
}

const getStatusMeta = (t: any): Record<string, { label: string; dot: string; text: string; bg: string }> => ({
  AVAILABLE: { label: t('host.editRoom.statusAvailable'), dot: '#006A61', text: '#006A61', bg: 'rgba(0,106,97,0.1)' },
  RENTED: { label: t('host.editRoom.statusRented'), dot: '#434655', text: '#434655', bg: 'rgba(67,70,85,0.1)' },
  LOCKED: { label: t('host.editRoom.statusLocked'), dot: '#943700', text: '#943700', bg: 'rgba(148,55,0,0.1)' },
});

export default function HostEditRoomPage({ listingId }: { listingId: string }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const roomTypeOptions = getRoomTypeOptions(t);
  const statusMeta = getStatusMeta(t);
  // Mỗi lần mở trang chỉnh sửa, link truyền ?r=<timestamp> khác nhau ⇒ buộc
  // tải lại dữ liệu mới nhất (kể cả khi component được tái dùng từ Router Cache).
  const refreshKey = searchParams.get('r');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newImageUrlsRef = useRef<Set<string>>(new Set());

  const [room, setRoom] = useState<HostRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [roomType, setRoomType] = useState('');
  const [capacity, setCapacity] = useState('');
  const [address, setAddress] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [wardName, setWardName] = useState('');
  const [formattedAddress, setFormattedAddress] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [description, setDescription] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [electricityCost, setElectricityCost] = useState('');
  const [waterCost, setWaterCost] = useState('');
  const [internetCost, setInternetCost] = useState('');
  const [serviceFee, setServiceFee] = useState('');

  const [editableImages, setEditableImages] = useState<EditableRoomImage[]>([]);
  const [coverImageId, setCoverImageId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const found = await hostRoomService.getMyRoomById(listingId);
        if (cancelled) return;
        if (!found) {
          setLoadError(t('host.editRoom.errorNotFound'));
          return;
        }
        setRoom(found);
        setTitle(found.title || '');
        setRoomType(found.room_type || '');
        setCapacity(String(found.max_capacity ?? ''));
        setAddress(found.detailed_address || '');
        setProvinceName(found.province_name || '');
        setDistrictName(found.district_name || '');
        setWardName(found.ward_name || '');
        setFormattedAddress(found.formatted_address || '');
        setPlaceId(found.place_id || '');
        setLatitude(found.latitude == null ? '' : String(found.latitude));
        setLongitude(found.longitude == null ? '' : String(found.longitude));
        setDescription(found.room_description || '');
        setMonthlyRent(formatMoneyInput(found.monthly_rent ?? ''));
        setDepositAmount(formatMoneyInput(found.deposit_amount ?? ''));
        setElectricityCost(formatMoneyInput(found.electricity_cost ?? ''));
        setWaterCost(formatMoneyInput(found.water_cost ?? ''));
        setInternetCost(formatMoneyInput(found.internet_cost ?? ''));
        setServiceFee(formatMoneyInput(found.service_fee ?? ''));
        const loadedImages: EditableRoomImage[] = orderRoomImages(found.images || []).map((image) => ({
          id: `existing:${image.image_url}`,
          url: image.image_url,
          kind: 'existing',
        }));
        setEditableImages(loadedImages);
        setCoverImageId(loadedImages[0]?.id || null);
      } catch (err: any) {
        if (!cancelled) setLoadError(err?.message || t('host.editRoom.errorLoadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [listingId, refreshKey]);

  useEffect(() => {
    return () => {
      newImageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      newImageUrlsRef.current.clear();
    };
  }, []);

  // Include the current room_type as a select option if it isn't a known preset.
  const typeOptions = useMemo(() => {
    const labels = roomTypeOptions.map((o) => o.label);
    if (roomType && !labels.includes(roomType)) {
      return [{ value: roomType, label: roomType }, ...roomTypeOptions.map((o) => ({ value: o.label, label: o.label.replace(' (Room)', '') }))];
    }
    return roomTypeOptions.map((o) => ({ value: o.label, label: o.label.replace(' (Room)', '') }));
  }, [roomType]);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length === 0) return;
    setEditableImages((current) => {
      const remaining = Math.max(0, MAX_ROOM_IMAGES - current.length);
      const added = selected.slice(0, remaining).map((file) => {
        const url = URL.createObjectURL(file);
        newImageUrlsRef.current.add(url);
        return {
          id: `new:${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          url,
          kind: 'new' as const,
        };
      });
      if (!coverImageId && added[0]) setCoverImageId(added[0].id);
      return [...current, ...added];
    });
    event.target.value = '';
  };

  const handleRemoveImage = (id: string) => {
    setEditableImages((current) => {
      const target = current.find((image) => image.id === id);
      if (target?.kind === 'new') {
        URL.revokeObjectURL(target.url);
        newImageUrlsRef.current.delete(target.url);
      }
      const next = current.filter((image) => image.id !== id);
      if (coverImageId === id) setCoverImageId(next[0]?.id || null);
      return next;
    });
  };

  const handlePlaceSelected = useCallback((place: SelectedPlace) => {
    setAddress(place.detailedAddress || place.formattedAddress);
    setFormattedAddress(place.formattedAddress);
    setPlaceId(place.placeId);
    setLatitude(place.latitude);
    setLongitude(place.longitude);
    setProvinceName(place.provinceName);
    setDistrictName(place.districtName);
    setWardName(place.wardName);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!room) return;
    setError(null);

    const rentValue = parseMoneyInput(monthlyRent);
    const depositValue = parseMoneyInput(depositAmount);

    if (!title.trim()) return setError(t('host.editRoom.errorNameRequired'));
    if (!address.trim()) return setError(t('host.editRoom.errorAddressRequired'));
    if (!rentValue || Number(rentValue) <= 0) return setError(t('host.editRoom.errorRentInvalid'));
    if (depositValue === '' || Number(depositValue) < 0) return setError(t('host.editRoom.errorDepositInvalid'));
    if (!capacity || Number(capacity) <= 0) return setError(t('host.editRoom.errorCapacityInvalid'));
    if (editableImages.length < MIN_REQUIRED_IMAGES) return setError(t('host.editRoom.errorMinImages'));
    const coverImage = editableImages.find((image) => image.id === coverImageId);
    if (!coverImage) return setError(t('host.editRoom.errorCoverRequired'));

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('room_type', roomType);
    formData.append('detailed_address', address.trim());
    if (provinceName.trim()) formData.append('province_name', provinceName.trim());
    if (districtName.trim()) formData.append('district_name', districtName.trim());
    if (wardName.trim()) formData.append('ward_name', wardName.trim());
    if (formattedAddress.trim()) formData.append('formatted_address', formattedAddress.trim());
    if (placeId.trim()) formData.append('place_id', placeId.trim());
    if (latitude.trim()) formData.append('latitude', latitude.trim());
    if (longitude.trim()) formData.append('longitude', longitude.trim());
    formData.append('max_capacity', String(capacity));
    formData.append('monthly_rent', rentValue);
    formData.append('deposit_amount', depositValue);
    formData.append('electricity_cost', parseMoneyInput(electricityCost) || '0');
    formData.append('water_cost', parseMoneyInput(waterCost) || '0');
    formData.append('internet_cost', parseMoneyInput(internetCost) || '0');
    formData.append('service_fee', parseMoneyInput(serviceFee) || '0');
    formData.append('room_description', description.trim());
    const keptImageUrls = editableImages
      .filter((image) => image.kind === 'existing')
      .map((image) => image.url);
    const newImages = editableImages.filter(
      (image): image is EditableRoomImage & { file: File } => image.kind === 'new' && Boolean(image.file),
    );
    formData.append('kept_image_urls', JSON.stringify(keptImageUrls));
    if (coverImage.kind === 'existing') {
      formData.append('cover_image_url', coverImage.url);
    } else {
      formData.append('cover_new_index', String(newImages.findIndex((image) => image.id === coverImage.id)));
    }
    newImages.forEach((image) => formData.append('images', image.file));

    setSubmitting(true);
    try {
      await hostRoomService.updateRoom(room.room_id, formData);
      // Về trang chi tiết để chủ phòng thấy ngay nội dung vừa cập nhật
      // (trang danh sách không hiển thị mô tả/chi phí/địa chỉ đầy đủ).
      router.push(`/host/listings/${room.room_id}`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || t('host.editRoom.errorUpdateFailed'));
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <HostSidebar user={user} onLogout={handleLogout} activePage="listings" />
        <section className="flex min-h-screen items-center justify-center lg:ml-64">
          <p className="text-base font-semibold text-[#434655]">{t('host.editRoom.loading')}</p>
        </section>
      </main>
    );
  }

  if (loadError || !room) {
    return (
      <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <HostSidebar user={user} onLogout={handleLogout} activePage="listings" />
        <section className="flex min-h-screen flex-col items-center justify-center gap-4 lg:ml-64">
          <p className="text-base font-semibold text-[#BA1A1A]">{loadError || t('host.editRoom.notFound')}</p>
          <Link href="/host/listings" className="rounded-lg bg-[#004AC6] px-6 py-3 text-base text-white hover:bg-[#003f9e]">
            {t('host.editRoom.backToList')}
          </Link>
        </section>
      </main>
    );
  }

  const badge = statusMeta[room.status] || statusMeta.AVAILABLE;
  const coverImage = editableImages.find((image) => image.id === coverImageId) || null;
  const galleryImages = editableImages.filter((image) => image.id !== coverImageId);

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <HostSidebar user={user} onLogout={handleLogout} activePage="listings" />
      <section className="flex min-h-screen flex-col lg:ml-64">
        <TopIcons />

        <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-[1024px] flex-col gap-4 p-4 sm:p-6">
          <nav className="flex items-center gap-1 text-sm leading-[21px]" aria-label="Breadcrumb">
            <Link href="/host" className="text-[#434655] hover:text-[#004AC6]">{t('host.editRoom.breadcrumbDashboard')}</Link>
            <span className="text-[#434655]">›</span>
            <Link href="/host/listings" className="text-[#434655] hover:text-[#004AC6]">{t('host.editRoom.breadcrumbListings')}</Link>
            <span className="text-[#434655]">›</span>
            <span className="font-semibold text-[#191B23]">{t('host.editRoom.breadcrumbEdit')}</span>
          </nav>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-[32px] font-bold leading-[38px]">{t('host.editRoom.title')}</h1>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold leading-3 tracking-[0.6px]"
                style={{ background: badge.bg, color: badge.text }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: badge.dot }} />
                {badge.label}
              </span>
            </div>
            <div className="flex gap-4">
              <Link href={`/host/listings/${room.room_id}`} className="flex h-[42px] items-center rounded-lg border border-[#737686] px-6 text-base leading-6 hover:bg-white">
                {t('host.editRoom.cancel')}
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="flex h-[42px] items-center rounded-lg bg-[#004AC6] px-6 text-base leading-6 text-white shadow-[0_10px_15px_-3px_rgba(0,74,198,0.2)] hover:bg-[#003f9e] disabled:opacity-60"
              >
                {submitting ? t('host.editRoom.saving') : t('host.editRoom.saveChanges')}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-[#FFB4AB] bg-[rgba(186,26,26,0.08)] px-4 py-3 text-sm font-semibold text-[#BA1A1A]">
              {error}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="relative z-20 flex flex-col gap-6">
              <EditSection
                title={t('host.editRoom.basicInfo')}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" />
                  </svg>
                }
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="edit-title">{t('host.editRoom.roomName')}</Label>
                      <input id="edit-title" value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-type">{t('host.editRoom.roomType')}</Label>
                    <div className="relative">
                      <select id="edit-type" value={roomType} onChange={(event) => setRoomType(event.target.value)} className={`${inputClass} w-full appearance-none pr-10`}>
                        {typeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <svg className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-capacity">{t('host.editRoom.capacity')}</Label>
                    <input id="edit-capacity" type="number" min="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} className={inputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="edit-description">{t('host.editRoom.description')}</Label>
                      <textarea id="edit-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="rounded-lg border border-[#C3C6D7] bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[#004AC6]/20" />
                    </div>
                  </div>
                </div>
              </EditSection>

              <EditSection
                title={t('host.editRoom.priceCosts')}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                }
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-rent">{t('host.editRoom.monthlyRent')}</Label>
                    <input id="edit-rent" type="text" inputMode="numeric" placeholder="6.500.000" value={monthlyRent} onChange={(event) => setMonthlyRent(formatMoneyInput(event.target.value))} className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-deposit">{t('host.editRoom.deposit')}</Label>
                    <input id="edit-deposit" type="text" inputMode="numeric" placeholder="6.500.000" value={depositAmount} onChange={(event) => setDepositAmount(formatMoneyInput(event.target.value))} className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-electricity">{t('host.editRoom.electricity')}</Label>
                    <input id="edit-electricity" type="text" inputMode="numeric" placeholder="0" value={electricityCost} onChange={(event) => setElectricityCost(formatMoneyInput(event.target.value))} className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-water">{t('host.editRoom.water')}</Label>
                    <input id="edit-water" type="text" inputMode="numeric" placeholder="0" value={waterCost} onChange={(event) => setWaterCost(formatMoneyInput(event.target.value))} className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-internet">{t('host.editRoom.internet')}</Label>
                    <input id="edit-internet" type="text" inputMode="numeric" placeholder="0" value={internetCost} onChange={(event) => setInternetCost(formatMoneyInput(event.target.value))} className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-service">{t('host.editRoom.service')}</Label>
                    <input id="edit-service" type="text" inputMode="numeric" placeholder="0" value={serviceFee} onChange={(event) => setServiceFee(formatMoneyInput(event.target.value))} className={inputClass} />
                  </div>
                </div>
              </EditSection>

              <EditSection
                title={t('host.editRoom.location')}
                className="relative z-30"
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-4.6 7-11a7 7 0 1 0-14 0c0 6.4 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" />
                  </svg>
                }
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <Label htmlFor="edit-address">{t('host.editRoom.address')}</Label>
                    <GoogleAddressInput
                      id="edit-address"
                      value={address}
                      onChange={(value) => {
                        setAddress(value);
                        setFormattedAddress('');
                        setPlaceId('');
                        setLatitude('');
                        setLongitude('');
                      }}
                      onPlaceSelected={handlePlaceSelected}
                      placeholder={t('host.editRoom.addressPlaceholder')}
                      inputClassName={`${inputClass} w-full pr-10`}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-latitude">{t('host.editRoom.latitude')}</Label>
                    <input id="edit-latitude" type="number" step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-longitude">{t('host.editRoom.longitude')}</Label>
                    <input id="edit-longitude" type="number" step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} className={inputClass} />
                  </div>
                </div>
              </EditSection>
            </div>

            <aside className="h-fit rounded-xl border border-[rgba(226,232,240,0.5)] bg-white/80 p-6 shadow-sm backdrop-blur-md">
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesSelected} />
              <div className="flex items-center justify-between border-b border-[#C3C6D7] pb-4">
                <h2 className="flex items-center gap-2 text-2xl font-semibold leading-[31px]">
                  <svg className="h-5 w-5 text-[#004AC6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4zM8 13l2-2 3 3 2-2 3 3" />
                  </svg>
                  {t('host.editRoom.imagesTitle')}
                </h2>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={editableImages.length >= MAX_ROOM_IMAGES}
                  className="rounded px-2 py-1 text-base text-[#004AC6] hover:bg-[#F3F3FE] disabled:cursor-not-allowed disabled:text-[#9CA3AF]"
                >
                  {t('host.editRoom.addMore')}
                </button>
              </div>

              <div className="mt-4 flex items-start justify-between gap-3 rounded-lg bg-[#F3F3FE] px-3 py-2 text-xs text-[#434655]">
                <p>{t('host.editRoom.imageHelp')}</p>
                <span className="shrink-0 font-bold text-[#004AC6]">{editableImages.length}/{MAX_ROOM_IMAGES}</span>
              </div>

              <div className="mt-6 space-y-4">
                {coverImage ? (
                  <figure className="group relative overflow-hidden rounded-lg border-2 border-[#004AC6]">
                    <img src={coverImage.url} alt={t('host.editRoom.coverImage')} className="h-[194px] w-full object-cover" />
                    <figcaption className="absolute bottom-2 left-2 rounded bg-[rgba(0,74,198,0.9)] px-2 py-1 text-[10px] font-bold text-white">
                      {t('host.editRoom.coverImage')}
                    </figcaption>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(coverImage.id)}
                      disabled={editableImages.length <= MIN_REQUIRED_IMAGES}
                      aria-label={t('host.editRoom.removeImage')}
                      title={editableImages.length <= MIN_REQUIRED_IMAGES ? t('host.editRoom.errorMinImages') : t('host.editRoom.removeImage')}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#BA1A1A] shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M10 11v6M14 11v6M9 7V5h6v2M8 7l1 13h6l1-13" />
                      </svg>
                    </button>
                  </figure>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-[160px] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#C3C6D7] text-sm text-[#434655] hover:border-[#004AC6] hover:text-[#004AC6]">
                    <svg className="mb-1 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                    </svg>
                    {t('host.editRoom.uploadFromDevice')}
                  </button>
                )}

                {galleryImages.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {galleryImages.map((image, idx) => (
                      <figure key={image.id} className="group relative overflow-hidden rounded-lg border border-[#C3C6D7]">
                        <img src={image.url} alt={`${t('host.editRoom.imagesTitle')} ${idx + 1}`} className="h-[120px] w-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/55 p-1.5">
                          <button
                            type="button"
                            onClick={() => setCoverImageId(image.id)}
                            className="min-w-0 truncate rounded bg-white/95 px-2 py-1 text-[10px] font-bold text-[#004AC6]"
                          >
                            {t('host.editRoom.setAsCover')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(image.id)}
                            disabled={editableImages.length <= MIN_REQUIRED_IMAGES}
                            aria-label={t('host.editRoom.removeImage')}
                            title={editableImages.length <= MIN_REQUIRED_IMAGES ? t('host.editRoom.errorMinImages') : t('host.editRoom.removeImage')}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#BA1A1A] shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M10 11v6M14 11v6M9 7V5h6v2M8 7l1 13h6l1-13" />
                            </svg>
                          </button>
                        </div>
                        {image.kind === 'new' && (
                          <span className="absolute left-1.5 top-1.5 rounded bg-[#006A61] px-2 py-1 text-[9px] font-bold text-white">
                            {t('host.editRoom.newImage')}
                          </span>
                        )}
                      </figure>
                    ))}
                  </div>
                )}

                {editableImages.length < MAX_ROOM_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#004AC6] text-sm font-semibold text-[#004AC6] hover:bg-[#F3F3FE]"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                    </svg>
                    {t('host.editRoom.addMore')}
                  </button>
                )}
              </div>
            </aside>
          </div>
        </form>
      </section>
    </main>
  );
}
