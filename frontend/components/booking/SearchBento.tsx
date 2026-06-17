'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, Suspense } from 'react';
import { MapPinIcon, SearchIcon, WalletIcon } from './Icons';

const roomTypes = ['Phòng trọ', 'Căn hộ', 'Ở ghép'];
const budgetOptions = ['Dưới 1 triệu', '1 - 3 triệu', 'Trên 3 triệu'];
const LOCATION_CATEGORIES = [
  {
    id: 'old-districts',
    name: 'Quận cũ (Khu Đông)',
    items: ['Quận 2', 'Quận 9', 'Quận Thủ Đức']
  },
  {
    id: 'inner-districts',
    name: 'Quận nội thành HCMC',
    items: [
      'Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8',
      'Quận 10', 'Quận 11', 'Quận 12', 'Quận Bình Thạnh', 'Quận Gò Vấp',
      'Quận Phú Nhuận', 'Quận Tân Bình', 'Quận Tân Phú', 'Quận Bình Tân'
    ]
  },
  {
    id: 'outer-districts',
    name: 'Huyện ngoại thành HCMC',
    items: ['Huyện Bình Chánh', 'Huyện Hóc Môn', 'Huyện Củ Chi', 'Huyện Nhà Bè', 'Huyện Cần Giờ']
  },
  {
    id: 'streets',
    name: 'Đường lớn phổ biến',
    items: [
      'Đường Võ Văn Ngân', 'Đường Kha Vạn Cân', 'Đường Nguyễn Văn Cừ', 'Đường Điện Biên Phủ',
      'Đường Cách Mạng Tháng Tám', 'Đường Quang Trung', 'Đường Cộng Hòa', 'Đường Võ Thị Sáu'
    ]
  },
  {
    id: 'areas',
    name: 'Khu vực nổi bật',
    items: ['Làng Đại Học', 'Khu Công Nghệ Cao', 'Hồ Con Rùa', 'Phú Mỹ Hưng', 'Thảo Điền', 'Chợ Bến Thành']
  }
];

