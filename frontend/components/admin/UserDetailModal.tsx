'use client';

import React, { useEffect, useState } from 'react';
import { X, Mail, Phone, Calendar, Shield, MapPin, Building, Lock, Unlock, Check, XCircle } from 'lucide-react';
import { adminService } from '@/services/adminService';
import StatusBadge from './StatusBadge';
import Avatar from './Avatar';

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
  const [isApprovingHost, setIsApprovingHost] = useState(false);
  const [isRejectingHost, setIsRejectingHost] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

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

  const handleApproveHost = async () => {
    try {
      setActionLoading(true);
      await adminService.approveLandlord(userId);
      await fetchUserDetail();
      setIsApprovingHost(false);
      onStatusChange();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi duyệt chủ nhà');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectHost = async () => {
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      setActionLoading(true);
      await adminService.rejectLandlord(userId, rejectReason);
      await fetchUserDetail();
      setIsRejectingHost(false);
      setRejectReason('');
      onStatusChange();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi từ chối chủ nhà');
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
                <Avatar 
                  src={user.avatarUrl} 
                  alt={user.fullName} 
                  fallbackText={user.fullName}
                  className="w-24 h-24 text-3xl"
                />
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
                        user.status === 'ACTIVE'
                          ? (user?.landlord?.approvalStatus === 'PENDING' || user?.approvalStatus === 'PENDING' ? 'Chờ xác thực' : 'Hoạt động')
                          : user.status === 'BANNED' ? 'Bị khóa'
                          : user.status === 'INACTIVE' ? 'Chưa xác thực OTP' : 'Bị khóa'
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
                      <span>
                        Trạng thái hoạt động: {
                          user.status === 'ACTIVE'
                            ? (user?.landlord?.approvalStatus === 'PENDING' || user?.approvalStatus === 'PENDING' ? 'Chờ xác thực' : 'Đã kích hoạt')
                            : user.status === 'BANNED' ? 'Bị khóa'
                            : user.status === 'INACTIVE' ? 'Chưa xác thực OTP' : 'Bị khóa'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {(user.role === 'HOST' || user.role === 'LANDLORD') && user.landlord && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Building size={16} className="text-booking-primary" />
                    Thông tin Chủ nhà
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1">Trạng thái duyệt</p>
                      <StatusBadge
                        status={
                          user.landlord.approvalStatus === 'APPROVED' ? 'Hoạt động' :
                          user.landlord.approvalStatus === 'PENDING' ? 'Chờ xác thực' :
                          user.landlord.approvalStatus === 'REJECTED' ? 'Bị khóa' : 'N/A'
                        }
                      />
                    </div>
                  </div>

                  {(user.landlord.idCardFrontUrl || user.landlord.idCardBackUrl) && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {user.landlord.idCardFrontUrl && (
                        <div>
                          <p className="text-slate-500 mb-2 text-xs font-semibold uppercase tracking-wider">CCCD Mặt trước</p>
                          <img 
                            src={user.landlord.idCardFrontUrl} 
                            alt="CCCD Mặt trước" 
                            className="w-full h-auto rounded-lg border border-slate-200 object-cover aspect-video bg-slate-100" 
                          />
                        </div>
                      )}
                      {user.landlord.idCardBackUrl && (
                        <div>
                          <p className="text-slate-500 mb-2 text-xs font-semibold uppercase tracking-wider">CCCD Mặt sau</p>
                          <img 
                            src={user.landlord.idCardBackUrl} 
                            alt="CCCD Mặt sau" 
                            className="w-full h-auto rounded-lg border border-slate-200 object-cover aspect-video bg-slate-100" 
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {user.landlord.rejectionReason && (
                    <div className="mt-3 bg-red-50 text-red-600 p-2 rounded text-sm">
                      Lý do từ chối: {user.landlord.rejectionReason}
                    </div>
                  )}
                  {user.landlord.approvalStatus === 'PENDING' && (
                    <div className="mt-4 flex flex-col gap-3">
                      {isApprovingHost ? (
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          <p className="text-sm text-emerald-800 font-medium">Bạn có chắc chắn muốn duyệt Chủ nhà này? Họ sẽ được cấp quyền đăng bài ngay lập tức.</p>
                          <div className="flex gap-2">
                            <button
                              onClick={handleApproveHost}
                              disabled={actionLoading}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              {actionLoading ? 'Đang xử lý...' : 'Xác nhận duyệt'}
                            </button>
                            <button
                              onClick={() => setIsApprovingHost(false)}
                              disabled={actionLoading}
                              className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              Hủy bỏ
                            </button>
                          </div>
                        </div>
                      ) : isRejectingHost ? (
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          <label className="text-sm text-red-800 font-medium">Lý do từ chối hồ sơ:</label>
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Nhập lý do cụ thể (VD: Hình CCCD mờ...)"
                            className="w-full p-2 text-sm rounded-lg border border-red-200 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleRejectHost}
                              disabled={actionLoading}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              {actionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                            </button>
                            <button
                              onClick={() => { setIsRejectingHost(false); setRejectReason(''); }}
                              disabled={actionLoading}
                              className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              Hủy bỏ
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setIsApprovingHost(true)}
                            disabled={actionLoading || !user.landlord.idCardFrontUrl || !user.landlord.idCardBackUrl}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <Check size={16} /> Duyệt hồ sơ
                          </button>
                          <button
                            onClick={() => setIsRejectingHost(true)}
                            disabled={actionLoading}
                            className="flex-1 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-red-200"
                          >
                            <XCircle size={16} /> Từ chối
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        {user && user.role !== 'ADMIN' && user.landlord?.approvalStatus !== 'PENDING' && user.approvalStatus !== 'PENDING' && (
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
