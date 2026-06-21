'use client';

import React from 'react';
import { X, CheckCircle, XCircle, Clock, FileText, CreditCard, Calendar, User, MapPin } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { getRoomFallbackImage } from '@/utils/imageFallback';

interface TransactionDetailModalProps {
  transaction: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function TransactionDetailModal({ transaction, isOpen, onClose }: TransactionDetailModalProps) {
  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
      <div 
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Chi tiết giao dịch</h2>
            <p className="text-sm text-slate-500 mt-1">Mã: #{transaction.transaction_id}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all shadow-sm border border-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar">
          {/* Status Banner */}
          <div className={`p-4 rounded-xl flex items-center gap-3 mb-8 ${
            transaction.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
            transaction.status === 'PENDING' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
            'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {transaction.status === 'SUCCESS' ? <CheckCircle size={24} /> :
             transaction.status === 'PENDING' ? <Clock size={24} /> :
             <XCircle size={24} />}
            <div>
              <p className="font-bold">
                {transaction.status === 'SUCCESS' ? 'Giao dịch thành công' :
                 transaction.status === 'PENDING' ? 'Giao dịch đang xử lý' :
                 'Giao dịch thất bại'}
              </p>
              <p className="text-sm opacity-80 mt-0.5">
                Vào lúc {new Date(transaction.created_at).toLocaleString('vi-VN')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Amount & Method */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Thông tin thanh toán</h3>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 flex items-center gap-2"><CreditCard size={16} /> Phương thức</span>
                    <span className="font-semibold text-slate-800">
                      {transaction.payment_method === 'VNPAY' ? 'VNPay' : 
                       transaction.payment_method === 'MOMO' ? 'MoMo' : 
                       transaction.payment_method === 'BANK_TRANSFER' ? 'Chuyển khoản' : 
                       transaction.payment_method || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 border-dashed">
                    <span className="text-slate-500 flex items-center gap-2"><FileText size={16} /> Loại giao dịch</span>
                    <span className="font-semibold text-slate-800">
                      {transaction.transaction_type === 'DEPOSIT' ? 'Đặt cọc phòng' : transaction.transaction_type || 'Thanh toán'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 border-dashed">
                    <span className="text-slate-500 flex items-center gap-2"><Calendar size={16} /> Số tiền</span>
                    <span className="text-xl font-bold text-booking-primary">
                      {formatCurrency(transaction.amount)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Người dùng (Tenant)</h3>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      {transaction.tenant_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{transaction.tenant_name || 'N/A'}</p>
                      <p className="text-sm text-slate-500">{transaction.tenant_email || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Room Info */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Phòng / Dịch vụ</h3>
              <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                <div className="h-32 w-full bg-slate-200 relative">
                  <img
                    src={getRoomFallbackImage(transaction.room_id || 'tx', transaction.room_cover_image_url)}
                    alt="Room Cover"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-3 left-4 right-4">
                    <p className="text-white font-bold line-clamp-1">{transaction.room_title || 'N/A'}</p>
                    <p className="text-white/80 text-xs mt-1 flex items-center gap-1"><MapPin size={12} /> ID: {transaction.room_id || 'N/A'}</p>
                  </div>
                </div>
                <div className="p-4 bg-white">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Khách hàng đã thanh toán tiền cọc cho phòng này. Giao dịch được ghi nhận tự động vào hệ thống.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
