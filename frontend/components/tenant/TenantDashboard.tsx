'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/authService';
import { roomService } from '@/services/roomService';
import { bookingService, DepositResponse } from '@/services/bookingService';
import ConfirmModal from '../common/ConfirmModal';

type TabType = 'dashboard' | 'profile' | 'password' | 'deposits';

interface ExtendedDeposit extends DepositResponse {
  room_title?: string;
  room_address?: string;
}

export default function TenantDashboard() {
  const { user, logout, refreshProfile } = useAuth();
  const router = useRouter();
  const [checkingRoomId, setCheckingRoomId] = useState<string | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Active tab state
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Stats states
  const [totalDeposits, setTotalDeposits] = useState(0);

  // Profile Form States
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('OTHER');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  // Deposits States
  const [deposits, setDeposits] = useState<ExtendedDeposit[]>([]);
  const [depositsLoading, setDepositsLoading] = useState(false);
  const [depositsError, setDepositsError] = useState('');
  const [depositFilter, setDepositFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Load/Sync user values for forms
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhoneNumber(user.phoneNumber || '');
      setGender(user.gender || 'OTHER');
      // Format to YYYY-MM-DD for date input
      if (user.dateOfBirth) {
        setDateOfBirth(user.dateOfBirth.split('T')[0]);
      } else {
        setDateOfBirth('');
      }
      setAddress(user.address || '');
    }
  }, [user]);

  // Load deposits history
  const fetchDeposits = async () => {
    setDepositsLoading(true);
    setDepositsError('');
    try {
      const statusParam = depositFilter === 'ALL' ? undefined : depositFilter;
      const res = await bookingService.getMyDeposits({
        page,
        limit: 5,
        status: statusParam,
      });

      if (res && res.data) {
        setDeposits(res.data.deposits || []);
        if (res.data.pagination) {
          setTotalPages(Math.ceil(res.data.pagination.total / res.data.pagination.limit));
          setTotalItems(res.data.pagination.total);
          // Set total count for stats
          if (depositFilter === 'ALL') {
            setTotalDeposits(res.data.pagination.total);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setDepositsError(err.message || 'Không thể lấy lịch sử đặt cọc.');
    } finally {
      setDepositsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'deposits' || activeTab === 'dashboard') {
      fetchDeposits();
    }
  }, [activeTab, depositFilter, page]);

  // Handle Logout
  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  // Handle Profile Update
  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!fullName.trim()) {
      setProfileError('Họ và tên không được để trống.');
      return;
    }

    setProfileLoading(true);
    try {
      await authService.updateProfile({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim() || null,
        gender,
        dateOfBirth: dateOfBirth || null,
        address: address.trim() || null,
      });

      setProfileSuccess('Cập nhật thông tin cá nhân thành công!');
      await refreshProfile();
    } catch (err: any) {
      setProfileError(err.message || 'Cập nhật thất bại. Vui lòng kiểm tra lại.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle Password Update
  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (!currentPassword) {
      setPwError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Xác nhận mật khẩu mới không khớp.');
      return;
    }
    if (currentPassword === newPassword) {
      setPwError('Mật khẩu mới không được giống mật khẩu cũ.');
      return;
    }

    setPwLoading(true);
    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPwSuccess('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwError(err.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại.');
    } finally {
      setPwLoading(false);
    }
  };

  // Handle View Room
  const handleViewRoom = async (roomId: string) => {
    if (checkingRoomId) return;
    setCheckingRoomId(roomId);
    try {
      await roomService.getRoomById(roomId);
      router.push(`/rooms/${roomId}`);
    } catch (err: any) {
      if (err.code !== 'ROOM_RENTED' && err.code !== 'ROOM_NOT_AVAILABLE') {
        console.error('Error checking room access:', err);
      }
      const msg = err.response?.data?.message || err.message || 'Lỗi tải thông tin phòng';
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: { message: msg, type: 'error' }
        })
      );
    } finally {
      setCheckingRoomId(null);
    }
  };

  // Handle Cancel Deposit
  const triggerCancelDeposit = (depositId: string) => {
    setCancelTargetId(depositId);
  };

  const confirmCancelDeposit = async () => {
    if (!cancelTargetId) return;
    setCancelLoading(true);
    try {
      await bookingService.cancelDeposit(cancelTargetId, 'Người dùng chủ động hủy');
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: 'Đã hủy giao dịch đặt cọc thành công!', type: 'success' }
      }));
      window.dispatchEvent(new Event('deposit-updated'));
      fetchDeposits();
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: err.message || 'Hủy giao dịch thất bại.', type: 'error' }
      }));
    } finally {
      setCancelLoading(false);
      setCancelTargetId(null);
    }
  };

  // Helper formatting values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format date input placeholder
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toISOString().split('T')[0];
  };

  // Render Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Đang xử lý (Chờ TT)
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EEF4FF] text-[#0052CC] border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0052CC]" />
            Đã thanh toán thành công
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Chủ nhà đã duyệt
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Chủ nhà từ chối
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-600 border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            Đã quá hạn (15p)
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-300">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
            Đã hủy giao dịch
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-600">
            {status}
          </span>
        );
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-booking-muted text-sm font-semibold">Đang tải thông tin tài khoản...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 lg:px-8">
      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* SIDEBAR: Profile Summary & Tab Navigation */}
        <div className="lg:col-span-1 space-y-6">
          {/* Summary Card */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-6 flex flex-col items-center text-center">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="w-20 h-20 rounded-full object-cover border-4 border-[#EEF4FF] shadow"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#0052CC] text-white flex items-center justify-center font-bold text-3xl shadow-md border-4 border-[#EEF4FF]">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <h2 className="mt-4 font-bold text-lg text-[#172B4D] leading-tight">{user.fullName}</h2>
            <p className="text-xs text-booking-muted mt-1 leading-none">@{user.username}</p>
            <span className="mt-3 px-3 py-1 text-[11px] font-bold text-[#0052CC] bg-[#EEF4FF] rounded-full uppercase tracking-wider">
              Khách thuê phòng
            </span>
          </div>

          {/* Navigation Options */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden py-2.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-semibold transition-all text-left ${
                activeTab === 'dashboard'
                  ? 'text-[#0052CC] bg-[#EEF4FF] border-l-4 border-[#0052CC]'
                  : 'text-gray-700 hover:bg-[#F4F5F7]'
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
              </svg>
              <span>Bảng điều khiển</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-semibold transition-all text-left ${
                activeTab === 'profile'
                  ? 'text-[#0052CC] bg-[#EEF4FF] border-l-4 border-[#0052CC]'
                  : 'text-gray-700 hover:bg-[#F4F5F7]'
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Xem hồ sơ cá nhân</span>
            </button>

            <button
              onClick={() => setActiveTab('password')}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-semibold transition-all text-left ${
                activeTab === 'password'
                  ? 'text-[#0052CC] bg-[#EEF4FF] border-l-4 border-[#0052CC]'
                  : 'text-gray-700 hover:bg-[#F4F5F7]'
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Đổi mật khẩu</span>
            </button>

            <button
              onClick={() => setActiveTab('deposits')}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-semibold transition-all text-left ${
                activeTab === 'deposits'
                  ? 'text-[#0052CC] bg-[#EEF4FF] border-l-4 border-[#0052CC]'
                  : 'text-gray-700 hover:bg-[#F4F5F7]'
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Đơn đặt cọc</span>
            </button>

            <div className="border-t border-gray-100 my-2"></div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-all text-left"
            >
              <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>

        {/* MAIN DISPLAY AREA */}
        <div className="lg:col-span-3">

          {/* TAB 1: GENERAL DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h1 className="text-2xl font-bold text-[#172B4D]">Bảng điều khiển của Người thuê</h1>
                <p className="text-booking-muted text-sm mt-1">Chào mừng bạn trở lại! Quản lý thông tin đặt phòng và tìm kiếm phòng của bạn.</p>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#EEF4FF] text-[#0052CC] flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-booking-muted font-bold uppercase tracking-wider">Đơn đặt cọc của tôi</p>
                    <p className="text-2xl font-black text-[#172B4D] mt-0.5">{totalDeposits} đơn</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-booking-muted font-bold uppercase tracking-wider">Trạng thái tài khoản</p>
                    <p className="text-2xl font-black text-emerald-600 mt-0.5">Đã xác minh</p>
                  </div>
                </div>
              </div>

              {/* Recent Activities Section */}
              <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-[#172B4D] mb-4">Các đơn đặt cọc vừa tạo</h3>
                {deposits.length > 0 ? (
                  <div className="space-y-4">
                    {deposits.slice(0, 3).map((dep) => (
                      <div key={dep.deposit_id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors gap-3">
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-[#172B4D]">{dep.room_title || 'Tên phòng trống'}</h4>
                          <p className="text-xs text-booking-muted">{dep.room_address || 'Địa chỉ đang tải...'}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
                            <span>Ngày tạo: {formatDate(dep.created_at)}</span>
                            <span>•</span>
                            <span className="font-semibold text-gray-800">Số tiền: {formatCurrency(dep.deposit_amount)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                          {renderStatusBadge(dep.status)}
                          <button
                            onClick={() => handleViewRoom(dep.room_id)}
                            disabled={checkingRoomId !== null}
                            className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all disabled:opacity-50"
                          >
                            {checkingRoomId === dep.room_id ? '...' : (dep.status === 'PROCESSING' ? 'Thanh toán' : 'Xem phòng')}
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => setActiveTab('deposits')}
                      className="w-full text-center py-2.5 text-sm font-bold text-[#0052CC] hover:text-[#0043A8] transition-colors"
                    >
                      Xem toàn bộ lịch sử đặt cọc →
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12 text-[#6B778C]">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v4h16z" />
                    </svg>
                    <p className="text-sm font-semibold">Bạn chưa có đơn đặt cọc nào.</p>
                    <Link href="/rooms" className="inline-block mt-4 bg-[#0052CC] hover:bg-[#0043A8] text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors">
                      Khám phá phòng ngay
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE FORM */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden animate-in fade-in duration-200">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-xl font-bold text-[#172B4D]">Hồ sơ cá nhân</h2>
                <p className="text-xs text-booking-muted mt-1">Xem và chỉnh sửa thông tin tài khoản của bạn</p>
              </div>

              <form onSubmit={handleProfileSubmit} className="p-6 space-y-6">
                {profileError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-semibold flex items-center gap-2">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{profileError}</span>
                  </div>
                )}

                {profileSuccess && (
                  <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-semibold flex items-center gap-2">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{profileSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Fullname */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nhập họ tên"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] outline-none text-gray-800 text-sm transition-all bg-white"
                      required
                    />
                  </div>

                  {/* Email (Readonly) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Email (Không thể thay đổi)
                    </label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-sm cursor-not-allowed select-none"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Nhập số điện thoại"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] outline-none text-gray-800 text-sm transition-all bg-white"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Giới tính
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] outline-none text-gray-800 text-sm transition-all bg-white"
                    >
                      <option value="MALE">Nam</option>
                      <option value="FEMALE">Nữ</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Ngày sinh
                    </label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] outline-none text-gray-800 text-sm transition-all bg-white"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Địa chỉ liên hệ
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Nhập địa chỉ của bạn"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] outline-none text-gray-800 text-sm transition-all bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0052CC] hover:bg-[#0043A8] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-75 disabled:cursor-wait shadow-sm"
                  >
                    {profileLoading ? 'Đang cập nhật...' : 'Cập nhật hồ sơ'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: PASSWORD FORM */}
          {activeTab === 'password' && (
            <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden animate-in fade-in duration-200">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-xl font-bold text-[#172B4D]">Đổi mật khẩu</h2>
                <p className="text-xs text-booking-muted mt-1">Thay đổi mật khẩu đăng nhập để bảo mật tài khoản</p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="p-6 space-y-6">
                {pwError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-semibold flex items-center gap-2">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{pwError}</span>
                  </div>
                )}

                {pwSuccess && (
                  <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-semibold flex items-center gap-2">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{pwSuccess}</span>
                  </div>
                )}

                <div className="space-y-5 max-w-xl">
                  {/* Current Password */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Mật khẩu hiện tại <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex min-h-11 items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 focus-within:border-[#0052CC] focus-within:ring-1 focus-within:ring-[#0052CC] transition-all">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Nhập mật khẩu hiện tại"
                        className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center shrink-0"
                      >
                        {showCurrent ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m3 3 18 18M10.6 10.6A2 2 0 0 0 13.4 13.4M9.9 4.2A10.8 10.8 0 0 1 12 4c6.5 0 10 8 10 8a16.5 16.5 0 0 1-3.1 4.2M6.6 6.6C3.6 8.7 2 12 2 12s3.5 8 10 8a10.4 10.4 0 0 0 4.4-1" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Mật khẩu mới <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex min-h-11 items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 focus-within:border-[#0052CC] focus-within:ring-1 focus-within:ring-[#0052CC] transition-all">
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Tối thiểu 8 ký tự (hoa, thường, số, ký tự đặc biệt)"
                        className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center shrink-0"
                      >
                        {showNew ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m3 3 18 18M10.6 10.6A2 2 0 0 0 13.4 13.4M9.9 4.2A10.8 10.8 0 0 1 12 4c6.5 0 10 8 10 8a16.5 16.5 0 0 1-3.1 4.2M6.6 6.6C3.6 8.7 2 12 2 12s3.5 8 10 8a10.4 10.4 0 0 0 4.4-1" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex min-h-11 items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 focus-within:border-[#0052CC] focus-within:ring-1 focus-within:ring-[#0052CC] transition-all">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                        className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center shrink-0"
                      >
                        {showConfirm ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m3 3 18 18M10.6 10.6A2 2 0 0 0 13.4 13.4M9.9 4.2A10.8 10.8 0 0 1 12 4c6.5 0 10 8 10 8a16.5 16.5 0 0 1-3.1 4.2M6.6 6.6C3.6 8.7 2 12 2 12s3.5 8 10 8a10.4 10.4 0 0 0 4.4-1" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0052CC] hover:bg-[#0043A8] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-75 disabled:cursor-wait shadow-sm"
                  >
                    {pwLoading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: DEPOSIT HISTORY LIST */}
          {activeTab === 'deposits' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#172B4D]">Lịch sử đặt cọc</h1>
                  <p className="text-booking-muted text-sm mt-1">Xem trạng thái chi tiết của tất cả các giao dịch đặt cọc đã xử lý</p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <select
                    value={depositFilter}
                    onChange={(e) => {
                      setDepositFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm font-semibold text-[#172B4D] outline-none shadow-sm focus:border-[#0052CC]"
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="PROCESSING">Chờ thanh toán</option>
                    <option value="CONFIRMED">Đã thanh toán</option>
                    <option value="ACCEPTED">Đã duyệt</option>
                    <option value="REJECTED">Bị từ chối</option>
                    <option value="CANCELLED">Đã hủy</option>
                    <option value="EXPIRED">Đã hết hạn</option>
                  </select>
                </div>
              </div>

              {/* Main List Box */}
              <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
                {depositsLoading ? (
                  <div className="py-24 text-center">
                    <div className="w-10 h-10 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-booking-muted text-sm">Đang tải lịch sử đặt cọc...</p>
                  </div>
                ) : depositsError ? (
                  <div className="py-16 text-center text-red-500 font-semibold px-6">
                    <p>{depositsError}</p>
                    <button
                      onClick={fetchDeposits}
                      className="mt-3 text-[#0052CC] hover:underline text-sm font-bold"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : deposits.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {deposits.map((dep) => (
                      <div key={dep.deposit_id} className="p-6 hover:bg-gray-50/50 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="font-bold text-base text-[#172B4D]">{dep.room_title || 'Phòng cho thuê'}</h3>
                              {renderStatusBadge(dep.status)}
                            </div>
                            <p className="text-sm text-booking-muted">{dep.room_address || 'Địa chỉ đang được cập nhật...'}</p>
                            
                            {/* Meta Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-6 pt-3 text-xs text-gray-500">
                              <div>
                                <span className="font-semibold text-gray-400 block">Số tiền đặt cọc</span>
                                <span className="text-sm font-bold text-gray-800">{formatCurrency(dep.deposit_amount)}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-400 block">Thời gian hẹn</span>
                                <span className="text-sm font-semibold text-gray-800">
                                  {dep.appointment_time ? formatDate(dep.appointment_time) : 'Không đặt lịch'}
                                </span>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-400 block">Ngày giao dịch</span>
                                <span className="text-sm font-semibold text-gray-800">{formatDate(dep.created_at)}</span>
                              </div>
                            </div>

                            {dep.cancellation_reason && (
                              <div className="mt-3 p-3 bg-red-50/50 border border-red-100 rounded-lg text-xs text-red-700">
                                <span className="font-bold block">Lý do hủy/thất bại:</span>
                                <span className="mt-0.5 block">{dep.cancellation_reason}</span>
                              </div>
                            )}
                          </div>

                          {/* Action panel */}
                          <div className="shrink-0 self-end md:self-start flex flex-col sm:flex-row md:flex-col items-end gap-2">
                            {dep.status === 'PROCESSING' && (
                              <>
                                <button
                                  onClick={() => handleViewRoom(dep.room_id)}
                                  disabled={checkingRoomId !== null}
                                  className="px-4 py-2 text-xs font-bold text-white bg-[#0052CC] hover:bg-[#0043A8] rounded-lg transition-all shadow-sm text-center disabled:opacity-50"
                                >
                                  {checkingRoomId === dep.room_id ? 'Đang kiểm tra...' : 'Tiếp tục thanh toán'}
                                </button>
                                <button
                                  onClick={() => triggerCancelDeposit(dep.deposit_id)}
                                  className="px-4 py-2 text-xs font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-500 border border-red-200 hover:border-red-500 rounded-lg transition-all shadow-sm"
                                >
                                  Hủy giao dịch
                                </button>
                              </>
                            )}
                            {dep.status !== 'PROCESSING' && (
                              <button
                                onClick={() => handleViewRoom(dep.room_id)}
                                disabled={checkingRoomId !== null}
                                className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all text-center disabled:opacity-50"
                              >
                                {checkingRoomId === dep.room_id ? 'Đang kiểm tra...' : 'Xem chi tiết phòng'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-booking-muted">
                    <svg className="w-16 h-16 mx-auto text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-sm font-semibold">Không tìm thấy đơn đặt cọc nào phù hợp.</p>
                  </div>
                )}

                {/* Pagination footer */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-booking-muted">
                      Hiển thị trang {page}/{totalPages} (Tổng cộng {totalItems} kết quả)
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(p - 1, 1))}
                        disabled={page === 1 || depositsLoading}
                        className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        Trước
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                        disabled={page === totalPages || depositsLoading}
                        className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      <ConfirmModal
        isOpen={cancelTargetId !== null}
        onClose={() => setCancelTargetId(null)}
        onConfirm={confirmCancelDeposit}
        loading={cancelLoading}
      />
    </div>
  );
}
