'use client';

import { useState, useEffect, FormEvent } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';

interface ViolationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ViolationReport {
  report_id: string;
  room_id?: string;
  landlord_id?: string;
  room_title?: string;
  landlord_name?: string;
  reason: string;
  evidence_image_url?: string;
  resolution_status: string;
  created_at: string;
}

type ViewTab = 'create' | 'history';

export default function ViolationReportModal({ isOpen, onClose }: ViolationReportModalProps) {
  const [viewTab, setViewTab] = useState<ViewTab>('create');

  // History state
  const [reports, setReports] = useState<ViolationReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedReport, setSelectedReport] = useState<ViolationReport | null>(null);

  // Form state
  const [violationType, setViolationType] = useState<'room' | 'landlord'>('room');
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Eligible targets list
  const [eligibleTargets, setEligibleTargets] = useState<any[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(false);

  const getToken = () =>
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/violation-reports?page=${page}&limit=5`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Lỗi tải đơn khiếu nại');
      const data = json.data || {};
      setReports(data.items || []);
      setTotalItems(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / 5) || 1);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách đơn khiếu nại.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEligibleTargets = async () => {
    setTargetsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/violation-reports/eligible-targets`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (res.ok) {
        setEligibleTargets(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching eligible targets:', err);
    } finally {
      setTargetsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && viewTab === 'history') {
      fetchReports();
    }
  }, [isOpen, viewTab, page]);

  // Reset form khi mở modal
  useEffect(() => {
    if (isOpen) {
      setViewTab('create');
      setFormError('');
      setFormSuccess('');
      setTargetId('');
      setReason('');
      setEvidenceFile(null);
      setPreviewUrl(null);
      setSelectedReport(null);
      fetchEligibleTargets();
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setEvidenceFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!targetId) {
      setFormError(`Vui lòng chọn ${violationType === 'room' ? 'phòng' : 'chủ nhà'} để khiếu nại.`);
      return;
    }
    if (!reason.trim()) {
      setFormError('Vui lòng nhập lý do khiếu nại.');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('reason', reason.trim());
      if (violationType === 'room') {
        formData.append('room_id', targetId);
      } else {
        formData.append('landlord_id', targetId);
      }
      if (evidenceFile) {
        formData.append('evidence_image', evidenceFile);
      }

      const res = await fetch(`${API_BASE}/violation-reports`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Gửi thất bại');
      setFormSuccess('Đã gửi đơn khiếu nại thành công! Chúng tôi sẽ xử lý nghiêm khắc.');
      setTargetId('');
      setReason('');
      setEvidenceFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      setFormError(err.message || 'Gửi đơn khiếu nại thất bại.');
    } finally {
      setSubmitting(false);
    }
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
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Chờ xử lý
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Đang xử lý
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Đã giải quyết
          </span>
        );
      case 'DISMISSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            Bác bỏ
          </span>
        );
      default:
        return <span className="text-xs text-gray-500">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
      <div
        className="relative w-[800px] max-w-[95vw] h-[760px] max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Đơn khiếu nại
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Gửi khiếu nại về phòng hoặc chủ nhà để Admin xem xét</p>
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

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-100 bg-white px-6 pt-3">
          <button
            onClick={() => { setViewTab('create'); setSelectedReport(null); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
              viewTab === 'create'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Tạo đơn mới
          </button>
          <button
            onClick={() => { setViewTab('history'); setSelectedReport(null); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
              viewTab === 'history'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Lịch sử
            {totalItems > 0 && viewTab === 'history' && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-orange-50 text-orange-600 rounded-full">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* CREATE TAB */}
          {viewTab === 'create' && (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-semibold flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-semibold flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formSuccess}
                  <button
                    type="button"
                    onClick={() => setViewTab('history')}
                    className="ml-auto text-orange-600 hover:underline text-xs font-bold whitespace-nowrap"
                  >
                    Xem lịch sử →
                  </button>
                </div>
              )}

              {/* Type selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Loại khiếu nại <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setViolationType('room'); setTargetId(''); }}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                      violationType === 'room'
                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    Về phòng
                  </button>
                  <button
                    type="button"
                    onClick={() => { setViolationType('landlord'); setTargetId(''); }}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                      violationType === 'landlord'
                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Về chủ nhà
                  </button>
                </div>
              </div>

              {violationType === 'room' ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                    Chọn phòng muốn khiếu nại <span className="text-red-500">*</span>
                  </label>
                  {targetsLoading ? (
                    <div className="py-4 text-center text-sm text-gray-500">Đang tải danh sách phòng...</div>
                  ) : eligibleTargets.filter(t => t.room_id).length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                      Bạn chưa có phòng trọ nào đã thanh toán đặt cọc thành công và được chủ trọ duyệt để thực hiện khiếu nại.
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white">
                      {Array.from(new Map(eligibleTargets.filter(t => t.room_id).map(t => [t.room_id, t])).values()).map((room: any) => (
                        <label
                          key={room.room_id}
                          className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                            targetId === room.room_id ? 'bg-orange-50/50' : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="violation_target"
                            value={room.room_id}
                            checked={targetId === room.room_id}
                            onChange={() => setTargetId(room.room_id)}
                            className="mt-1 h-4 w-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[#172B4D] truncate">{room.room_title}</p>
                            <p className="text-xs text-gray-500 truncate">{room.room_address}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Chủ nhà: {room.landlord_name}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                    Chọn chủ nhà muốn khiếu nại <span className="text-red-500">*</span>
                  </label>
                  {targetsLoading ? (
                    <div className="py-4 text-center text-sm text-gray-500">Đang tải danh sách chủ nhà...</div>
                  ) : eligibleTargets.filter(t => t.landlord_id).length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                      Bạn chưa có chủ nhà nào đã thanh toán đặt cọc thành công và được duyệt để thực hiện khiếu nại.
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white">
                      {Array.from(new Map(eligibleTargets.filter(t => t.landlord_id).map(t => [t.landlord_id, t])).values()).map((landlord: any) => (
                        <label
                          key={landlord.landlord_id}
                          className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                            targetId === landlord.landlord_id ? 'bg-orange-50/50' : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="violation_target"
                            value={landlord.landlord_id}
                            checked={targetId === landlord.landlord_id}
                            onChange={() => setTargetId(landlord.landlord_id)}
                            className="mt-1 h-4 w-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[#172B4D] truncate">{landlord.landlord_name}</p>
                            <p className="text-xs text-gray-500">Từ phòng đã đặt cọc: {landlord.room_title}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Lý do khiếu nại <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Mô tả chi tiết vi phạm, hành vi sai trái hoặc vấn đề bạn gặp phải..."
                  rows={4}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-300 transition-all resize-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                  Ảnh bằng chứng <span className="text-gray-400 font-normal">(tùy chọn)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 cursor-pointer"
                />
                {previewUrl && (
                  <div className="mt-2 relative w-32 h-32 border border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setEvidenceFile(null); setPreviewUrl(null); }}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-wait shadow-sm"
                >
                  {submitting ? 'Đang gửi...' : 'Gửi khiếu nại'}
                </button>
              </div>
            </form>
          )}

          {/* HISTORY TAB */}
          {viewTab === 'history' && (
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-semibold flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                  <button onClick={fetchReports} className="ml-auto text-orange-600 hover:underline text-xs font-bold">Thử lại</button>
                </div>
              )}

              {loading ? (
                <div className="py-20 text-center">
                  <div className="w-10 h-10 border-4 border-orange-450 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Đang tải đơn khiếu nại...</p>
                </div>
              ) : selectedReport ? (
                <div className="space-y-6">
                  {/* Back button */}
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Quay lại danh sách
                  </button>

                  <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 border-b border-gray-50 pb-4">
                      <div>
                        {selectedReport.room_id ? (
                          <span className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                            Khiếu nại về phòng
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                            Khiếu nại về chủ nhà
                          </span>
                        )}
                        <h3 className="text-lg font-bold text-gray-900 mt-2">
                          Đối tượng: {selectedReport.room_id ? (selectedReport.room_title || 'Thông tin phòng') : (selectedReport.landlord_name || 'Thông tin chủ nhà')}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">Ngày gửi: {formatDate(selectedReport.created_at)}</p>
                      </div>
                      <div className="shrink-0">{renderStatusBadge(selectedReport.resolution_status)}</div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Lý do khiếu nại:</h4>
                      <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {selectedReport.reason}
                      </div>
                    </div>

                    {/* Evidence image */}
                    {selectedReport.evidence_image_url && (
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hình ảnh bằng chứng:</h4>
                        <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50 max-h-72 flex items-center justify-center p-2">
                          <img
                            src={selectedReport.evidence_image_url.startsWith('http') ? selectedReport.evidence_image_url : `${API_BASE.replace('/api', '')}${selectedReport.evidence_image_url}`}
                            alt="Bằng chứng"
                            className="max-h-64 object-contain rounded-lg hover:scale-102 transition-transform duration-200 shadow-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : reports.length > 0 ? (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl bg-white overflow-hidden shadow-sm">
                  {reports.map((r) => {
                    const titleText = r.room_id
                      ? `Khiếu nại phòng: ${r.room_title || 'Đang tải...'}`
                      : `Khiếu nại chủ nhà: ${r.landlord_name || 'Đang tải...'}`;

                    return (
                      <div
                        key={r.report_id}
                        onClick={() => setSelectedReport(r)}
                        className="p-5 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              {r.room_id ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                                  Về phòng
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                                  Về chủ nhà
                                </span>
                              )}
                              <span className="text-[10px] text-gray-400">{formatDate(r.created_at)}</span>
                            </div>
                            <p className="font-bold text-sm text-[#172B4D] group-hover:text-orange-600 transition-colors">
                              {titleText}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{r.reason}</p>
                            {r.evidence_image_url && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 mt-1.5 font-semibold">
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Có ảnh bằng chứng
                              </span>
                            )}
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-2">
                            {renderStatusBadge(r.resolution_status)}
                            <span className="text-xs text-orange-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                              Chi tiết →
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20 text-gray-500">
                  <svg className="w-14 h-14 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm font-semibold">Chưa có đơn khiếu nại nào.</p>
                  <button
                    onClick={() => setViewTab('create')}
                    className="mt-4 text-sm font-bold text-orange-600 hover:underline"
                  >
                    Gửi khiếu nại đầu tiên →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Pagination (history only) */}
        {viewTab === 'history' && !selectedReport && totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Trang {page}/{totalPages} · {totalItems} đơn
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1 || loading}
                className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Trước
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages || loading}
                className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
