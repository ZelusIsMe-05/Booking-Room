'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import HostSidebar from '@/components/host/HostSidebar';
import GoogleAddressInput, { type SelectedPlace } from '@/components/host/GoogleAddressInput';
import { hostRoomService, type HostRoom } from '@/services/hostRoomService';
import { roomTypeOptions } from '@/data/hostCreateRoom';

interface UploadPreview {
  id: string;
  file: File;
  url: string;
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
        <button type="button" aria-label="Thông báo" title="Thông báo" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 0 0 6 0" />
          </svg>
        </button>
        <button type="button" aria-label="Trợ giúp" title="Trợ giúp" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.1 9a3 3 0 1 1 4.8 2.4c-.9.6-1.4 1.1-1.4 2.1v.3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        </button>
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

const statusMeta: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  AVAILABLE: { label: 'Đang hoạt động', dot: '#006A61', text: '#006A61', bg: 'rgba(0,106,97,0.1)' },
  RENTED: { label: 'Đã cho thuê', dot: '#434655', text: '#434655', bg: 'rgba(67,70,85,0.1)' },
  LOCKED: { label: 'Đang giữ chỗ', dot: '#943700', text: '#943700', bg: 'rgba(148,55,0,0.1)' },
};

export default function HostEditRoomPage({ listingId }: { listingId: string }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Mỗi lần mở trang chỉnh sửa, link truyền ?r=<timestamp> khác nhau ⇒ buộc
  // tải lại dữ liệu mới nhất (kể cả khi component được tái dùng từ Router Cache).
  const refreshKey = searchParams.get('r');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const [newImages, setNewImages] = useState<UploadPreview[]>([]);
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
          setLoadError('Không tìm thấy phòng hoặc bạn không có quyền chỉnh sửa.');
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
      } catch (err: any) {
        if (!cancelled) setLoadError(err?.message || 'Không tải được thông tin phòng.');
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
      newImages.forEach((img) => URL.revokeObjectURL(img.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setNewImages((current) => [
      ...current,
      ...selected.map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        url: URL.createObjectURL(file),
      })),
    ]);
    event.target.value = '';
  };

  const handleRemoveNewImage = (id: string) => {
    setNewImages((current) => {
      const target = current.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((img) => img.id !== id);
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

    if (!title.trim()) return setError('Vui lòng nhập tên phòng.');
    if (!address.trim()) return setError('Vui lòng nhập địa chỉ.');
    if (!rentValue || Number(rentValue) <= 0) return setError('Giá thuê hàng tháng phải lớn hơn 0.');
    if (depositValue === '' || Number(depositValue) < 0) return setError('Tiền đặt cọc không hợp lệ.');
    if (!capacity || Number(capacity) <= 0) return setError('Sức chứa phải lớn hơn 0.');

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
    newImages.forEach((img) => formData.append('images', img.file));

    setSubmitting(true);
    try {
      await hostRoomService.updateRoom(room.room_id, formData);
      // Về trang chi tiết để chủ phòng thấy ngay nội dung vừa cập nhật
      // (trang danh sách không hiển thị mô tả/chi phí/địa chỉ đầy đủ).
      router.push(`/host/listings/${room.room_id}`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Cập nhật thất bại. Vui lòng thử lại.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <HostSidebar user={user} onLogout={handleLogout} activePage="listings" />
        <section className="flex min-h-screen items-center justify-center lg:ml-64">
          <p className="text-base font-semibold text-[#434655]">Đang tải thông tin phòng...</p>
        </section>
      </main>
    );
  }

  if (loadError || !room) {
    return (
      <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <HostSidebar user={user} onLogout={handleLogout} activePage="listings" />
        <section className="flex min-h-screen flex-col items-center justify-center gap-4 lg:ml-64">
          <p className="text-base font-semibold text-[#BA1A1A]">{loadError || 'Không tìm thấy phòng.'}</p>
          <Link href="/host/listings" className="rounded-lg bg-[#004AC6] px-6 py-3 text-base text-white hover:bg-[#003f9e]">
            Quay lại danh sách
          </Link>
        </section>
      </main>
    );
  }

  const badge = statusMeta[room.status] || statusMeta.AVAILABLE;
  const existingImages = room.images || [];

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <HostSidebar user={user} onLogout={handleLogout} activePage="listings" />
      <section className="flex min-h-screen flex-col lg:ml-64">
        <TopIcons />

        <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-[1024px] flex-col gap-4 p-4 sm:p-6">
          <nav className="flex items-center gap-1 text-sm leading-[21px]" aria-label="Breadcrumb">
            <Link href="/host" className="text-[#434655] hover:text-[#004AC6]">Dashboard</Link>
            <span className="text-[#434655]">›</span>
            <Link href="/host/listings" className="text-[#434655] hover:text-[#004AC6]">My Listings</Link>
            <span className="text-[#434655]">›</span>
            <span className="font-semibold text-[#191B23]">Edit Room</span>
          </nav>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-[32px] font-bold leading-[38px]">Chỉnh sửa thông tin phòng</h1>
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
                Hủy bỏ
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="flex h-[42px] items-center rounded-lg bg-[#004AC6] px-6 text-base leading-6 text-white shadow-[0_10px_15px_-3px_rgba(0,74,198,0.2)] hover:bg-[#003f9e] disabled:opacity-60"
              >
                {submitting ? 'Đang lưu...' : 'Cập nhật thay đổi'}
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
                title="Thông tin cơ bản"
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" />
                  </svg>
                }
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="edit-title">Tên phòng</Label>
                      <input id="edit-title" value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-type">Loại phòng</Label>
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
                    <Label htmlFor="edit-capacity">Sức chứa (Người)</Label>
                    <input id="edit-capacity" type="number" min="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} className={inputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="edit-description">Mô tả phòng</Label>
                      <textarea id="edit-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="rounded-lg border border-[#C3C6D7] bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[#004AC6]/20" />
                    </div>
                  </div>
                </div>
              </EditSection>

              <EditSection
                title="Giá & Chi phí"
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                }
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-rent">Giá thuê hàng tháng (đ)</Label>
                    <input id="edit-rent" type="text" inputMode="numeric" placeholder="6.500.000" value={monthlyRent} onChange={(event) => setMonthlyRent(formatMoneyInput(event.target.value))} className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-deposit">Tiền đặt cọc (đ)</Label>
                    <input id="edit-deposit" type="text" inputMode="numeric" placeholder="6.500.000" value={depositAmount} onChange={(event) => setDepositAmount(formatMoneyInput(event.target.value))} className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-electricity">Phí điện (đ/kWh)</Label>
                    <input id="edit-electricity" type="text" inputMode="numeric" placeholder="0" value={electricityCost} onChange={(event) => setElectricityCost(formatMoneyInput(event.target.value))} className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-water">Phí nước (đ/khối)</Label>
                    <input id="edit-water" type="text" inputMode="numeric" placeholder="0" value={waterCost} onChange={(event) => setWaterCost(formatMoneyInput(event.target.value))} className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-internet">Phí internet (đ/tháng)</Label>
                    <input id="edit-internet" type="text" inputMode="numeric" placeholder="0" value={internetCost} onChange={(event) => setInternetCost(formatMoneyInput(event.target.value))} className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-service">Phí dịch vụ (đ/tháng)</Label>
                    <input id="edit-service" type="text" inputMode="numeric" placeholder="0" value={serviceFee} onChange={(event) => setServiceFee(formatMoneyInput(event.target.value))} className={inputClass} />
                  </div>
                </div>
              </EditSection>

              <EditSection
                title="Vị trí"
                className="relative z-30"
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-4.6 7-11a7 7 0 1 0-14 0c0 6.4 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" />
                  </svg>
                }
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <Label htmlFor="edit-address">Địa chỉ</Label>
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
                      placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                      inputClassName={inputClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-latitude">Vĩ độ</Label>
                    <input id="edit-latitude" type="number" step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-longitude">Kinh độ</Label>
                    <input id="edit-longitude" type="number" step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} className={inputClass} />
                  </div>
                </div>
              </EditSection>
            </div>

            <aside className="rounded-xl border border-[rgba(226,232,240,0.5)] bg-white/80 p-6 shadow-sm backdrop-blur-md">
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesSelected} />
              <div className="flex items-center justify-between border-b border-[#C3C6D7] pb-4">
                <h2 className="flex items-center gap-2 text-2xl font-semibold leading-[31px]">
                  <svg className="h-5 w-5 text-[#004AC6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4zM8 13l2-2 3 3 2-2 3 3" />
                  </svg>
                  Hình ảnh
                </h2>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded px-2 py-1 text-base text-[#004AC6] hover:bg-[#F3F3FE]">
                  Thêm ảnh
                </button>
              </div>

              {newImages.length > 0 && (
                <p className="mt-4 rounded-lg bg-[rgba(148,55,0,0.08)] px-3 py-2 text-xs font-semibold text-[#943700]">
                  Lưu ý: tải ảnh mới sẽ thay thế toàn bộ ảnh hiện tại của phòng.
                </p>
              )}

              <div className="mt-6 space-y-4">
                {newImages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {newImages.map((image, idx) => (
                      <figure key={image.id} className="group relative">
                        <img src={image.url} alt={`Ảnh mới ${idx + 1}`} className="h-[120px] w-full rounded-lg border border-[#C3C6D7] object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveNewImage(image.id)}
                          aria-label="Xóa ảnh"
                          className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#BA1A1A] shadow-sm"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M10 11v6M14 11v6M9 7V5h6v2M8 7l1 13h6l1-13" />
                          </svg>
                        </button>
                      </figure>
                    ))}
                  </div>
                ) : existingImages.length > 0 ? (
                  <>
                    <figure className="relative overflow-hidden rounded-lg border border-[#C3C6D7]">
                      <img src={existingImages[0].image_url} alt="Ảnh bìa" className="h-[194px] w-full object-cover" />
                      <figcaption className="absolute bottom-2 left-2 rounded bg-[rgba(0,74,198,0.9)] px-2 py-1 text-[10px] font-bold text-white">ẢNH BÌA</figcaption>
                    </figure>
                    {existingImages.length > 1 && (
                      <div className="grid grid-cols-2 gap-4">
                        {existingImages.slice(1, 5).map((image) => (
                          <img key={image.image_url} src={image.image_url} alt="Ảnh phòng" className="h-[120px] w-full rounded-lg border border-[#C3C6D7] object-cover" />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-[120px] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#C3C6D7] text-sm text-[#434655] hover:border-[#004AC6] hover:text-[#004AC6]">
                    <svg className="mb-1 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                    </svg>
                    Tải lên từ thiết bị
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
