'use client';

// =============================================================
// frontend/components/SearchFilter.tsx
// Thanh tìm kiếm / lọc phòng ở trang chủ.
// Client Component vì cần useState cho dropdown Loại phòng.
// =============================================================

import { useState, useRef, useEffect } from 'react';

const ROOM_TYPES = ['Phòng trọ', 'Căn hộ'];

export default function SearchFilter() {
  // Trạng thái mở/đóng dropdown loại phòng
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // Giá trị đang được chọn (null = chưa chọn)
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Ref để đóng dropdown khi click ra ngoài
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectType = (type: string) => {
    setSelectedType(type);
    setIsDropdownOpen(false);
  };

  return (
    // Container bọc ngoài - nền trắng, bo tròn, shadow nhẹ, có border (đúng như thiết kế)
    <div className="bg-white border border-gray-200 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.06)] p-3 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-1.5 md:gap-2">

        {/* ---- Box 1: Khu vực ---- */}
        <div className="flex items-center gap-2 md:gap-1.5 lg:gap-3 px-4 md:px-2.5 lg:px-4 py-3 border border-gray-200 rounded-xl hover:border-[#0052CC]/50 transition-colors md:flex-[2.3] flex-1 min-w-0 bg-white">
          <span className="text-[#0052CC] shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Khu vực, quận, huyện hoặc tên đường..."
            className="w-full text-sm md:text-xs lg:text-sm text-[#172B4D] placeholder-gray-400 focus:outline-none bg-transparent"
          />
        </div>

        {/* ---- Box 2: Giá tiền ---- */}
        <div className="flex items-center gap-2 md:gap-1.5 lg:gap-3 px-4 md:px-2.5 lg:px-4 py-3 border border-gray-200 rounded-xl hover:border-[#0052CC]/50 transition-colors md:flex-[1.7] flex-1 min-w-0 bg-white">
          <span className="text-[#0052CC] shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Giá phòng bạn mong muốn"
            className="w-full text-sm md:text-xs lg:text-sm text-[#172B4D] placeholder-gray-400 focus:outline-none bg-transparent"
          />
        </div>

        {/* ---- Box 3: Loại phòng (có dropdown 2 option) ---- */}
        <div className="relative md:flex-[1.2] flex-1 min-w-0" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="w-full flex items-center justify-between gap-1.5 px-4 md:px-2.5 lg:px-4 py-3 border border-gray-200 rounded-xl hover:border-[#0052CC]/50 transition-colors bg-white text-left"
          >
            <span className={`text-sm md:text-xs lg:text-sm truncate ${selectedType ? 'text-[#172B4D] font-medium' : 'text-gray-400'}`}>
              {selectedType ?? 'Loại phòng'}
            </span>
            {/* Mũi tên xoay 180° khi mở dropdown */}
            <svg
              className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown menu - 2 lựa chọn */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
              {ROOM_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => handleSelectType(type)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                    ${selectedType === type
                      ? 'bg-[#EEF4FF] text-[#0052CC] font-semibold'
                      : 'text-[#172B4D] hover:bg-gray-50'
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---- Nút Tìm ngay ---- */}
        <button className="bg-[#0052CC] hover:bg-[#0043A8] text-white px-6 md:px-4 lg:px-6 py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 shrink-0 shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Tìm ngay</span>
        </button>

      </div>
    </div>
  );
}
