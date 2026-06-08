'use client';

// =============================================================
// frontend/components/common/Header.tsx
// Thanh điều hướng trên cùng (Navbar) dùng chung toàn hệ thống.
// Client Component để xử lý logic dropdown Avatar và trạng thái Đăng nhập.
// =============================================================

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function Header() {
  // Trạng thái đăng nhập giả lập (sau này sẽ kết nối với AuthContext / Redux / Cookie)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // Trạng thái mở/đóng dropdown của Avatar
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mock dữ liệu user
  const mockUser = {
    name: 'Nguyễn Văn A',
    email: 'vana@student.hcmus.edu.vn',
    avatarUrl: '', // Để rỗng để tự hiển thị chữ cái đầu "N"
  };

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsDropdownOpen(false);
  };

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 px-4 lg:px-12 py-3 flex items-center justify-between gap-4">
      {/* 1. Logo & Tìm kiếm nhanh */}
      <div className="flex items-center gap-6 flex-1 max-w-xl">
        <Link href="/" className="text-[#0052CC] font-bold text-2xl tracking-tight whitespace-nowrap">
          Booking-Room
        </Link>
        <div className="relative w-full max-w-xs hidden md:block">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm nhanh..."
            className="w-full pl-9 pr-4 py-1.5 bg-[#F4F5F7] border border-transparent rounded-full text-sm focus:outline-none focus:bg-white focus:border-gray-200 transition-colors"
          />
        </div>
      </div>

      {/* 2. Menu Navigation & Auth Options */}
      <div className="flex items-center gap-4 lg:gap-6 text-sm font-medium">
        <Link href="#" className="text-[#0052CC] border-b-2 border-[#0052CC] pb-1 px-1 hidden sm:block">
          Cho nhà
        </Link>
        <Link href="#" className="text-[#6B778C] hover:text-[#172B4D] transition-colors hidden sm:block">
          Trợ giúp
        </Link>
        <button className="text-[#6B778C] hover:text-[#172B4D] transition-colors p-1.5 rounded-full hover:bg-gray-50">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9h18" />
          </svg>
        </button>

        {/* Nút giả lập Đăng nhập (Chỉ để Test UI, sẽ bỏ đi sau này) */}
        {!isLoggedIn && (
          <button 
            onClick={() => setIsLoggedIn(true)} 
            className="text-xs text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 rounded px-2 py-1 transition-colors"
            title="Bấm để test thử trạng thái đã Đăng nhập"
          >
            [Test Login]
          </button>
        )}

        {isLoggedIn ? (
          /* TRẠNG THÁI: ĐÃ ĐĂNG NHẬP (Hiển thị Avatar Dropdown) */
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/20 rounded-full p-0.5 transition-all"
            >
              {mockUser.avatarUrl ? (
                <img
                  src={mockUser.avatarUrl}
                  alt={mockUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#0052CC] text-white flex items-center justify-center font-bold text-sm shadow-sm select-none">
                  {mockUser.name.charAt(0)}
                </div>
              )}
              <svg className={`w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2.5 w-60 bg-white border border-gray-150 rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Thông tin User tóm tắt */}
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <p className="text-[#172B4D] font-bold text-sm truncate">{mockUser.name}</p>
                  <p className="text-[#6B778C] text-xs truncate mt-0.5">{mockUser.email}</p>
                </div>

                {/* Các nút chức năng */}
                <div className="py-1">
                  <Link
                    href="/guest/profile"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-[#172B4D] hover:bg-[#F4F5F7] transition-colors"
                  >
                    <svg className="w-4 h-4 text-[#6B778C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Xem hồ sơ cá nhân</span>
                  </Link>

                  <Link
                    href="/guest/change-password"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-[#172B4D] hover:bg-[#F4F5F7] transition-colors"
                  >
                    <svg className="w-4 h-4 text-[#6B778C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Đổi mật khẩu</span>
                  </Link>

                  <Link
                    href="/guest/settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-[#172B4D] hover:bg-[#F4F5F7] transition-colors"
                  >
                    <svg className="w-4 h-4 text-[#6B778C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Cài đặt tài khoản</span>
                  </Link>
                </div>

                <div className="border-t border-gray-100 my-1"></div>

                {/* Nút Đăng xuất */}
                <div className="px-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* TRẠNG THÁI: CHƯA ĐĂNG NHẬP (Hiển thị nút Đăng nhập / Đăng ký) */
          <>
            <Link
              href="/auth/login"
              className="text-[#172B4D] hover:text-[#0052CC] transition-colors font-semibold px-2 py-1.5"
            >
              Đăng nhập
            </Link>
            <Link
              href="/auth/register"
              className="bg-[#0052CC] hover:bg-[#0043A8] text-white px-4 py-2 rounded-md font-semibold transition-colors shadow-sm"
            >
              Đăng ký
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
