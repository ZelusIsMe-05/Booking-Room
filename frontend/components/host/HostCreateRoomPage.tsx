'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import HostNotificationBell from '@/components/host/HostNotificationBell';
import HostSidebar from '@/components/host/HostSidebar';
import GoogleAddressInput, { type SelectedPlace } from '@/components/host/GoogleAddressInput';
import { hostRoomService } from '@/services/hostRoomService';
import {
  MAX_ROOM_IMAGES,
  MIN_REQUIRED_IMAGES,
  getAmenityOptions,
  getRoomTypeOptions,
} from '@/data/hostCreateRoom';
import { useTranslation } from '@/context/LanguageContext';

interface SectionCardProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

interface FieldLabelProps {
  htmlFor: string;
  children: React.ReactNode;
}

interface UploadPreview {
  id: string;
  file: File;
  url: string;
}

function FieldLabel({ htmlFor, children }: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-xs font-bold leading-3 tracking-[0.6px] text-[#434655]"
    >
      {children}
    </label>
  );
}

function SectionCard({ number, title, children }: SectionCardProps) {
  return (
    <section className="rounded-xl border border-[rgba(226,232,240,0.8)] bg-white/70 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] backdrop-blur-md">
      <div className="flex items-center gap-4 border-b border-[#C3C6D7] pb-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(37,99,235,0.2)] text-base font-bold text-[#004AC6]">
          {number}
        </span>
        <h2 className="text-xl font-semibold leading-7 text-[#191B23]">{title}</h2>
      </div>
      <div className="pt-6">{children}</div>
    </section>
  );
}

const priceInputClass =
  'h-[58px] rounded-lg border border-[#C3C6D7] bg-white px-4 text-base text-[#191B23] outline-none placeholder:text-[#6B7280] focus:ring-2 focus:ring-[#004AC6]/20';

function formatMoneyInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits).toLocaleString('vi-VN') : '';
}

function parseMoneyInput(value: string): string {
  return value.replace(/\D/g, '');
}