function SearchBentoInner({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [type, setType] = useState('');

  // Sync local states from URL query parameters on load or query change
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const b = searchParams.get('budget') || '';
    const t = searchParams.get('type') || '';
    setLocation(q);
    setBudget(b);
    setType(t);
  }, [searchParams]);

  // Location modal selection states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftSelectedItems, setDraftSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  function handleOpenModal() {
    const currentItems = location ? location.split(', ').filter(Boolean) : [];
    setDraftSelectedItems(currentItems);
    setSearchQuery('');
    setIsModalOpen(true);
  }

  function handleToggleItem(item: string) {
    setDraftSelectedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  function handleConfirm() {
    setLocation(draftSelectedItems.join(', '));
    setIsModalOpen(false);
  }

  function handleCancel() {
    setIsModalOpen(false);
  }

  function handleClearAll() {
    setDraftSelectedItems([]);
  }

  function handleSearch() {
    const params = new URLSearchParams();
    if (location.trim()) params.set('q', location.trim());
    if (budget.trim()) params.set('budget', budget.trim());
    if (type) params.set('type', type);
    router.push(`/rooms${params.toString() ? `?${params.toString()}` : ''}`);
  }

  // Filter matching items across all categories for searching inside the modal picker
  const filteredCategories = LOCATION_CATEGORIES.map((category) => {
    const matchedItems = category.items.filter((item) =>
      item.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
    return { ...category, items: matchedItems };
  }).filter((cat) => cat.items.length > 0);

  return (
    <div className={`mx-auto w-full rounded-xl border border-booking-border bg-booking-surface p-3 shadow-[0_10px_22px_rgba(25,27,35,0.12)] ${compact ? '' : 'max-w-4xl sm:p-4'}`}>
      <div className="grid gap-2 md:grid-cols-[2fr_1.1fr_1.1fr_auto] md:items-center">
        
        {/* Location Selector Input */}
        <div
          onClick={handleOpenModal}
          className="flex min-h-14 items-center gap-3 rounded-lg border border-booking-border bg-white px-4 text-booking-primary transition focus-within:border-booking-primary cursor-pointer hover:border-booking-primary/60"
        >
          <MapPinIcon className="h-5 w-5 shrink-0" />
          <input
            readOnly
            value={location}
            placeholder="Chọn khu vực, quận, đường..."
            className="w-full bg-transparent text-base text-booking-text outline-none placeholder:text-booking-muted cursor-pointer select-none truncate"
          />
        </div>

        {/* Budget Selector */}
        <div className="relative w-full">
          <select
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
            className="w-full min-h-14 rounded-lg border border-booking-border bg-white pl-4 pr-10 text-base text-booking-text outline-none transition focus:border-booking-primary cursor-pointer appearance-none"
          >
            <option value="">Giá phòng</option>
            {budgetOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
            <svg className="h-4 w-4 text-booking-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Room Type Selector */}
        <div className="relative w-full">
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="w-full min-h-14 rounded-lg border border-booking-border bg-white pl-4 pr-10 text-base text-booking-text outline-none transition focus:border-booking-primary cursor-pointer appearance-none"
          >
            <option value="">Loại phòng</option>
            {roomTypes.map((roomType) => (
              <option key={roomType} value={roomType}>
                {roomType}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
            <svg className="h-4 w-4 text-booking-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Search Button */}
        <button
          type="button"
          onClick={handleSearch}
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-booking-primary px-6 text-sm font-bold text-white shadow-sm transition hover:bg-booking-primaryDark cursor-pointer"
        >
          <SearchIcon className="h-4 w-4" />
          Tìm ngay
        </button>

      </div>

      {/* Separate Selection Modal Panel */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={handleCancel}
        >
          <div
            className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-booking-border animate-in zoom-in-95 duration-200 text-booking-text"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="relative flex items-center justify-between px-6 py-4 border-b border-booking-border bg-booking-surface/30">
              <div className="w-8 shrink-0" /> {/* Spacer to balance the close button on the right */}
              <h3 className="text-xl font-bold text-booking-text text-center flex-1">Chọn khu vực tìm kiếm</h3>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1.5 rounded-lg hover:bg-booking-surface text-booking-muted hover:text-booking-text transition-colors cursor-pointer shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Search Input */}
            <div className="px-6 pt-4">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-booking-muted">
                  <SearchIcon className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="Tìm nhanh quận, đường, khu vực..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-booking-border rounded-xl outline-none focus:border-booking-primary bg-booking-surface/30 text-booking-text transition-all focus:bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-booking-muted hover:text-booking-text text-xs font-bold font-sans"
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>

            {/* Modal Main Content (Scrollable Categories) */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 max-h-[60vh]">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category) => (
                  <div key={category.id} className="border-b border-booking-border/30 pb-4 last:border-0 last:pb-0">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-booking-primary mb-3">
                      {category.name}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {category.items.map((item) => {
                        const isChecked = draftSelectedItems.includes(item);
                        return (
                          <label
                            key={item}
                            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-booking-border/50 hover:bg-booking-surface/60 hover:border-booking-primary/30 cursor-pointer transition-all text-sm text-booking-text select-none ${isChecked ? 'bg-booking-surface font-bold border-booking-primary text-booking-primary font-semibold' : 'bg-white'}`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleItem(item)}
                              className="rounded text-booking-primary focus:ring-booking-primary h-4 w-4 accent-booking-primary cursor-pointer shrink-0"
                            />
                            <span className="truncate">{item}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-sm text-booking-muted italic">Không tìm thấy địa điểm phù hợp</p>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-booking-border bg-booking-surface/30">
              <button
                type="button"
                onClick={handleClearAll}
                disabled={draftSelectedItems.length === 0}
                className="text-sm text-red-600 hover:text-red-800 font-bold hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed transition"
              >
                Xóa tất cả các mục đã chọn
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-bold rounded-xl border border-booking-border text-booking-text hover:bg-booking-surface transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-5 py-2 text-sm font-extrabold rounded-xl bg-booking-primary text-white hover:bg-booking-primaryDark shadow transition-colors cursor-pointer"
                >
                  Áp dụng ({draftSelectedItems.length})
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
