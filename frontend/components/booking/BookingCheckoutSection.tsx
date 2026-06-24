'use client';

import { useState, useEffect, useRef } from 'react';
import { WalletIcon, MessageIcon, LockIcon, ClockIcon } from './Icons';
import { bookingService } from '@/services/bookingService';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { useTenantChat } from '@/context/TenantChatContext';
import ConfirmModal from '../common/ConfirmModal';

const verifiedTxns = new Set<string>();

interface BookingCheckoutSectionProps {
  roomId: string;
  price: number;
  deposit: number;
  roomTitle: string;
  roomStatus?: string;
  rentedBy?: string | null;
  host?: {
    userId: string | null;
    fullName: string;
    avatarUrl: string | null;
  };
}

export default function BookingCheckoutSection({
  roomId,
  price,
  deposit,
  roomTitle,
  roomStatus,
  rentedBy,
  host,
}: BookingCheckoutSectionProps) {
  const { user } = useAuth();
  const { openChatWith } = useTenantChat();
  const toastShownRef = useRef<string | null>(null);



  // Booking status and states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [appointmentTime, setAppointmentTime] = useState<string>('');
  const [tempDate, setTempDate] = useState<string>('');
  const [tempTime, setTempTime] = useState<string>('');
  const [isPickerExpanded, setIsPickerExpanded] = useState<boolean>(false);

  // Active deposit details
  const [activeDepositId, setActiveDepositId] = useState<string | null>(null);
  const [activeDepositStatus, setActiveDepositStatus] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(900); // 15 mins in seconds
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load active transaction from sessionStorage and sync with backend on page load
  useEffect(() => {
    const savedDepositId = sessionStorage.getItem(`active_deposit_${roomId}`);
    const savedEndTime = sessionStorage.getItem(`active_deposit_expire_${roomId}`);
    const savedPaymentUrl = sessionStorage.getItem(`active_deposit_url_${roomId}`);

    if (savedDepositId && savedEndTime && savedPaymentUrl) {
      const remainingTime = Math.floor((Number(savedEndTime) - Date.now()) / 1000);
      if (remainingTime > 0) {
        setActiveDepositId(savedDepositId);
        setPaymentUrl(savedPaymentUrl);
        setCountdown(remainingTime);
        setTimerActive(true);
        setIsModalOpen(true);
      } else {
        // Clear expired
        sessionStorage.removeItem(`active_deposit_${roomId}`);
        sessionStorage.removeItem(`active_deposit_expire_${roomId}`);
        sessionStorage.removeItem(`active_deposit_url_${roomId}`);
      }
    }

    // Sync with database to recover or verify session
    async function syncActiveDeposit() {
      if (!user || user.role !== 'TENANT') {
        return;
      }
      try {
        const res = await bookingService.getActiveDeposit(roomId);
        if (res && res.data && res.data.deposit) {
          const { deposit, transaction } = res.data;
          setActiveDepositStatus(deposit.status);
          
          if (deposit.status === 'PROCESSING') {
            const expireTime = new Date(deposit.expired_at).getTime();
            const remainingTime = Math.floor((expireTime - Date.now()) / 1000);
            
            if (remainingTime > 0) {
              const paymentUrlFromDb = transaction?.payment_url || null;
              
              setActiveDepositId(deposit.deposit_id);
              setCountdown(remainingTime);
              setTimerActive(true);
              
              if (paymentUrlFromDb) {
                setPaymentUrl(paymentUrlFromDb);
                setIsModalOpen(true);
                
                // Keep sessionStorage updated
                sessionStorage.setItem(`active_deposit_${roomId}`, deposit.deposit_id);
                sessionStorage.setItem(`active_deposit_url_${roomId}`, paymentUrlFromDb);
                sessionStorage.setItem(`active_deposit_expire_${roomId}`, String(expireTime));
              }
              return;
            }
          } else if (deposit.status === 'CONFIRMED') {
            setActiveDepositId(deposit.deposit_id);
            setTimerActive(false);
            setIsModalOpen(false);
            return;
          }
        }
        
        // No active deposit found or it has expired/cancelled on server, clear everything
        setActiveDepositId(null);
        setActiveDepositStatus(null);
        setPaymentUrl(null);
        setTimerActive(false);
        setIsModalOpen(false);
        
        sessionStorage.removeItem(`active_deposit_${roomId}`);
        sessionStorage.removeItem(`active_deposit_expire_${roomId}`);
        sessionStorage.removeItem(`active_deposit_url_${roomId}`);
      } catch (err) {
        console.error('Failed to sync active deposit from database:', err);
      }
    }

    syncActiveDeposit();

    const handleSyncEvent = () => {
      syncActiveDeposit();
    };
    window.addEventListener('deposit-updated', handleSyncEvent);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('deposit-updated', handleSyncEvent);
    };
  }, [roomId]);

  // Handle VNPAY callback parameters on redirect back to room page
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const vnpResponseCode = params.get('vnp_ResponseCode');
    const vnpTxnRef = params.get('vnp_TxnRef');

    if (vnpResponseCode && vnpTxnRef) {
      if (verifiedTxns.has(vnpTxnRef)) return;
      verifiedTxns.add(vnpTxnRef);

      async function verifyVnpayCallback() {
        setLoading(true);
        try {
          // Call backend verify endpoint
          const res = await apiClient.get<any>(`/payments/vnpay/verify${window.location.search}`);
          
          // Clear query parameters from address bar
          const url = new URL(window.location.href);
          url.searchParams.forEach((_, key) => {
            if (key.startsWith('vnp_')) {
              url.searchParams.delete(key);
            }
          });
          window.history.replaceState({}, '', url.pathname + url.search + url.hash);

          if (res && res.data && res.data.transaction && res.data.transaction.status === 'SUCCESS') {
            window.dispatchEvent(new CustomEvent('show-toast', {
              detail: { message: 'Thanh toán đặt cọc phòng thành công!', type: 'success' }
            }));
            
            // Clean up session storage draft
            sessionStorage.removeItem(`active_deposit_${roomId}`);
            sessionStorage.removeItem(`active_deposit_expire_${roomId}`);
            sessionStorage.removeItem(`active_deposit_url_${roomId}`);
            
            // Sync status
            window.dispatchEvent(new CustomEvent('deposit-updated'));
          } else {
            window.dispatchEvent(new CustomEvent('show-toast', {
              detail: { message: 'Thanh toán đặt cọc thất bại hoặc đã bị hủy.', type: 'error' }
            }));
          }
        } catch (err: any) {
          console.error('Verify VNPAY error:', err);
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { message: err.response?.data?.message || err.message || 'Lỗi xác minh giao dịch.', type: 'error' }
          }));
        } finally {
          setLoading(false);
        }
      }

      verifyVnpayCallback();
    }
  }, [roomId]);

  // Countdown timer effect
  useEffect(() => {
    if (timerActive && countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimerActive(false);
            handleCancelOrExpire(true); // Automatically trigger expire/cleanup
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, countdown]);

  const startBookingFlow = async () => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('show-login-prompt', {
        detail: { redirectUrl: window.location.href }
      }));
      return;
    }
    if (user.role !== 'TENANT') {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: 'Chỉ tài khoản Người thuê (Tenant) mới có thể thực hiện đặt cọc.', type: 'error' }
      }));
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    console.log('--- startBookingFlow initiated ---');
    console.log('Room ID:', roomId);
    console.log('Appointment Time:', appointmentTime);
    try {
      // 1. Call Create Deposit API
      const depositRes = await bookingService.createDeposit(roomId, appointmentTime || undefined);
      console.log('Create Deposit API Response:', depositRes);

      if (!depositRes) {
        throw new Error('Không nhận được phản hồi từ hệ thống khi tạo đơn đặt cọc.');
      }

      // Robust extraction of the deposit object and deposit ID
      const depositData = depositRes.data || depositRes;
      const depositObj = depositData.deposit || depositData;

      const newDepositId =
        (depositObj as any).deposit_id ||
        (depositObj as any).depositId ||
        (depositObj as any).id ||
        (depositRes as any).deposit_id ||
        (depositRes as any).depositId;

      console.log('Extracted Deposit ID:', newDepositId);

      if (!newDepositId) {
        throw new Error('Không thể tìm thấy mã đơn đặt cọc (deposit_id) trong phản hồi.');
      }

      const returnUrl = `${window.location.origin}/rooms/${roomId}`;
      const txnRes = await bookingService.createTransaction(newDepositId, 'VNPAY', returnUrl);
      console.log('Create Transaction API Response:', txnRes);

      if (!txnRes) {
        throw new Error('Không nhận được phản hồi từ hệ thống khi tạo giao dịch thanh toán.');
      }

      // Robust extraction of the payment url
      const txnData = txnRes.data || txnRes;
      const txnObj = txnData.transaction || txnData;

      const payUrl =
        (txnObj as any).payment_url ||
        (txnObj as any).paymentUrl ||
        (txnRes as any).paymentUrl ||
        (txnRes as any).payment_url;

      console.log('Extracted Payment URL:', payUrl);

      if (!payUrl) {
        throw new Error('Không thể tìm thấy đường dẫn thanh toán trong phản hồi.');
      }

      // 3. Set states and start timer
      setActiveDepositId(newDepositId);
      setPaymentUrl(payUrl);
      setCountdown(900); // 15 mins
      setTimerActive(true);
      setIsModalOpen(true);

      // Save to sessionStorage for persistence on reload
      sessionStorage.setItem(`active_deposit_${roomId}`, newDepositId);
      sessionStorage.setItem(`active_deposit_url_${roomId}`, payUrl);
      sessionStorage.setItem(`active_deposit_expire_${roomId}`, String(Date.now() + 900 * 1000));
      // Open the modal instead of redirecting immediately
      setIsModalOpen(true);
    } catch (err: any) {
      console.error('Lỗi đặt cọc:', err);
      setErrorMsg(err.message || 'Có lỗi xảy ra khi xử lý đơn cọc.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrExpire = async (isExpired = false) => {
    if (!activeDepositId) return;

    setLoading(true);
    try {
      if (!isExpired) {
        // Call cancel API if user manually cancelled
        await bookingService.cancelDeposit(activeDepositId, 'Người dùng chủ động hủy thanh toán');
      }
    } catch (err) {
      console.error('Lỗi hủy đơn cọc:', err);
    } finally {
      // Cleanup states
      setActiveDepositId(null);
      setPaymentUrl(null);
      setTimerActive(false);
      setIsModalOpen(false);
      setLoading(false);

      sessionStorage.removeItem(`active_deposit_${roomId}`);
      sessionStorage.removeItem(`active_deposit_expire_${roomId}`);
      sessionStorage.removeItem(`active_deposit_url_${roomId}`);

      if (timerRef.current) clearInterval(timerRef.current);

      if (isExpired) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { message: 'Giao dịch đặt cọc của bạn đã hết hạn (15 phút).', type: 'error' }
        }));
      } else {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { message: 'Đã hủy giao dịch đặt cọc thành công!', type: 'success' }
        }));
      }
    }
  };

  // Format countdown seconds into MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDisplayDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return '';
    try {
      const [datePart, timePart] = dateTimeStr.split('T');
      const [year, month, day] = datePart.split('-');
      return `${timePart} - Ngày ${day}/${month}/${year}`;
    } catch (e) {
      return dateTimeStr;
    }
  };

  return (
    <>
      <aside className="lg:sticky lg:top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-md flex flex-col gap-5">
        <div>
          <span className="text-2xl md:text-3xl font-extrabold text-booking-text">
            {price.toLocaleString('vi-VN')} đ
          </span>
          <span className="text-sm font-semibold text-booking-muted"> / tháng</span>
        </div>

        {/* Inner Details Container */}
        <div className="border border-slate-100 rounded-xl overflow-hidden bg-[#faf8ff] p-4 flex flex-col gap-3">
          <div>
            <p className="text-[11px] font-bold text-booking-muted uppercase tracking-[0.02em]">Tiền cọc</p>
            <p className="mt-1 text-sm font-bold text-booking-text">
              {deposit > 0 ? `${deposit.toLocaleString('vi-VN')} đ` : 'Không yêu cầu'}
            </p>
          </div>
          <div className="border-t border-slate-200/50" />
          <div>
            <p className="text-[11px] font-bold text-booking-muted uppercase tracking-[0.02em]">Trạng thái</p>
            {activeDepositStatus === 'CONFIRMED' ? (
              <p className="mt-1 text-sm font-extrabold text-[#004ac6]">Đã đặt cọc</p>
            ) : (
              <p className="mt-1 text-sm font-extrabold text-[#006a61]">Còn phòng</p>
            )}
          </div>
        </div>

        {/* Appointment Scheduler Panel */}
        {!timerActive && activeDepositStatus !== 'CONFIRMED' && (
          <div className="flex flex-col gap-3">
            {isPickerExpanded ? (
              <div className="border border-slate-200 rounded-2xl bg-slate-50 p-4 flex flex-col gap-3 shadow-inner animate-in slide-in-from-top-3 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-extrabold text-booking-text uppercase tracking-wide flex items-center gap-1">
                    <span>📅</span> Đặt lịch hẹn xem phòng
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPickerExpanded(false)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 transition"
                  >
                    Đóng
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-extrabold text-booking-muted uppercase tracking-wider">Chọn ngày</label>
                    <input
                      type="date"
                      value={tempDate}
                      onChange={(e) => setTempDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-white rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-bold text-booking-text focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6]/10 outline-none transition cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-extrabold text-booking-muted uppercase tracking-wider">Chọn giờ</label>
                    <input
                      type="time"
                      value={tempTime}
                      onChange={(e) => setTempTime(e.target.value)}
                      className="w-full bg-white rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-bold text-booking-text focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6]/10 outline-none transition cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!tempDate || !tempTime) {
                        window.dispatchEvent(new CustomEvent('show-toast', {
                          detail: { message: 'Vui lòng chọn đầy đủ cả ngày và giờ hẹn.', type: 'warning' }
                        }));
                        return;
                      }
                      const selected = new Date(`${tempDate}T${tempTime}`);
                      if (selected.getTime() <= Date.now()) {
                        window.dispatchEvent(new CustomEvent('show-toast', {
                          detail: { message: 'Lịch hẹn xem phòng phải ở thời điểm tương lai.', type: 'warning' }
                        }));
                        return;
                      }
                      setAppointmentTime(`${tempDate}T${tempTime}`);
                      setIsPickerExpanded(false);
                    }}
                    className="flex-1 py-2 bg-[#004ac6] hover:bg-[#003f9e] text-white font-extrabold rounded-xl text-[13px] transition shadow-md active:scale-[0.98]"
                  >
                    Áp dụng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPickerExpanded(false);
                    }}
                    className="py-2 px-3.5 border border-slate-200 bg-white text-booking-text font-bold rounded-xl text-[13px] hover:bg-slate-50 transition active:scale-[0.98]"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : appointmentTime ? (
              <div className="flex items-center justify-between rounded-2xl bg-blue-50/60 border border-blue-200/60 p-4 shadow-sm animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl select-none">📅</span>
                  <div>
                    <p className="text-[11px] font-extrabold text-[#004ac6] uppercase tracking-wider">Lịch hẹn xem phòng</p>
                    <p className="text-sm font-extrabold text-booking-text mt-0.5">
                      {formatDisplayDateTime(appointmentTime)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const [d, t] = appointmentTime.split('T');
                      setTempDate(d);
                      setTempTime(t || '10:00');
                      setIsPickerExpanded(true);
                    }}
                    className="text-[13px] font-bold text-[#004ac6] hover:underline"
                  >
                    Sửa
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAppointmentTime('');
                      setTempDate('');
                      setTempTime('');
                    }}
                    className="h-6 w-6 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-[13px] transition active:scale-95"
                    title="Xóa lịch hẹn"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
                  const y = tomorrow.getFullYear();
                  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
                  const d = String(tomorrow.getDate()).padStart(2, '0');
                  setTempDate(`${y}-${m}-${d}`);
                  setTempTime('10:00');
                  setIsPickerExpanded(true);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-bold py-3.5 px-4 text-[13px] text-booking-text flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-sm"
              >
                <span>📅</span>
                Đặt lịch hẹn xem phòng (Tùy chọn)
              </button>
            )}
          </div>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-600 rounded-xl font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Active Session Mini Banner */}
        {timerActive && !isModalOpen && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col gap-2 shadow-sm animate-pulse">
            <div className="flex items-center justify-between text-xs font-bold text-amber-800">
              <span className="flex items-center gap-1">
                <ClockIcon className="h-4 w-4" />
                Đang chờ thanh toán...
              </span>
              <span>{formatTime(countdown)}</span>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition"
            >
              Mở lại trang thanh toán
            </button>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-col gap-2.5">
          {activeDepositStatus === 'CONFIRMED' ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 shadow-sm">
              <span className="text-2xl">✅</span>
              <div className="text-left">
                <p className="text-sm font-extrabold">Đã đặt cọc thành công</p>
                <p className="text-xs text-emerald-600 mt-0.5">Phòng đã được khóa để chờ chủ phòng duyệt đơn cọc.</p>
              </div>
            </div>
          ) : (
            <button
              disabled={loading || timerActive || roomStatus === 'RENTED' || roomStatus === 'HIDDEN'}
              onClick={startBookingFlow}
              className={`w-full rounded-xl text-white font-bold py-3.5 px-5 flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md ${timerActive || roomStatus === 'RENTED' || roomStatus === 'HIDDEN'
                ? 'bg-slate-400 cursor-not-allowed shadow-none'
                : 'bg-[#004ac6] hover:bg-[#003f9e] shadow-booking-primary/10'
                }`}
            >
              {loading ? (
                <span className="flex items-center gap-1">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang xử lý...
                </span>
              ) : roomStatus === 'HIDDEN' ? (
                <>Phòng không khả dụng</>
              ) : roomStatus === 'RENTED' ? (
                user && user.userId === rentedBy ? (
                  <>Bạn đang thuê phòng này</>
                ) : (
                  <>Phòng đã được thuê</>
                )
              ) : (
                <>
                  <WalletIcon className="h-5 w-5 text-white" />
                  Đặt cọc ngay
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={async () => {
              if (!user) {
                window.dispatchEvent(new CustomEvent('show-login-prompt', {
                  detail: { redirectUrl: window.location.href }
                }));
                return;
              }
              if (user.role !== 'TENANT') {
                window.dispatchEvent(new CustomEvent('show-toast', {
                  detail: { message: 'Chỉ tài khoản Người thuê (Tenant) mới có thể nhắn tin với chủ nhà.', type: 'error' }
                }));
                return;
              }
              if (!host || !host.userId) {
                window.dispatchEvent(new CustomEvent('show-toast', {
                  detail: { message: 'Không tìm thấy thông tin chủ phòng.', type: 'error' }
                }));
                return;
              }
              await openChatWith(host.userId, host.fullName, host.avatarUrl);
            }}
            className="w-full rounded-xl border border-booking-primary text-booking-primary font-bold py-3.5 px-5 flex items-center justify-center gap-2 hover:bg-[#004ac6]/5 transition active:scale-[0.98]"
          >
            <MessageIcon className="h-5 w-5 text-booking-primary" />
            Nhắn tin cho chủ phòng
          </button>
        </div>

        {/* Footnote */}
        <div className="flex items-center justify-center gap-1 text-[11px] text-booking-muted mt-1 font-medium">
          <LockIcon className="h-3.5 w-3.5 text-booking-muted" />
          <span>Giao dịch an toàn qua Booking-Room</span>
        </div>
      </aside>

      {/* Payment Overlay Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-extrabold text-booking-text text-base md:text-lg">Chi tiết đơn đặt cọc phòng</h3>
                <p className="text-xs text-booking-muted mt-0.5 max-w-[320px] truncate">{roomTitle}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-sm transition"
                aria-label="Đóng giao diện thanh toán"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex flex-col items-center text-center gap-6">
              {/* Timer Row */}
              <div className="flex items-center gap-2 py-2 px-4 rounded-full bg-rose-50 border border-rose-200 text-rose-600 font-extrabold text-sm md:text-base animate-pulse">
                <ClockIcon className="h-5 w-5 text-rose-500" />
                Thời gian thanh toán còn lại: {formatTime(countdown)}
              </div>

              {/* Detailed Invoice Table */}
              <div className="w-full border border-slate-200 rounded-2xl overflow-hidden bg-white text-sm">
                <div className="bg-[#FAF8FF] border-b border-slate-200 px-4 py-3 text-left font-bold text-booking-text flex items-center gap-2">
                  <span className="text-lg">📋</span> Thông tin chi tiết hóa đơn đặt cọc
                </div>
                <div className="divide-y divide-slate-100 text-left">
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-booking-muted font-medium">Mã đơn đặt cọc</span>
                    <span className="font-mono text-xs font-bold text-booking-text bg-slate-100 px-2 py-0.5 rounded">{activeDepositId}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-booking-muted font-medium">Tên phòng</span>
                    <span className="font-bold text-booking-text max-w-[200px] text-right truncate" title={roomTitle}>{roomTitle}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-booking-muted font-medium">Giá thuê phòng</span>
                    <span className="font-bold text-booking-text">{price.toLocaleString('vi-VN')} đ/tháng</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-booking-muted font-medium font-bold">Số tiền cọc cần trả</span>
                    <span className="font-extrabold text-[#004ac6] text-base">{deposit.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-booking-muted font-medium">Nội dung thanh toán</span>
                    <span className="font-medium text-booking-text max-w-[220px] text-right text-xs text-[#004ac6]">
                      Thanh toan dat coc cho phong: {roomTitle}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-booking-muted font-medium">Phương thức thanh toán</span>
                    <span className="font-bold text-booking-text flex items-center gap-1">
                      <span className="text-xs">💳</span> VNPAY Sandbox
                    </span>
                  </div>
                </div>

                {appointmentTime && (
                  <>
                    <div className="border-t border-slate-200/50 my-1" />
                    <div>
                      <p className="text-[11px] font-bold text-booking-muted uppercase tracking-[0.02em]">Lịch hẹn xem phòng</p>
                      <p className="text-sm font-extrabold text-booking-text mt-0.5 flex items-center gap-1.5">
                        <span>📅</span> {formatDisplayDateTime(appointmentTime)}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <p className="text-[11px] text-booking-muted leading-relaxed">
                Vui lòng xác nhận thông tin hóa đơn đặt cọc ở trên. Khi nhấn <strong>Thanh toán ngay</strong>, bạn sẽ được đưa tới Cổng thanh toán VNPAY Sandbox để hoàn tất giao dịch.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 flex bg-slate-50 gap-3">
              <button
                disabled={loading}
                onClick={() => setIsConfirmCancelOpen(true)}
                className="flex-1 py-3 px-4 border border-rose-200 hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-bold rounded-xl transition text-sm flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Đang hủy...
                  </>
                ) : (
                  'Hủy giao dịch'
                )}
              </button>

              <button
                onClick={() => {
                  if (paymentUrl) {
                    window.location.href = paymentUrl;
                  }
                }}
                disabled={!paymentUrl || loading}
                className="flex-1 py-3 px-4 bg-[#004ac6] hover:bg-[#003f9e] text-white font-bold rounded-xl transition text-sm flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                💳 Thanh toán ngay
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isConfirmCancelOpen}
        onClose={() => setIsConfirmCancelOpen(false)}
        onConfirm={async () => {
          setIsConfirmCancelOpen(false);
          await handleCancelOrExpire(false);
        }}
        loading={loading}
      />
    </>
  );
}
