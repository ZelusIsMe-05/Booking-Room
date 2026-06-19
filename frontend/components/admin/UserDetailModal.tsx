'use client';

import React, { useEffect, useState } from 'react';
import { X, Mail, Phone, Calendar, Shield, MapPin, Building, Lock, Unlock } from 'lucide-react';
import { adminService } from '@/services/adminService';
import StatusBadge from './StatusBadge';

interface UserDetailModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: () => void;
}

export default function UserDetailModal({ userId, isOpen, onClose, onStatusChange }: UserDetailModalProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetail();
    }
  }, [isOpen, userId]);

  const fetchUserDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getUserDetail(userId);
      setUser(data);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải thông tin người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLock = async () => {
    try {
      setActionLoading(true);
      if (user.status === 'BANNED') {
        await adminService.unlockUser(userId);
      } else {
        await adminService.lockUser(userId);
      }
      await fetchUserDetail();
      onStatusChange();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi thay đổi trạng thái');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white z-10">
          <h2 className="text-xl font-bold text-slate-900">Chi tiết người dùng</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <div className="w-8 h-8 border-4 border-booking-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p>Đang tải thông tin...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center">
              <p className="font-medium">{error}</p>
              <button onClick={fetchUserDetail} className="mt-3 px-4 py-2 bg-white rounded-lg border border-red-200 shadow-sm font-medium">Thử lại</button>
            </div>
          ) : user ? (
            <div className="space-y-8">
              {/* Profile Header */}
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-slate-200 border-4 border-white shadow-md flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-slate-500">{user.fullName?.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{user.fullName}</h3>
                  <p className="text-slate-500">@{user.username || user.userId.substring(0, 8)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                      user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'HOST' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {user.role}
                    </span>
                    <StatusBadge
                      status={
                        user.status === 'ACTIVE' ? 'Hoạt động' :
                        user.status === 'BANNED' ? 'Bị khóa' :
                        user.status === 'PENDING' ? 'Chờ xác thực' : 'Bị khóa'
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Thông tin liên hệ</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Mail size={18} className="text-slate-400" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Phone size={18} className="text-slate-400" />
                      <span>{user.phoneNumber || 'Chưa cung cấp'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Hệ thống</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Calendar size={18} className="text-slate-400" />
                      <span>Tham gia: {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Shield size={18} className="text-slate-400" />
                      <span>Trạng thái hoạt động: {user.status === 'ACTIVE' ? 'Đã kích hoạt' : user.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {user.role === 'HOST' && user.landlord && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Building size={16} className="text-booking-primary" />
                    Thông tin Chủ nhà
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1">Xác thực chủ nhà</p>
                      <p className="font-medium text-slate-900">
                        {user.landlord.idCardFrontUrl && user.landlord.idCardBackUrl ? 'Đã tải lên giấy tờ' : 'Chưa tải lên đủ giấy tờ'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        {user && user.role !== 'ADMIN' && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 z-10">
            <button 
              onClick={handleToggleLock}
              disabled={actionLoading}
              className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 ${
                user.status === 'BANNED' 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {actionLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : user.status === 'BANNED' ? (
                <>
                  <Unlock size={18} />
                  <span>Mở khóa tài khoản</span>
                </>
              ) : (
                <>
                  <Lock size={18} />
                  <span>Khóa tài khoản</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
