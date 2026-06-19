'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import HostSidebar from '@/components/host/HostSidebar';
import { hostRoomService } from '@/services/hostRoomService';
import {
  MAX_ROOM_IMAGES,
  MIN_REQUIRED_IMAGES,
  amenityOptions,
  cityOptions,
  roomTypeOptions,
} from '@/data/hostCreateRoom';

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

function SelectChevron() {
  return (
    <svg
      className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6B7280]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

const priceInputClass =
  'h-[58px] rounded-lg border border-[#C3C6D7] bg-white px-4 text-base text-[#191B23] outline-none placeholder:text-[#6B7280] focus:ring-2 focus:ring-[#004AC6]/20';

export default function HostCreateRoomPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [roomType, setRoomType] = useState(roomTypeOptions[0].value);
  const [capacity, setCapacity] = useState('2');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('45');
  const [city, setCity] = useState(cityOptions[0].value);
  const [amenities, setAmenities] = useState<string[]>([]);

  // Pricing
  const [monthlyRent, setMonthlyRent] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [electricityCost, setElectricityCost] = useState('');
  const [waterCost, setWaterCost] = useState('');
  const [internetCost, setInternetCost] = useState('');
  const [serviceFee, setServiceFee] = useState('');

  const [images, setImages] = useState<UploadPreview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missingImages = Math.max(0, MIN_REQUIRED_IMAGES - images.length);

  // Revoke object URLs on unmount to avoid leaks.
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cityLabel = useMemo(
    () => cityOptions.find((c) => c.value === city)?.label ?? city,
    [city],
  );

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

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length === 0) return;
    setImages((current) => {
      const remaining = MAX_ROOM_IMAGES - current.length;
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    // Client-side validation mirroring the backend rules.
    if (!title.trim()) return setError('Vui lòng nhập tên phòng.');
    if (!address.trim()) return setError('Vui lòng nhập địa chỉ chi tiết.');
    if (!monthlyRent || Number(monthlyRent) <= 0) return setError('Giá thuê hàng tháng phải lớn hơn 0.');
    if (depositAmount === '' || Number(depositAmount) < 0) return setError('Tiền đặt cọc không hợp lệ.');
    if (!capacity || Number(capacity) <= 0) return setError('Sức chứa phải lớn hơn 0.');
    if (images.length < MIN_REQUIRED_IMAGES) return setError(`Cần tối thiểu ${MIN_REQUIRED_IMAGES} hình ảnh.`);

    const roomTypeLabel = roomTypeOptions.find((o) => o.value === roomType)?.label ?? roomType;
    const fullAddress = address.trim().toLocaleLowerCase('vi-VN').includes(cityLabel.toLocaleLowerCase('vi-VN'))
      ? address.trim()
      : `${address.trim()}, ${cityLabel}`;

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('room_type', roomTypeLabel);
    formData.append('detailed_address', fullAddress);
    formData.append('max_capacity', String(capacity));
    formData.append('monthly_rent', String(monthlyRent));
    formData.append('deposit_amount', String(depositAmount));
    formData.append('electricity_cost', String(electricityCost || 0));
    formData.append('water_cost', String(waterCost || 0));
    formData.append('internet_cost', String(internetCost || 0));
    formData.append('service_fee', String(serviceFee || 0));
    if (description.trim()) formData.append('room_description', description.trim());
    images.forEach((img) => formData.append('images', img.file));

    setSubmitting(true);
    try {
      await hostRoomService.createRoom(formData);
      router.push('/host/listings');
    } catch (err: any) {
      setError(err?.message || 'Tạo phòng thất bại. Vui lòng thử lại.');
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF8FF] text-[#191B23]">
      <HostSidebar user={user} onLogout={handleLogout} activePage="listings" />

      <section className="flex min-h-screen flex-col lg:ml-[272px]">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-end border-b border-[#E1E2ED] bg-[#FAF8FF] px-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-2 text-[#004AC6]">
            <button
              type="button"
              aria-label="Thông báo"
              title="Thông báo"
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 0 0 6 0" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Trợ giúp"
              title="Trợ giúp"
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.1 9a3 3 0 1 1 4.8 2.4c-.9.6-1.4 1.1-1.4 2.1v.3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
            </button>
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
                  Dashboard
                </Link>
                <span className="text-[#434655]">/</span>
                <Link href="/host/listings" className="text-[#434655] hover:text-[#004AC6]">
                  My Listings
                </Link>
                <span className="text-[#434655]">/</span>
                <span className="text-[#191B23]">Create New Room</span>
              </nav>
              <h1 className="mt-2 text-[32px] font-bold leading-[38px] text-[#191B23]">
                Tạo mới phòng của bạn
              </h1>
              <p className="mt-1 text-base leading-6 text-[#434655]">
                Hoàn thành các thông tin dưới đây để đăng phòng. Phòng sẽ chờ quản trị viên duyệt.
              </p>
            </div>

            <div className="flex shrink-0 gap-4">
              <button
                type="button"
                onClick={handleCancel}
                className="flex h-[58px] min-w-[81px] items-center justify-center rounded-lg border border-[#737686] bg-transparent px-6 text-base leading-6 text-[#191B23] transition hover:bg-white"
              >
                Hủy
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
                {submitting ? 'Đang lưu...' : 'Đăng phòng'}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-[#FFB4AB] bg-[rgba(186,26,26,0.08)] px-4 py-3 text-sm font-semibold text-[#BA1A1A]">
              {error}
            </div>
          )}

          <SectionCard number={1} title="Thông Tin Cơ Bản">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="flex flex-col gap-[4.5px]">
                  <FieldLabel htmlFor="room-title">Tên Phòng / Tiêu đề niêm yết</FieldLabel>
                  <input
                    id="room-title"
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="VD: Căn hộ Studio hiện đại view sông Sài Gòn"
                    className={priceInputClass}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-[4.5px]">
                <FieldLabel htmlFor="room-type">Loại hình</FieldLabel>
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
                  <SelectChevron />
                </div>
              </div>

              <div className="flex flex-col gap-[4.5px]">
                <FieldLabel htmlFor="capacity">Sức chứa (Người)</FieldLabel>
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
                  <FieldLabel htmlFor="description">Mô tả phòng</FieldLabel>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    placeholder="Mô tả chi tiết về phòng, tiện nghi, khu vực xung quanh..."
                    className="rounded-lg border border-[#C3C6D7] bg-white px-4 py-3 text-base text-[#191B23] outline-none placeholder:text-[#6B7280] focus:ring-2 focus:ring-[#004AC6]/20"
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard number={2} title="Không Gian & Vị Trí">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="flex flex-col gap-[4.5px]">
                  <FieldLabel htmlFor="address">Địa chỉ chi tiết</FieldLabel>
                  <div className="relative">
                    <svg
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#434655]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-4.6 7-11a7 7 0 1 0-14 0c0 6.4 7 11 7 11z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    <input
                      id="address"
                      type="text"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder="Số nhà, tên đường, Phường/Xã, Quận/Huyện..."
                      className="h-[58px] w-full rounded-lg border border-[#C3C6D7] bg-white pl-10 pr-4 text-base text-[#191B23] outline-none placeholder:text-[#6B7280] focus:ring-2 focus:ring-[#004AC6]/20"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-[4.5px]">
                <FieldLabel htmlFor="area">Diện tích (m2)</FieldLabel>
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

              <div className="flex flex-col gap-[4.5px]">
                <FieldLabel htmlFor="city">Tỉnh/Thành phố</FieldLabel>
                <div className="relative">
                  <select
                    id="city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className="h-[58px] w-full appearance-none rounded-lg border border-[#C3C6D7] bg-white px-4 pr-12 text-base text-[#191B23] outline-none focus:ring-2 focus:ring-[#004AC6]/20"
                  >
                    {cityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <SelectChevron />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard number={3} title="Giá & Chi Phí">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-[4.5px]">
                <FieldLabel htmlFor="monthly-rent">Giá thuê hàng tháng (đ)</FieldLabel>
                <input
                  id="monthly-rent"
                  type="number"
                  min="0"
                  value={monthlyRent}
                  onChange={(event) => setMonthlyRent(event.target.value)}
                  placeholder="VD: 4500000"
                  className={priceInputClass}
                />
              </div>
              <div className="flex flex-col gap-[4.5px]">
                <FieldLabel htmlFor="deposit-amount">Tiền đặt cọc (đ)</FieldLabel>
                <input
                  id="deposit-amount"
                  type="number"
                  min="0"
                  value={depositAmount}
                  onChange={(event) => setDepositAmount(event.target.value)}
                  placeholder="VD: 4500000"
                  className={priceInputClass}
                />
              </div>
              <div className="flex flex-col gap-[4.5px]">
                <FieldLabel htmlFor="electricity-cost">Phí điện (đ)</FieldLabel>
                <input
                  id="electricity-cost"
                  type="number"
                  min="0"
                  value={electricityCost}
                  onChange={(event) => setElectricityCost(event.target.value)}
                  placeholder="0"
                  className={priceInputClass}
                />
              </div>
              <div className="flex flex-col gap-[4.5px]">
                <FieldLabel htmlFor="water-cost">Phí nước (đ)</FieldLabel>
                <input
                  id="water-cost"
                  type="number"
                  min="0"
                  value={waterCost}
                  onChange={(event) => setWaterCost(event.target.value)}
                  placeholder="0"
                  className={priceInputClass}
                />
              </div>
              <div className="flex flex-col gap-[4.5px]">
                <FieldLabel htmlFor="internet-cost">Phí internet (đ)</FieldLabel>
                <input
                  id="internet-cost"
                  type="number"
                  min="0"
                  value={internetCost}
                  onChange={(event) => setInternetCost(event.target.value)}
                  placeholder="0"
                  className={priceInputClass}
                />
              </div>
              <div className="flex flex-col gap-[4.5px]">
                <FieldLabel htmlFor="service-fee">Phí dịch vụ (đ)</FieldLabel>
                <input
                  id="service-fee"
                  type="number"
                  min="0"
                  value={serviceFee}
                  onChange={(event) => setServiceFee(event.target.value)}
                  placeholder="0"
                  className={priceInputClass}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard number={4} title="Tiện Ích & Dịch Vụ">
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

          <SectionCard number={5} title="Hình Ảnh (Multimedia)">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />

            <button
              type="button"
              onClick={handleUploadClick}
              className="flex min-h-[188px] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#C3C6D7] bg-[#F3F3FE]/40 px-4 text-center transition hover:border-[#004AC6]/50 hover:bg-[#F3F3FE]"
            >
              <svg className="h-11 w-11 text-[#004AC6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.6-1.9A4.5 4.5 0 0 1 18 15h-3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v8m0-8l-3 3m3-3l3 3" />
              </svg>
              <span className="mt-4 text-base font-bold leading-6 text-[#191B23]">
                Tải hình ảnh lên
              </span>
              <span className="text-sm leading-[21px] text-[#434655]">
                Nhấn để chọn (Tối thiểu {MIN_REQUIRED_IMAGES} hình, tối đa {MAX_ROOM_IMAGES})
              </span>
            </button>

            <div className="mt-4 flex items-center justify-between text-xs font-bold leading-3 tracking-[0.6px]">
              <span className="text-[#434655]">
                ĐÃ TẢI LÊN ({images.length}/{MAX_ROOM_IMAGES})
              </span>
              {missingImages > 0 && (
                <span className="text-[#BA1A1A]">Cần thêm {missingImages} hình</span>
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
                      {idx === 0 ? 'ẢNH BÌA' : `ẢNH ${idx + 1}`}
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
