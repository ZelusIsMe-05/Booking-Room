'use client';

import React, { useEffect, useState } from 'react';
import { X, MapPin, Maximize, Check, AlertCircle } from 'lucide-react';
import { roomService, BackendRoom } from '@/services/roomService';
import { formatCurrency } from '@/utils/formatCurrency';
import { getRoomFallbackImage } from '@/utils/imageFallback';
import { adminService } from '@/services/adminService';
import Avatar from './Avatar';

interface RoomDetailModalProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (roomId: string) => void;
  onReject: (roomId: string) => void;
  actionLoading: string | null;
  isPending?: boolean;
}

export default function RoomDetailModal({ roomId, isOpen, onClose, onApprove, onReject, actionLoading, isPending = false }: RoomDetailModalProps) {
  const [room, setRoom] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');

  useEffect(() => {
    if (isOpen && roomId) {
      fetchRoomDetail();
    }
  }, [isOpen, roomId]);

  const fetchRoomDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await roomService.getRoomById(roomId);
      const roomData: any = res.data || (res as any);
      setRoom(roomData);
      
      if (roomData?.images?.length > 0) {
        // Set cover image or first image
        const cover = roomData.images.find((img: any) => img.isCover);
        setActiveImage(cover ? cover.imageUrl : roomData.images[0].imageUrl);
      } else if (roomData?.coverImageUrl) {
        setActiveImage(roomData.coverImageUrl);
      } else {
        setActiveImage(getRoomFallbackImage(roomId));
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải chi tiết phòng');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white z-10">
          <h2 className="text-xl font-bold text-slate-900">Chi tiết bài đăng</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <div className="w-8 h-8 border-4 border-booking-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p>Đang tải thông tin chi tiết...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-500 bg-red-50 rounded-xl">
              <AlertCircle size={48} className="mb-4 opacity-50" />
              <p className="font-medium">{error}</p>
              <button onClick={fetchRoomDetail} className="mt-4 px-4 py-2 bg-white rounded-lg shadow-sm border border-red-200 text-red-600 font-medium">Thử lại</button>
            </div>
          ) : room ? (
            <div className="flex flex-col md:flex-row gap-8">
              {/* Left Column - Images */}
              <div className="w-full md:w-1/2 space-y-4">
                <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img 
                    src={activeImage} 
                    alt="Room" 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      e.currentTarget.src = getRoomFallbackImage(room.roomId, null);
                    }}
                  />
                </div>
                
                {room.images && room.images.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {room.images.map((img: any, idx: number) => (
                      <button 
                        key={idx}
                        onClick={() => setActiveImage(img.imageUrl)}
                        className={`w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${activeImage === img.imageUrl ? 'border-booking-primary opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      >
                        <img 
                          src={img.imageUrl} 
                          alt="Thumbnail" 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            e.currentTarget.src = getRoomFallbackImage(room.roomId, null);
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Host Info */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mt-6">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Thông tin người đăng</h3>
                  <div className="flex items-center gap-4">
                    <Avatar
                      src={room.host?.avatarUrl}
                      alt={room.host?.fullName || 'Host'}
                      fallbackText={room.host?.fullName || 'H'}
                      className="w-12 h-12 text-lg text-indigo-600 bg-indigo-100"
                    />
                    <div>
                      <p className="font-bold text-slate-900">{room.host?.fullName || 'N/A'}</p>
                      <p className="text-sm text-slate-500">{room.host?.phoneNumber || 'Chưa cung cấp SĐT'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Info */}
              <div className="w-full md:w-1/2 space-y-6">
                <div>
                  <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-booking-teal/10 text-booking-teal mb-3">
                    {room.roomType === 'APARTMENT' ? 'Căn hộ chung cư' : room.roomType === 'ROOM' ? 'Phòng trọ' : 'Nhà nguyên căn'}
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 leading-tight mb-2">{room.title}</h1>
                  <p className="flex items-start gap-2 text-slate-500 text-sm">
                    <MapPin size={16} className="flex-shrink-0 mt-0.5 text-booking-primary" />
                    <span>{room.detailedAddress}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Giá thuê</p>
                    <p className="text-xl font-bold text-booking-primary">{formatCurrency(room.monthlyRent as any)}<span className="text-xs text-slate-500 font-normal">/tháng</span></p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Tiền cọc</p>
                    <p className="text-lg font-semibold text-slate-700">{formatCurrency(room.depositAmount as any)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                      <Maximize size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Sức chứa tối đa</p>
                      <p className="font-semibold text-slate-900">{room.maxCapacity} người</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h3 className="font-semibold text-slate-900">Chi phí khác</h3>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <div className="flex justify-between pr-4">
                      <span className="text-slate-500">Tiền điện:</span>
                      <span className="font-medium text-slate-900">{formatCurrency(room.electricityCost as any)}</span>
                    </div>
                    <div className="flex justify-between pl-4 border-l border-slate-200">
                      <span className="text-slate-500">Tiền nước:</span>
                      <span className="font-medium text-slate-900">{formatCurrency(room.waterCost as any)}</span>
                    </div>
                    <div className="flex justify-between pr-4">
                      <span className="text-slate-500">Internet:</span>
                      <span className="font-medium text-slate-900">{formatCurrency(room.internetCost as any)}</span>
                    </div>
                    <div className="flex justify-between pl-4 border-l border-slate-200">
                      <span className="text-slate-500">Dịch vụ:</span>
                      <span className="font-medium text-slate-900">{formatCurrency(room.serviceFee as any)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="font-semibold text-slate-900 mb-2">Mô tả</h3>
                  <div className="text-sm text-slate-600 whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar pr-2">
                    {room.roomDescription || 'Không có mô tả chi tiết.'}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        {room && isPending && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 z-10">
            <button 
              onClick={() => onReject(roomId)}
              disabled={actionLoading === roomId}
              className="px-6 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              Từ chối bài đăng
            </button>
            <button 
              onClick={() => onApprove(roomId)}
              disabled={actionLoading === roomId}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-emerald-200"
            >
              <Check size={18} />
              <span>Phê duyệt ngay</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
