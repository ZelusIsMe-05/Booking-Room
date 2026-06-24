'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { roomService } from '@/services/roomService';
import { bookingService, DepositResponse } from '@/services/bookingService';
import ConfirmModal from './ConfirmModal';

interface MyDepositsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExtendedDeposit extends DepositResponse {
  room_title?: string;
  room_address?: string;
}

export default function MyDepositsModal({ isOpen, onClose }: MyDepositsModalProps) {
  const router = useRouter();
  const [checkingRoomId, setCheckingRoomId] = useState<string | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [deposits, setDeposits] = useState<ExtendedDeposit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchDeposits = async () => {
    setLoading(true);
    setError('');
    try {
      const statusParam = filter === 'ALL' ? undefined : filter;
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
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể lấy lịch sử đặt cọc.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDeposits();
    }
  }, [isOpen, filter, page]);

  if (!isOpen) return null;

  const handleViewRoom = async (roomId: string) => {
    if (checkingRoomId) return;
    setCheckingRoomId(roomId);
    try {
      await roomService.getRoomById(roomId);
      router.push(`/rooms/${roomId}`);
      onClose();
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in">
      <div 
        className="relative w-full max-w-4xl bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Đơn đặt cọc</h2>
            <p className="text-xs text-gray-500 mt-1">Lịch sử đặt cọc của bạn và trạng thái thanh toán</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-gray-200 bg-white rounded-xl text-sm font-semibold text-gray-800 outline-none shadow-sm focus:border-[#0052CC]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PROCESSING">Chờ thanh toán</option>
              <option value="CONFIRMED">Đã thanh toán</option>
              <option value="ACCEPTED">Đã duyệt</option>
              <option value="REJECTED">Bị từ chối</option>
              <option value="CANCELLED">Đã hủy</option>
              <option value="EXPIRED">Đã hết hạn</option>
            </select>
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-24 text-center">
              <div className="w-10 h-10 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-booking-muted text-sm">Đang tải lịch sử đặt cọc...</p>
            </div>
          ) : deposits.length > 0 ? (
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl bg-white overflow-hidden">
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-6 pt-3 text-xs text-gray-500">
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
        </div>

        {/* Footer with Pagination */}
        {totalPages > 1 && (
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-booking-muted">
              Hiển thị trang {page}/{totalPages} (Tổng cộng {totalItems} kết quả)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1 || loading}
                className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Trước
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages || loading}
                className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
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