export default function HostCreateRoomPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const roomTypeOptions = getRoomTypeOptions(t);
  const amenityOptions = getAmenityOptions(t);

  const [title, setTitle] = useState('');
  const [roomType, setRoomType] = useState(roomTypeOptions[0].value);
  const [capacity, setCapacity] = useState('2');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [wardName, setWardName] = useState('');

  const [formattedAddress, setFormattedAddress] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [area, setArea] = useState('45');
  const [amenities, setAmenities] = useState<string[]>([]);

  // Pricing
  const [monthlyRent, setMonthlyRent] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [electricityCost, setElectricityCost] = useState('');
  const [waterCost, setWaterCost] = useState('');
  const [internetCost, setInternetCost] = useState('');
  const [serviceFee, setServiceFee] = useState('');

  const [mainImage, setMainImage] = useState<UploadPreview | null>(null);
  const [images, setImages] = useState<UploadPreview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageCount = images.length + (mainImage ? 1 : 0);
  const missingImages = Math.max(0, MIN_REQUIRED_IMAGES - imageCount);

  // Revoke object URLs on unmount to avoid leaks.
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const handleCancel = () => {
    router.push('/host/listings');
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleMainImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMainImage((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        url: URL.createObjectURL(file),
      };
    });
    event.target.value = '';
  };

  const handleRemoveMainImage = () => {
    setMainImage((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length === 0) return;
    setImages((current) => {
      // Keep one slot reserved for the explicitly selected main image.
      const remaining = MAX_ROOM_IMAGES - current.length - 1;
      const next = selected.slice(0, Math.max(0, remaining)).map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        url: URL.createObjectURL(file),
      }));
      return [...current, ...next];
    });
    // Allow re-selecting the same file.
    event.target.value = '';
  };

  const handleRemoveImage = (id: string) => {
    setImages((current) => {
      const target = current.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((img) => img.id !== id);
    });
  };

  const handleAmenityToggle = (key: string) => {
    setAmenities((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  const handlePlaceSelected = useCallback((place: SelectedPlace) => {
    setAddress(place.formattedAddress || place.detailedAddress);
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
    setError(null);

    // Client-side validation mirroring the backend rules.
    if (!title.trim()) return setError(t('host.createRoom.errorNameRequired'));
    if (!address.trim()) return setError(t('host.createRoom.errorAddressRequired'));
    const rentValue = parseMoneyInput(monthlyRent);
    const depositValue = parseMoneyInput(depositAmount);

    if (!rentValue || Number(rentValue) <= 0) return setError(t('host.createRoom.errorRentInvalid'));
    if (depositValue === '' || Number(depositValue) < 0) return setError(t('host.createRoom.errorDepositInvalid'));
    if (!capacity || Number(capacity) <= 0) return setError(t('host.createRoom.errorCapacityInvalid'));
    if (!mainImage) return setError(t('host.createRoom.errorMainImageRequired'));
    if (imageCount < MIN_REQUIRED_IMAGES) return setError(`${t('host.createRoom.errorMinImages')} ${MIN_REQUIRED_IMAGES} ${t('host.createRoom.errorMinImagesSuffix')}`);

    const roomTypeLabel = roomTypeOptions.find((o) => o.value === roomType)?.label ?? roomType;
    const composedAddress = [address.trim(), wardName, districtName, provinceName, 'Việt Nam'].filter(Boolean).join(', ');

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('room_type', roomTypeLabel);
    formData.append('detailed_address', address.trim());
    if (provinceName.trim()) formData.append('province_name', provinceName.trim());
    if (districtName.trim()) formData.append('district_name', districtName.trim());
    if (wardName.trim()) formData.append('ward_name', wardName.trim());
    formData.append('formatted_address', formattedAddress.trim() || composedAddress);
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
    if (description.trim()) formData.append('room_description', description.trim());
    formData.append('images', mainImage.file);
    images.forEach((img) => formData.append('images', img.file));

    setSubmitting(true);
    try {
      await hostRoomService.createRoom(formData);
      router.push('/host/listings');
    } catch (err: any) {
      setError(err?.message || t('host.createRoom.createError'));
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <HostSidebar user={user} onLogout={handleLogout} activePage="listings" />

      <section className="flex min-h-screen flex-col lg:ml-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-end border-b border-[#E1E2ED] bg-[#FAF8FF] px-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-2 text-[#004AC6]">
            <HostNotificationBell />
            <LanguageSwitcher />
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mx-auto flex w-full max-w-[1024px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-6 lg:pb-12"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <nav className="flex flex-wrap items-center gap-1 text-xs font-bold leading-3 tracking-[0.6px]" aria-label="Breadcrumb">
                <Link href="/host" className="text-[#434655] hover:text-[#004AC6]">
                  {t('host.createRoom.breadcrumbDashboard')}
                </Link>
                <span className="text-[#434655]">/</span>
                <Link href="/host/listings" className="text-[#434655] hover:text-[#004AC6]">
                  {t('host.createRoom.breadcrumbListings')}
                </Link>
                <span className="text-[#434655]">/</span>
                <span className="text-[#191B23]">{t('host.createRoom.breadcrumbCreate')}</span>
              </nav>
              <h1 className="mt-2 text-[32px] font-bold leading-[38px] text-[#191B23]">
                {t('host.createRoom.title')}
              </h1>
              <p className="mt-1 text-base leading-6 text-[#434655]">
                {t('host.createRoom.subtitle')}
              </p>
            </div>

            <div className="flex shrink-0 gap-4">
              <button
                type="button"
                onClick={handleCancel}
                className="flex h-[58px] min-w-[81px] items-center justify-center rounded-lg border border-[#737686] bg-transparent px-6 text-base leading-6 text-[#191B23] transition hover:bg-white"
              >
                {t('host.createRoom.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex h-[58px] min-w-[141px] items-center justify-center gap-2 rounded-lg bg-[#004AC6] px-6 text-base leading-6 text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] transition hover:bg-[#003f9e] disabled:opacity-60"
              >
                <svg className="h-[15px] w-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5h12l2 2v12H5V5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5v5h8V5M8 19v-5h8v5" />
                </svg>
                {submitting ? t('host.createRoom.saving') : t('host.createRoom.publish')}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-[#FFB4AB] bg-[rgba(186,26,26,0.08)] px-4 py-3 text-sm font-semibold text-[#BA1A1A]">
              {error}
            </div>
          )}

          <SectionCard number={1} title={t('host.createRoom.basicInfo')}>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="relative z-[60] md:col-span-2">
                <div className="flex flex-col gap-[4.5px]">
                  <FieldLabel htmlFor="room-title">{t('host.createRoom.roomTitle')}</FieldLabel>
                  <input
                    id="room-title"
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={t('host.createRoom.roomTitlePlaceholder')}
                    className={priceInputClass}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-[4.5px]">
                <FieldLabel htmlFor="room-type">{t('host.createRoom.roomType')}</FieldLabel>
                <div className="relative">
                  <select
                    id="room-type"
                    value={roomType}
                    onChange={(event) => setRoomType(event.target.value)}
                    className="h-[58px] w-full appearance-none rounded-lg border border-[#C3C6D7] bg-white px-4 pr-12 text-base text-[#191B23] outline-none focus:ring-2 focus:ring-[#004AC6]/20"
                  >
                    {roomTypeOptions.map((option) => (
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

              <div className="flex flex-col gap-[4.5px]">
                <FieldLabel htmlFor="capacity">{t('host.createRoom.capacity')}</FieldLabel>
                <input
                  id="capacity"
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(event) => setCapacity(event.target.value)}
                  className="h-[58px] rounded-lg border border-[#C3C6D7] bg-white px-4 text-base text-[#191B23] outline-none focus:ring-2 focus:ring-[#004AC6]/20"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex flex-col gap-[4.5px]">
                  <FieldLabel htmlFor="description">{t('host.createRoom.description')}</FieldLabel>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    placeholder={t('host.createRoom.descriptionPlaceholder')}
                    className="rounded-lg border border-[#C3C6D7] bg-white px-4 py-3 text-base text-[#191B23] outline-none placeholder:text-[#6B7280] focus:ring-2 focus:ring-[#004AC6]/20"
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          <div className="relative z-30">
            <SectionCard number={2} title={t('host.createRoom.spaceLocation')}>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <div className="flex flex-col gap-[4.5px]">
                    <FieldLabel htmlFor="address">{t('host.createRoom.address')}</FieldLabel>
                    <div className="relative">
                      {/* Icon GPS dạng tâm ngắm tọa độ đặt đằng trước input địa chỉ */}
                      <svg
                        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#434655]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5m0 15V21m9-9h-1.5M4.5 12H3m13.5 0a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                      </svg>
                      <GoogleAddressInput
                        id="address"
                        value={address}
                        onChange={(value) => {
                          setAddress(value);
                          setFormattedAddress('');
                          setPlaceId('');
                          setLatitude('');
                          setLongitude('');
                        }}
                        onPlaceSelected={handlePlaceSelected}
                        placeholder={t('host.createRoom.addressPlaceholder')}
                        inputClassName="h-[58px] w-full rounded-lg border border-[#C3C6D7] bg-white pl-10 pr-12 text-base text-[#191B23] outline-none placeholder:text-[#6B7280] focus:ring-2 focus:ring-[#004AC6]/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-[4.5px]">
                  <FieldLabel htmlFor="area">{t('host.createRoom.area')}</FieldLabel>
                  <div className="relative">
                    <input
                      id="area"
                      type="number"
                      min="1"
                      value={area}
                      onChange={(event) => setArea(event.target.value)}
                      className="h-[58px] w-full rounded-lg border border-[#C3C6D7] bg-white px-4 pr-12 text-base text-[#191B23] outline-none focus:ring-2 focus:ring-[#004AC6]/20"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base text-[#C3C6D7]">
                      m²
                    </span>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="relative z-10">
            <SectionCard number={3} title={t('host.createRoom.priceCosts')}>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-[4.5px]">
                  <FieldLabel htmlFor="monthly-rent">{t('host.createRoom.monthlyRent')}</FieldLabel>
                  <input
                    id="monthly-rent"
                    type="text"
                    inputMode="numeric"
                    value={monthlyRent}
                    onChange={(event) => setMonthlyRent(formatMoneyInput(event.target.value))}
                    placeholder="VD: 4.500.000"
                    className={priceInputClass}
                  />
                </div>
                <div className="flex flex-col gap-[4.5px]">
                  <FieldLabel htmlFor="deposit-amount">{t('host.createRoom.deposit')}</FieldLabel>
                  <input
                    id="deposit-amount"
                    type="text"
                    inputMode="numeric"
                    value={depositAmount}
                    onChange={(event) => setDepositAmount(formatMoneyInput(event.target.value))}
                    placeholder="VD: 4.500.000"
                    className={priceInputClass}
                  />
                </div>
                <div className="flex flex-col gap-[4.5px]">
                  <FieldLabel htmlFor="electricity-cost">{t('host.createRoom.electricityCost')}</FieldLabel>
                  <input
                    id="electricity-cost"
                    type="text"
                    inputMode="numeric"
                    value={electricityCost}
                    onChange={(event) => setElectricityCost(formatMoneyInput(event.target.value))}
                    placeholder="0"
                    className={priceInputClass}
                  />
                </div>
                <div className="flex flex-col gap-[4.5px]">
                  <FieldLabel htmlFor="water-cost">{t('host.createRoom.waterCost')}</FieldLabel>
                  <input
                    id="water-cost"
                    type="text"
                    inputMode="numeric"
                    value={waterCost}
                    onChange={(event) => setWaterCost(formatMoneyInput(event.target.value))}
                    placeholder="0"
                    className={priceInputClass}
                  />
                </div>
                <div className="flex flex-col gap-[4.5px]">
                  <FieldLabel htmlFor="internet-cost">{t('host.createRoom.internetCost')}</FieldLabel>
                  <input
                    id="internet-cost"
                    type="text"
                    inputMode="numeric"
                    value={internetCost}
                    onChange={(event) => setInternetCost(formatMoneyInput(event.target.value))}
                    placeholder="0"
                    className={priceInputClass}
                  />
                </div>
                <div className="flex flex-col gap-[4.5px]">
                  <FieldLabel htmlFor="service-fee">{t('host.createRoom.serviceFee')}</FieldLabel>
                  <input
                    id="service-fee"
                    type="text"
                    inputMode="numeric"
                    value={serviceFee}
                    onChange={(event) => setServiceFee(formatMoneyInput(event.target.value))}
                    placeholder="0"
                    className={priceInputClass}
                  />
                </div>
              </div>
            </SectionCard>
          </div>

          <SectionCard number={4} title={t('host.createRoom.amenities')}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {amenityOptions.map((amenity) => {
                const checked = amenities.includes(amenity.key);
                return (
                  <label
                    key={amenity.key}
                    className="flex h-[80px] cursor-pointer items-center gap-4 rounded-lg border border-[#C3C6D7] bg-white px-4 text-base leading-6 text-[#191B23] transition hover:border-[#004AC6]/40"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleAmenityToggle(amenity.key)}
                      className="h-5 w-5 rounded border-[#C3C6D7] accent-[#004AC6]"
                    />
                    <span>{amenity.label}</span>
                  </label>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard number={5} title={t('host.createRoom.images')}>
            <input
              ref={mainImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleMainImageSelected}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <div className="mb-2">
                  <h3 className="text-sm font-bold text-[#191B23]">{t('host.createRoom.mainImage')}</h3>
                  <p className="text-xs text-[#434655]">{t('host.createRoom.mainImageHint')}</p>
                </div>
                {mainImage ? (
                  <figure className="group relative aspect-[459/308] overflow-hidden rounded-lg border-2 border-[#004AC6] bg-[#E1E2ED]">
                    <img src={mainImage.url} alt={t('host.createRoom.mainImage')} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => mainImageInputRef.current?.click()}
                        className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#004AC6] shadow-sm"
                      >
                        {t('host.createRoom.changeMainImage')}
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveMainImage}
                        aria-label={t('host.createRoom.removeMainImage')}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#BA1A1A] shadow-sm"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M10 11v6M14 11v6M9 7V5h6v2M8 7l1 13h6l1-13" />
                        </svg>
                      </button>
                    </div>
                    <figcaption className="absolute bottom-2 left-2 rounded bg-[#004AC6] px-2 py-1 text-[10px] font-bold leading-[15px] text-white">
                      {t('host.createRoom.coverImage')}
                    </figcaption>
                  </figure>
                ) : (
                  <button
                    type="button"
                    onClick={() => mainImageInputRef.current?.click()}
                    className="flex aspect-[459/308] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#004AC6] bg-[#F3F3FE]/40 px-4 text-center transition hover:bg-[#F3F3FE]"
                  >
                    <svg className="h-10 w-10 text-[#004AC6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4zM8 13l2-2 3 3 2-2 3 3" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m-2-2h4" />
                    </svg>
                    <span className="mt-3 text-sm font-bold text-[#004AC6]">{t('host.createRoom.chooseMainImage')}</span>
                  </button>
                )}
              </div>

              <div>
                <div className="mb-2">
                  <h3 className="text-sm font-bold text-[#191B23]">{t('host.createRoom.roomImages')}</h3>
                  <p className="text-xs text-[#434655]">
                    {t('host.createRoom.uploadInstruction')} {MIN_REQUIRED_IMAGES} {t('host.createRoom.uploadInstructionMax')} {MAX_ROOM_IMAGES})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUploadClick}
                  disabled={images.length >= MAX_ROOM_IMAGES - 1}
                  className="flex aspect-[459/308] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#C3C6D7] bg-[#F3F3FE]/40 px-4 text-center transition hover:border-[#004AC6]/50 hover:bg-[#F3F3FE] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg className="h-11 w-11 text-[#004AC6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.6-1.9A4.5 4.5 0 0 1 18 15h-3" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v8m0-8l-3 3m3-3l3 3" />
                  </svg>
                  <span className="mt-4 text-base font-bold leading-6 text-[#191B23]">
                    {t('host.createRoom.uploadImages')}
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs font-bold leading-3 tracking-[0.6px]">
              <span className="text-[#434655]">
                {t('host.createRoom.uploaded')} ({imageCount}/{MAX_ROOM_IMAGES})
              </span>
              {missingImages > 0 && (
                <span className="text-[#BA1A1A]">{t('host.createRoom.needMore')} {missingImages} {t('host.createRoom.needMoreSuffix')}</span>
              )}
            </div>

            {images.length > 0 && (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {images.map((image, idx) => (
                  <figure
                    key={image.id}
                    className="group relative aspect-[459/308] overflow-hidden rounded-lg bg-[#E1E2ED]"
                  >
                    <img src={image.url} alt={`Ảnh phòng ${idx + 1}`} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(image.id)}
                        aria-label={`Xóa ảnh ${idx + 1}`}
                        title="Xóa ảnh"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#BA1A1A] shadow-sm"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M10 11v6M14 11v6M9 7V5h6v2M8 7l1 13h6l1-13" />
                        </svg>
                      </button>
                    </div>
                    <figcaption className="absolute bottom-1 left-1 rounded bg-[#004AC6] px-2 py-1 text-[10px] font-bold leading-[15px] text-white">
                      {`${t('host.createRoom.imagePrefix')} ${idx + 1}`}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </SectionCard>
        </form>
      </section>
    </main>
  );
}
