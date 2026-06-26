'use client';

// =============================================================
// frontend/components/common/Header.tsx
// Thanh điều hướng trên cùng (Navbar) dùng chung toàn hệ thống.
// Client Component để xử lý logic dropdown Avatar và trạng thái Đăng nhập.
// =============================================================

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import UserProfileModal from './UserProfileModal';
import ChangePasswordModal from './ChangePasswordModal';
import MyDepositsModal from './MyDepositsModal';
import SupportTicketModal from './SupportTicketModal';
import ViolationReportModal from './ViolationReportModal';
import LanguageSwitcher from './LanguageSwitcher';

export default function Header() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const isLoggedIn = !!user;
  // Trạng thái mở/đóng dropdown của Avatar
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isDepositsOpen, setIsDepositsOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isViolationOpen, setIsViolationOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    logout();
    setIsDropdownOpen(false);
  };

  return (
    <header className="bg-white border-b border-gray-100 fixed top-0 left-0 right-0 z-50 px-4 lg:px-12 py-3 flex items-center justify-between gap-4 shadow-sm">
      {/* 1. Logo */}
      <div className="flex items-center gap-6 flex-1 max-w-xl">
        <Link href="/" className="text-[#0052CC] font-bold text-2xl tracking-tight whitespace-nowrap">
          Booking-Room
        </Link>
      </div>

      {/* 2. Menu Navigation & Auth Options */}
      <div className="flex items-center gap-4 lg:gap-6 text-sm font-medium">
        <LanguageSwitcher />

        {isLoggedIn && user ? (
          /* TRẠNG THÁI: ĐÃ ĐĂNG NHẬP (Hiển thị Avatar Dropdown) */
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/20 rounded-full p-0.5 transition-all"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="w-8 h-8 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#0052CC] text-white flex items-center justify-center font-bold text-sm shadow-sm select-none">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
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
                  <p className="text-[#172B4D] font-bold text-sm truncate">{user.fullName}</p>
                  <p className="text-[#6B778C] text-xs truncate mt-0.5">{user.email}</p>
                </div>

                {/* Các nút chức năng */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsProfileOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#172B4D] hover:bg-[#F4F5F7] transition-colors text-left font-medium"
                  >
                    <svg className="w-4 h-4 text-[#6B778C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{t('header.viewProfile')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsChangePasswordOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#172B4D] hover:bg-[#F4F5F7] transition-colors text-left font-medium"
                  >
                    <svg className="w-4 h-4 text-[#6B778C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>{t('header.changePassword')}</span>
                  </button>

                  {user.role === 'TENANT' && (
                    <>
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setIsDepositsOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#172B4D] hover:bg-[#F4F5F7] transition-colors text-left font-medium"
                      >
                        <svg className="w-4 h-4 text-[#6B778C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span>{t('header.deposits')}</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setIsSupportOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#172B4D] hover:bg-[#F4F5F7] transition-colors text-left font-medium"
                      >
                        <svg className="w-4 h-4 text-[#6B778C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span>{t('header.supportTicket')}</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setIsViolationOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#172B4D] hover:bg-[#F4F5F7] transition-colors text-left font-medium"
                      >
                        <svg className="w-4 h-4 text-[#6B778C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{t('header.violationReport')}</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      window.dispatchEvent(
                        new CustomEvent('show-toast', {
                          detail: { message: 'Tính năng đang được phát triển', type: 'info' },
                        })
                      );
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#172B4D] hover:bg-[#F4F5F7] transition-colors text-left font-medium"
                  >
                    <svg className="w-4 h-4 text-[#6B778C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{t('header.accountSettings')}</span>
                  </button>
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
                    <span>{t('header.logout')}</span>
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
              {t('header.login')}
            </Link>
            <Link
              href="/auth/register"
              className="bg-[#0052CC] hover:bg-[#0043A8] text-white px-4 py-2 rounded-md font-semibold transition-colors shadow-sm"
            >
              {t('header.register')}
            </Link>
          </>
        )}
      </div>

      <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
      <MyDepositsModal isOpen={isDepositsOpen} onClose={() => setIsDepositsOpen(false)} />
      <SupportTicketModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
      <ViolationReportModal isOpen={isViolationOpen} onClose={() => setIsViolationOpen(false)} />
    </header>
  );
}
