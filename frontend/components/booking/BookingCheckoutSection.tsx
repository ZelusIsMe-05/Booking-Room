'use client';

import { useState, useEffect, useRef } from 'react';
import { WalletIcon, MessageIcon, LockIcon, ClockIcon } from './Icons';
import { bookingService } from '@/services/bookingService';

interface BookingCheckoutSectionProps {
  roomId: string;
  price: number;
  deposit: number;
  roomTitle: string;
}

export default function BookingCheckoutSection({
  roomId,
  price,
  deposit,
  roomTitle,
}: BookingCheckoutSectionProps) {
  // Booking status and states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [appointmentTime, setAppointmentTime] = useState<string>('');
  const [tempDate, setTempDate] = useState<string>('');
  const [tempTime, setTempTime] = useState<string>('');
  const [isPickerExpanded, setIsPickerExpanded] = useState<boolean>(false);

  // Active deposit details
  const [activeDepositId, setActiveDepositId] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(900); // 15 mins in seconds
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timerActive, setTimerActive] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load active transaction from sessionStorage if page is reloaded
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

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
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

      // 2. Call Create Transaction API
      console.log('Calling Create Transaction with Deposit ID:', newDepositId);
      const txnRes = await bookingService.createTransaction(newDepositId, 'VNPAY');
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
        alert('Giao dịch đặt cọc của bạn đã hết hạn (15 phút).');
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
            <p className="mt-1 text-sm font-extrabold text-[#006a61]">Còn phòng</p>
          </div>
        </div>

        {/* Appointment Scheduler Panel */}
        {!timerActive && (
          <div className="flex flex-col gap-3">
            {isPickerExpanded ? (
              <div className="border border-slate-200 rounded-2xl bg-slate-50 p-4 flex flex-col gap-3 shadow-inner animate-in slide-in-from-top-3 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-booking-text uppercase tracking-wide flex items-center gap-1">
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
                    <label className="text-[10px] font-extrabold text-booking-muted uppercase tracking-wider">Chọn ngày</label>
                    <input
                      type="date"
                      value={tempDate}
                      onChange={(e) => setTempDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-white rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-booking-text focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6]/10 outline-none transition cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold text-booking-muted uppercase tracking-wider">Chọn giờ</label>
                    <input
                      type="time"
                      value={tempTime}
                      onChange={(e) => setTempTime(e.target.value)}
                      className="w-full bg-white rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-booking-text focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6]/10 outline-none transition cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!tempDate || !tempTime) {
                        alert('Vui lòng chọn đầy đủ cả ngày và giờ hẹn.');
                        return;
                      }
                      const selected = new Date(`${tempDate}T${tempTime}`);
                      if (selected.getTime() <= Date.now()) {
                        alert('Lịch hẹn xem phòng phải ở thời điểm tương lai.');
                        return;
                      }
                      setAppointmentTime(`${tempDate}T${tempTime}`);
                      setIsPickerExpanded(false);
                    }}
                    className="flex-1 py-2 bg-[#004ac6] hover:bg-[#003f9e] text-white font-extrabold rounded-xl text-xs transition shadow-md active:scale-[0.98]"
                  >
                    Áp dụng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPickerExpanded(false);
                    }}
                    className="py-2 px-3.5 border border-slate-200 bg-white text-booking-text font-bold rounded-xl text-xs hover:bg-slate-50 transition active:scale-[0.98]"
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
                    <p className="text-[10px] font-extrabold text-[#004ac6] uppercase tracking-wider">Lịch hẹn xem phòng</p>
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
                    className="text-xs font-bold text-[#004ac6] hover:underline"
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
                    className="h-6 w-6 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-xs transition active:scale-95"
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
                className="w-full rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-bold py-3.5 px-4 text-xs text-booking-text flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-sm"
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
          <button
            disabled={loading || timerActive}
            onClick={startBookingFlow}
            className={`w-full rounded-xl text-white font-bold py-3.5 px-5 flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md ${timerActive
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
            ) : (
              <>
                <WalletIcon className="h-5 w-5 text-white" />
                Đặt cọc ngay
              </>
            )}
          </button>

          <button className="w-full rounded-xl border border-booking-primary text-booking-primary font-bold py-3.5 px-5 flex items-center justify-center gap-2 hover:bg-[#004ac6]/5 transition active:scale-[0.98]">
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
                <h3 className="font-extrabold text-booking-text text-base md:text-lg">Thanh toán đặt cọc phòng</h3>
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

              {/* Price Row */}
              <div className="w-full p-4 rounded-2xl bg-[#faf8ff] border border-slate-100 flex justify-between items-center text-left">
                <div>
                  <p className="text-[11px] font-bold text-booking-muted uppercase tracking-[0.02em]">Số tiền cọc</p>
                  <p className="text-xl md:text-2xl font-extrabold text-booking-text mt-0.5">
                    {deposit.toLocaleString('vi-VN')} đ
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-booking-muted uppercase tracking-[0.02em]">Giá thuê/tháng</p>
                  <p className="text-sm font-bold text-booking-text mt-0.5">
                    {price.toLocaleString('vi-VN')} đ
                  </p>
                </div>
              </div>

              {/* simulated payment gateway details */}
              <div className="w-full space-y-4">
                <p className="text-xs font-bold text-booking-muted uppercase tracking-[0.02em] text-left">
                  Quét mã QR thanh toán (Mô phỏng Sandbox)
                </p>

                {/* Mock QR Code Image Display */}
                <div className="relative mx-auto h-[220px] w-[220px] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center p-2 shadow-inner">
                  {/* Since sandbox is mock, we output a beautiful generic checkout QR image */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://vnpay.vn"
                    alt="Mock Payment QR Code"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="text-xs text-booking-muted space-y-1">
                  <p className="font-semibold text-booking-text">Nội dung chuyển khoản (Tự động):</p>
                  <p className="py-1 px-3 bg-slate-100 rounded-lg font-mono text-booking-text break-all select-all">
                    DEPOSIT_{activeDepositId?.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-[11px] pt-1">
                    * Mở ứng dụng ngân hàng hoặc ví VNPAY quét mã QR phía trên để hoàn tất thanh toán.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 flex bg-slate-50 justify-center">
              <button
                disabled={loading}
                onClick={() => handleCancelOrExpire(false)}
                className="w-full py-3.5 px-5 border border-rose-200 hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-extrabold rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Đang hủy giao dịch...
                  </>
                ) : (
                  'Hủy giao dịch'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
