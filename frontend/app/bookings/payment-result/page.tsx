'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, ArrowRight, Home, Calendar } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'SUCCESS' | 'FAILED' | 'ERROR'>('FAILED');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [transactionData, setTransactionData] = useState<any>(null);

  useEffect(() => {
    async function verifyPayment() {
      try {
        const queryStr = window.location.search;
        if (!queryStr) {
          setStatus('ERROR');
          setErrorMsg('Không tìm thấy thông tin kết quả giao dịch.');
          setLoading(false);
          return;
        }

        // Gọi API của Backend để đối chiếu chữ ký bảo mật và cập nhật trạng thái
        const res = await apiClient.get<any>(`/payments/vnpay/verify${queryStr}`);
        
        if (res && res.data && res.data.transaction) {
          const txn = res.data.transaction;
          setTransactionData(txn);
          
          if (txn.status === 'SUCCESS') {
            setStatus('SUCCESS');
            
            // Xóa tất cả các thông tin đặt cọc nháp đang lưu trong sessionStorage
            Object.keys(sessionStorage).forEach(key => {
              if (key.startsWith('active_deposit_')) {
                sessionStorage.removeItem(key);
              }
            });
            // Kích hoạt sự kiện đồng bộ lại giao diện đặt phòng ở trang chi tiết
            window.dispatchEvent(new CustomEvent('deposit-updated'));
          } else {
            setStatus('FAILED');
            setErrorMsg('Giao dịch thanh toán thất bại hoặc bị hủy.');
          }
        } else {
          setStatus('ERROR');
          setErrorMsg('Phản hồi xác minh từ hệ thống không hợp lệ.');
        }
      } catch (err: any) {
        console.error('Lỗi xác minh thanh toán:', err);
        setStatus('ERROR');
        setErrorMsg(
          err.response?.data?.message || 
          err.message || 
          'Xác minh chữ ký số giao dịch thất bại.'
        );
      } finally {
        setLoading(false);
      }
    }

    verifyPayment();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 text-booking-primary animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Đang xác minh chữ ký và cập nhật trạng thái giao dịch...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto my-12 p-6 md:p-8 bg-white border border-slate-200 rounded-3xl shadow-xl flex flex-col items-center text-center gap-6">
      {status === 'SUCCESS' ? (
        <>
          <div className="w-20 h-20 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center shadow-sm">
            <CheckCircle className="h-12 w-12 text-emerald-500 animate-in zoom-in-50 duration-300" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">Đặt cọc phòng thành công!</h2>
            <p className="text-xs md:text-sm text-slate-500 mt-2 leading-relaxed">
              Tiền đặt cọc của bạn đã được thanh toán an toàn qua cổng VNPAY. Đơn đặt cọc hiện đang chờ chủ nhà xét duyệt lịch hẹn.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="w-20 h-20 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center shadow-sm">
            <XCircle className="h-12 w-12 text-rose-500 animate-in zoom-in-50 duration-300" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">Thanh toán không thành công</h2>
            <p className="text-xs md:text-sm text-slate-500 mt-2 leading-relaxed">
              {errorMsg || 'Giao dịch đặt cọc không thành công hoặc đã bị hủy từ phía ngân hàng/người dùng.'}
            </p>
          </div>
        </>
      )}

      {/* Transaction Info Block */}
      {transactionData && (
        <div className="w-full bg-slate-50 rounded-2xl border border-slate-200/60 p-4 text-left text-xs space-y-2.5">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="font-semibold text-slate-400 uppercase tracking-wider">Mã giao dịch</span>
            <span className="font-mono font-bold text-slate-900 select-all">{transactionData.transaction_id.slice(0, 18).toUpperCase()}...</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-400 uppercase tracking-wider">Số tiền đặt cọc</span>
            <span className="font-extrabold text-sm text-slate-950">
              {Number(transactionData.amount).toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-400 uppercase tracking-wider">Cổng thanh toán</span>
            <span className="font-bold text-slate-900">{transactionData.payment_method}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-400 uppercase tracking-wider">Thời gian tạo</span>
            <span className="font-medium text-slate-700">
              {new Date(transactionData.created_at).toLocaleString('vi-VN')}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="w-full flex flex-col gap-2.5 mt-2">
        <Link
          href="/tenant"
          className="w-full py-3.5 px-5 bg-booking-primary hover:bg-[#003f9e] text-white font-extrabold rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5 active:translate-y-0"
        >
          <Calendar size={18} />
          <span>Quản lý Lịch hẹn & Đơn cọc</span>
          <ArrowRight size={16} />
        </Link>
        <Link
          href="/"
          className="w-full py-3.5 px-5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Home size={18} />
          <span>Về trang chủ</span>
        </Link>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 text-booking-primary animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Đang chuẩn bị giao diện...</p>
        </div>
      }>
        <PaymentResultContent />
      </Suspense>
    </div>
  );
}
