'use client';

import { useState, useEffect, FormEvent } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SupportTicket {
  ticket_id: string;
  category: string;
  title: string;
  detailed_description: string;
  evidence_image_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

type ViewTab = 'create' | 'history';

export default function SupportTicketModal({ isOpen, onClose }: SupportTicketModalProps) {
  const [viewTab, setViewTab] = useState<ViewTab>('create');

  // History state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  // Form state
  const [category, setCategory] = useState('APP_FAULT');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const getToken = () =>
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const fetchTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/support-tickets?page=${page}&limit=5`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Lỗi tải đơn hỗ trợ');
      const data = json.data || {};
      setTickets(data.items || []);
      setTotalItems(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / 5) || 1);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách đơn hỗ trợ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && viewTab === 'history') {
      fetchTickets();
    }
  }, [isOpen, viewTab, page]);

  // Reset form khi mở modal
  useEffect(() => {
    if (isOpen) {
      setViewTab('create');
      setFormError('');
      setFormSuccess('');
      setTitle('');
      setDesc('');
      setEvidenceFile(null);
      setPreviewUrl(null);
      setCategory('APP_FAULT');
      setSelectedTicket(null);
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
    if (!title.trim() || !desc.trim()) {
      setFormError('Vui lòng điền đầy đủ Tiêu đề và Mô tả chi tiết.');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('title', title.trim());
      formData.append('detailed_description', desc.trim());
      if (evidenceFile) {
        formData.append('evidence_image', evidenceFile);
      }

      const res = await fetch(`${API_BASE}/support-tickets`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Gửi thất bại');
      setFormSuccess('Đã gửi đơn hỗ trợ thành công! Admin sẽ xem xét và phản hồi sớm.');
      setTitle('');
      setDesc('');
      setEvidenceFile(null);
      setPreviewUrl(null);
      setCategory('APP_FAULT');
    } catch (err: any) {
      setFormError(err.message || 'Gửi đơn hỗ trợ thất bại.');
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
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Đang mở
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Đang xử lý
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            Đã đóng
          </span>
        );
      default:
        return <span className="text-xs text-gray-500">{status}</span>;
    }
  };

  const categoryLabel: Record<string, string> = {
    APP_FAULT: 'Lỗi ứng dụng',
    ACCOUNT: 'Tài khoản',
    PAYMENT: 'Thanh toán',
    OTHER: 'Khác',
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
              <svg className="w-5 h-5 text-[#0052CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Đơn hỗ trợ
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Gửi yêu cầu hỗ trợ kỹ thuật hoặc tài khoản đến Admin</p>
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
            onClick={() => { setViewTab('create'); setSelectedTicket(null); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
              viewTab === 'create'
                ? 'border-[#0052CC] text-[#0052CC]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Tạo đơn mới
          </button>
          <button
            onClick={() => { setViewTab('history'); setSelectedTicket(null); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
              viewTab === 'history'
                ? 'border-[#0052CC] text-[#0052CC]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Lịch sử
            {totalItems > 0 && viewTab === 'history' && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-[#EEF4FF] text-[#0052CC] rounded-full">
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
                    onClick={() => { setViewTab('history'); }}
                    className="ml-auto text-[#0052CC] hover:underline text-xs font-bold whitespace-nowrap"
                  >
                    Xem lịch sử →
                  </button>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Danh mục <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] transition-all"
                >
                  <option value="APP_FAULT">Lỗi ứng dụng</option>
                  <option value="ACCOUNT">Tài khoản</option>
                  <option value="PAYMENT">Thanh toán</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Không thể đổi mật khẩu"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Mô tả chi tiết <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Mô tả chi tiết vấn đề bạn gặp phải, các bước tái hiện lỗi..."
                  rows={4}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] transition-all resize-none"
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
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#EEF4FF] file:text-[#0052CC] hover:file:bg-[#DEEBFF] cursor-pointer"
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
                  className="w-full py-3 text-sm font-bold text-white bg-[#0052CC] hover:bg-[#0043A8] rounded-xl transition-colors disabled:opacity-70 disabled:cursor-wait shadow-sm"
                >
                  {submitting ? 'Đang gửi...' : 'Gửi đơn hỗ trợ'}
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
                  <button onClick={fetchTickets} className="ml-auto text-[#0052CC] hover:underline text-xs font-bold">Thử lại</button>
                </div>
              )}

              {loading ? (
                <div className="py-20 text-center">
                  <div className="w-10 h-10 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Đang tải đơn hỗ trợ...</p>
                </div>
              ) : selectedTicket ? (
                <div className="space-y-6">
                  {/* Back button */}
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Quay lại danh sách
                  </button>

                  <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 border-b border-gray-55 pb-4">
                      <div>
                        <span className="px-2.5 py-1 text-xs font-bold bg-[#EEF4FF] text-[#0052CC] rounded-full">
                          {categoryLabel[selectedTicket.category] || selectedTicket.category}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 mt-2">{selectedTicket.title}</h3>
                        <p className="text-xs text-gray-400 mt-1">Ngày gửi: {formatDate(selectedTicket.created_at)}</p>
                      </div>
                      <div className="shrink-0">{renderStatusBadge(selectedTicket.status)}</div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mô tả chi tiết:</h4>
                      <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {selectedTicket.detailed_description}
                      </div>
                    </div>

                    {/* Evidence image */}
                    {selectedTicket.evidence_image_url && (
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hình ảnh đính kèm:</h4>
                        <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50 max-h-72 flex items-center justify-center p-2">
                          <img
                            src={selectedTicket.evidence_image_url.startsWith('http') ? selectedTicket.evidence_image_url : `${API_BASE.replace('/api', '')}${selectedTicket.evidence_image_url}`}
                            alt="Bằng chứng"
                            className="max-h-64 object-contain rounded-lg hover:scale-102 transition-transform duration-200 shadow-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : tickets.length > 0 ? (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl bg-white overflow-hidden shadow-sm">
                  {tickets.map((t) => (
                    <div
                      key={t.ticket_id}
                      onClick={() => setSelectedTicket(t)}
                      className="p-5 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#EEF4FF] text-[#0052CC] rounded-full">
                              {categoryLabel[t.category] || t.category}
                            </span>
                            <span className="text-[10px] text-gray-400">{formatDate(t.created_at)}</span>
                          </div>
                          <p className="font-bold text-sm text-[#172B4D] group-hover:text-[#0052CC] transition-colors">{t.title}</p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{t.detailed_description}</p>
                          {t.evidence_image_url && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 mt-1.5 font-semibold">
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Có ảnh bằng chứng
                            </span>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-2">
                          {renderStatusBadge(t.status)}
                          <span className="text-xs text-[#0052CC] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            Chi tiết →
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-gray-500">
                  <svg className="w-14 h-14 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-sm font-semibold">Chưa có đơn hỗ trợ nào.</p>
                  <button
                    onClick={() => setViewTab('create')}
                    className="mt-4 text-sm font-bold text-[#0052CC] hover:underline"
                  >
                    Tạo đơn hỗ trợ đầu tiên →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Pagination (history only) */}
        {viewTab === 'history' && !selectedTicket && totalPages > 1 && (
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
