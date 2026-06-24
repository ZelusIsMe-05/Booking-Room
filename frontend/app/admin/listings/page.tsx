'use client';

import React, { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { adminService } from '@/services/adminService';
import { Check, X, Building, Search, Filter, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { getRoomFallbackImage } from '@/utils/imageFallback';
import RoomDetailModal from '@/components/admin/RoomDetailModal';

// Custom toast helper
const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
  }
};

export default function ListingApprovalPage() {
  const [pendingRooms, setPendingRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // roomId
  const [rejectingRoomId, setRejectingRoomId] = useState<string | null>(null);
  const [approvingRoomId, setApprovingRoomId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [viewingRoomId, setViewingRoomId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setPendingRooms([]);
      await new Promise(resolve => setTimeout(resolve, 300));
      const res = await adminService.getPendingRooms({
        page,
        limit,
        search: debouncedSearch || undefined,
        status: filterStatus === 'ALL' ? undefined : filterStatus
      });
      setPendingRooms(res.items);
      setPagination({ total: res.pagination?.total || 0, totalPages: res.pagination?.totalPages || Math.ceil((res.pagination?.total || 0) / limit) || 1 });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải danh sách phòng chờ duyệt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [filterStatus, page, limit, debouncedSearch]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const handleApprove = async (roomIdParam?: string) => {
    const roomId = roomIdParam || approvingRoomId;
    if (!roomId) return;

    try {
      setActionLoading(roomId);
      await adminService.approveRoom(roomId);
      showToast('Đã phê duyệt bài đăng thành công', 'success');
      setApprovingRoomId(null);
      fetchRooms();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi phê duyệt bài đăng', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (roomId: string) => {
    if (!rejectReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối', 'error');
      return;
    }

    try {
      setActionLoading(roomId);
      await adminService.rejectRoom(roomId, rejectReason);
      showToast('Đã từ chối bài đăng', 'success');
      setRejectingRoomId(null);
      setRejectReason('');
      fetchRooms();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi từ chối bài đăng', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <AdminHeader
        title="Duyệt bài đăng"
        description="Kiểm tra và phê duyệt các bài đăng phòng mới từ chủ nhà."
      />

      <div className="flex-1 p-8 overflow-y-auto">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100 flex items-center gap-3">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm bài đăng..."
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-booking-primary/20 focus:border-booking-primary transition-all text-sm"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            {loading && pendingRooms.length > 0 && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-booking-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm h-[42px]">
              <button
                onClick={() => setFilterStatus('PENDING')}
                className={`px-4 py-1 font-medium rounded-lg text-sm transition-colors ${filterStatus === 'PENDING' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Chờ duyệt
              </button>
              <button
                onClick={() => setFilterStatus('APPROVED')}
                className={`px-4 py-1 font-medium rounded-lg text-sm transition-colors ${filterStatus === 'APPROVED' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Đã duyệt
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto min-h-[500px]">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
                  <th className="px-6 py-4 font-semibold">Bài đăng</th>
                  <th className="px-6 py-4 font-semibold">Thông tin</th>
                  <th className="px-6 py-4 font-semibold">Người đăng (Host)</th>
                  <th className="px-6 py-4 font-semibold">Ngày gửi</th>
                  <th className="px-6 py-4 font-semibold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-slate-100 transition-opacity duration-200 ${loading && pendingRooms.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
              {loading && pendingRooms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <span className="w-6 h-6 border-2 border-booking-teal border-t-transparent rounded-full animate-spin mb-2"></span>
                      Đang tải danh sách...
                    </div>
                  </td>
                </tr>
              ) : !loading && pendingRooms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="text-slate-400" size={32} />
                      </div>
                      <p className="text-slate-500 font-medium">Không tìm thấy bài đăng nào</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pendingRooms.map((room) => (
                    <React.Fragment key={room.roomId}>
                      <tr
                        className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                        onClick={() => setViewingRoomId(room.roomId)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-xl bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-100">
                              <img
                                src={getRoomFallbackImage(room.roomId, room.coverImageUrl)}
                                alt={room.title}
                                className="w-full h-full object-cover text-[8px] text-slate-400"
                                onError={(e) => {
                                  e.currentTarget.src = getRoomFallbackImage(room.roomId, null);
                                }}
                              />
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-900 line-clamp-1 mb-1 text-base">{room.title}</h4>
                              <p className="text-slate-500 line-clamp-1 text-sm">{room.detailedAddress}</p>
                              <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                {room.roomType === 'APARTMENT' ? 'Căn hộ' : room.roomType === 'ROOM' ? 'Phòng trọ' : 'Nhà nguyên căn'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="font-semibold text-booking-primary">{formatCurrency(room.monthlyRent)}<span className="text-xs font-normal text-slate-500">/tháng</span></p>
                            <p className="text-slate-500">Cọc: {formatCurrency(room.depositAmount)}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {room.host?.fullName?.charAt(0).toUpperCase() || 'H'}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{room.host?.fullName || 'N/A'}</p>
                              <p className="text-xs text-slate-500">{room.host?.phoneNumber || 'Không có sđt'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {new Date(room.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {filterStatus === 'PENDING' ? (
                              <>
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setApprovingRoomId(room.roomId === approvingRoomId ? null : room.roomId);
                                    setRejectingRoomId(null); 
                                  }}
                                  disabled={actionLoading === room.roomId}
                                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${approvingRoomId === room.roomId ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                  title="Phê duyệt"
                                >
                                  <Check size={18} />
                                </button>
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setRejectingRoomId(room.roomId === rejectingRoomId ? null : room.roomId); 
                                    setApprovingRoomId(null);
                                  }}
                                  disabled={actionLoading === room.roomId}
                                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${rejectingRoomId === room.roomId ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                                  title="Từ chối"
                                >
                                  <X size={18} />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setViewingRoomId(room.roomId); }}
                                className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                                title="Xem chi tiết"
                              >
                                <Eye size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Approve Form Row */}
                      {approvingRoomId === room.roomId && (
                        <tr>
                          <td colSpan={5} className="bg-emerald-50/50 p-6 border-b border-emerald-100">
                            <div className="flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
                              <label className="text-sm font-semibold text-emerald-900">Xác nhận phê duyệt bài đăng "{room.title}":</label>
                              <div className="flex gap-3 items-stretch">
                                <div className="flex-1 px-4 py-2 bg-white border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
                                  <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                                  <span>Bài đăng sẽ ngay lập tức được hiển thị công khai trên hệ thống cho khách thuê tìm kiếm và đặt chỗ.</span>
                                </div>
                                <button
                                  onClick={() => handleApprove()}
                                  disabled={actionLoading === room.roomId}
                                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors text-sm disabled:opacity-70 min-w-[150px] flex justify-center items-center"
                                >
                                  {actionLoading === room.roomId ? 'Đang xử lý...' : 'Xác nhận duyệt'}
                                </button>
                                <button
                                  onClick={() => setApprovingRoomId(null)}
                                  className="px-6 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-colors text-sm"
                                >
                                  Hủy bỏ
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      {/* Reject Form Row */}
                      {rejectingRoomId === room.roomId && (
                        <tr>
                          <td colSpan={5} className="bg-red-50/50 p-6 border-b border-red-100">
                            <div className="flex flex-col gap-3">
                              <label className="text-sm font-semibold text-slate-900">Lý do từ chối bài đăng "{room.title}":</label>
                              <div className="flex gap-3">
                                <input
                                  type="text"
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  placeholder="Nhập lý do cụ thể để Host biết (VD: Hình ảnh không rõ ràng, giá thuê không hợp lý...)"
                                  className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleReject(room.roomId)}
                                  disabled={actionLoading === room.roomId}
                                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors text-sm disabled:opacity-70"
                                >
                                  {actionLoading === room.roomId ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                                </button>
                                <button
                                  onClick={() => { setRejectingRoomId(null); setRejectReason(''); }}
                                  className="px-6 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-colors text-sm"
                                >
                                  Hủy bỏ
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && pendingRooms.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-sm">
              <span className="text-slate-500">Hiển thị {pendingRooms.length} trên tổng <span className="font-medium text-slate-900">{pagination.total}</span> bài đăng</span>
              <div className="flex gap-1 items-center">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 border border-slate-200 rounded bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Trước
                </button>
                <span className="px-2 font-medium text-slate-900">
                  Trang {page} / {pagination.totalPages}
                </span>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  className="px-3 py-1 border border-slate-200 rounded bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      <RoomDetailModal
        roomId={viewingRoomId || ''}
        isOpen={!!viewingRoomId}
        onClose={() => setViewingRoomId(null)}
        onApprove={(id) => {
          setViewingRoomId(null);
          handleApprove(id);
        }}
        onReject={(id) => {
          setViewingRoomId(null);
          setRejectingRoomId(id);
        }}
        actionLoading={actionLoading}
        isPending={filterStatus === 'PENDING'}
      />
    </div>
  );
}
