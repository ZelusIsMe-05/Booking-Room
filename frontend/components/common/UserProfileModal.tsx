'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/authService';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user, refreshProfile } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('OTHER');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [prevIsOpen, setPrevIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [shouldRemoveAvatar, setShouldRemoveAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke object URL on change / unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Reset/Initialize values when modal opens
  useEffect(() => {
    if (isOpen && !prevIsOpen && user) {
      setFullName(user.fullName || '');
      setPhoneNumber(user.phoneNumber || '');
      setGender(user.gender || 'OTHER');
      setDateOfBirth(user.dateOfBirth || '');
      setAddress(user.address || '');
      setSelectedFile(null);
      setShouldRemoveAvatar(false);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setError('');
      setSuccess('');
    }
    setPrevIsOpen(isOpen);
  }, [isOpen, user, prevIsOpen]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn tệp hình ảnh hợp lệ.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Dung lượng ảnh không được vượt quá 5MB.');
      return;
    }

    setSelectedFile(file);
    setShouldRemoveAvatar(false);
    const objectUrl = URL.createObjectURL(file);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(objectUrl);
  };

  const handleRemoveAvatar = () => {
    setSelectedFile(null);
    setShouldRemoveAvatar(true);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fullName.trim()) {
      setError('Họ và tên không được để trống.');
      return;
    }

    setLoading(true);
    try {
      await authService.updateProfile({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim() || null,
        gender,
        dateOfBirth: dateOfBirth || null,
        address: address.trim() || null,
        avatarFile: selectedFile,
        removeAvatar: shouldRemoveAvatar,
      });

      setSuccess('Sửa thông tin thành công!');
      setSelectedFile(null);
      setShouldRemoveAvatar(false);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      // Re-fetch user profile to sync everywhere on UI
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Cập nhật hồ sơ thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in">
      <div 
        className="relative w-full max-w-3xl bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div 
              onClick={() => !loading && fileInputRef.current?.click()}
              className="group relative w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow cursor-pointer bg-gray-100 select-none shrink-0"
              title="Nhấp để thay đổi ảnh đại diện"
            >
              {!shouldRemoveAvatar && previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Xem trước ảnh đại diện"
                  className="w-full h-full object-cover"
                />
              ) : (!shouldRemoveAvatar && user.avatarUrl) ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#0052CC] text-white flex items-center justify-center font-bold text-2xl">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-[9px] font-semibold uppercase tracking-wider">Thay đổi</span>
              </div>

              {/* Uploading Spinner Overlay */}
              {loading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleAvatarChange} 
              disabled={loading}
            />

            <div>
              <h2 className="text-2xl font-bold text-gray-900">Thông tin cá nhân</h2>
              <p className="text-xs font-semibold text-[#0052CC] bg-[#0052CC]/10 px-2 py-0.5 rounded-full inline-block mt-1">
                {user.role === 'ADMIN' ? 'Quản trị viên' : (user.role === 'HOST' || user.role === 'LANDLORD') ? 'Chủ nhà' : 'Người thuê phòng'}
              </p>
              {!shouldRemoveAvatar && (previewUrl || user.avatarUrl) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveAvatar();
                  }}
                  className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors mt-2 flex items-center gap-1 focus:outline-none"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Xóa ảnh đại diện</span>
                </button>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Đóng"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ tên đầy đủ"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] outline-none text-gray-800 text-sm transition-all"
                required
              />
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="flex text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 items-center justify-between">
                <span>Địa chỉ Email</span>
                <span className="text-[10px] text-gray-400 font-normal normal-case">Không thể chỉnh sửa</span>
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-150 bg-gray-50 text-gray-500 text-sm select-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="truncate">{user.email}</span>
              </div>
            </div>

            {/* Username (Read-only) */}
            <div>
              <label className="flex text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 items-center justify-between">
                <span>Tên đăng nhập</span>
                <span className="text-[10px] text-gray-400 font-normal normal-case">Không thể chỉnh sửa</span>
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-150 bg-gray-50 text-gray-500 text-sm select-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>@{user.username}</span>
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Số điện thoại
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Nhập số điện thoại"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] outline-none text-gray-800 text-sm transition-all"
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
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] outline-none text-gray-800 text-sm bg-white cursor-pointer transition-all"
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
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] outline-none text-gray-800 text-sm transition-all"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Địa chỉ liên hệ
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Nhập địa chỉ của bạn"
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] outline-none text-gray-800 text-sm resize-none transition-all"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0052CC] hover:bg-[#0043A8] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-75 disabled:cursor-wait shadow-sm"
          >
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}
