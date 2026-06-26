'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/context/LanguageContext';

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
  admin_response?: string;
  created_at: string;
  updated_at: string;
}

type ViewTab = 'create' | 'history';

export default function SupportTicketModal({ isOpen, onClose }: SupportTicketModalProps) {
  const router = useRouter();
  const { t } = useTranslation();
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
      setFormError(t('modals.support.formErrRequired'));
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
      setFormSuccess(t('modals.support.formSuccess'));
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
            {t('modals.support.statusOpen')}
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            {t('modals.support.statusInProgress')}
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            {t('modals.support.statusClosed')}
          </span>
        );
      default:
        return <span className="text-xs text-gray-500">{status}</span>;
    }
  };

  const categoryLabel: Record<string, string> = {
    APP_FAULT: t('modals.support.catAppFault'),
    ACCOUNT: t('modals.support.catAccount'),
    PAYMENT: t('modals.support.catPayment'),
    OTHER: t('modals.support.catOther'),
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
      <div
        className="relative w-[800px] max-w-[95vw] h-[760px] max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('modals.support.title')}</h2>
            <p className="text-xs text-gray-500 mt-1">{t('modals.support.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={t('modals.support.close')}
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
            {t('modals.support.tabCreate')}
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
            {t('modals.support.tabHistory')}
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
                    {t('modals.support.viewHistoryLink')}
                  </button>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  {t('modals.support.categoryLabel')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] transition-all"
                >
                  <option value="APP_FAULT">{t('modals.support.catAppFault')}</option>
                  <option value="ACCOUNT">{t('modals.support.catAccount')}</option>
                  <option value="PAYMENT">{t('modals.support.catPayment')}</option>
                  <option value="OTHER">{t('modals.support.catOther')}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  {t('modals.support.titleLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('modals.support.titlePlaceholder')}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  {t('modals.support.descLabel')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder={t('modals.support.descPlaceholder')}
                  rows={4}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] transition-all resize-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                  {t('modals.support.evidenceLabel')} <span className="text-gray-400 font-normal">{t('modals.support.evidenceOptional')}</span>
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
                  {submitting ? t('modals.support.btnSubmitting') : t('modals.support.btnSubmit')}
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
                  <button onClick={fetchTickets} className="ml-auto text-[#0052CC] hover:underline text-xs font-bold">{t('modals.support.btnRetry')}</button>
                </div>
              )}

              {loading ? (
                <div className="py-20 text-center">
                  <div className="w-10 h-10 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-500">{t('modals.support.loading')}</p>
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
                    {t('modals.support.backToList')}
                  </button>

                  <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 border-b border-gray-55 pb-4">
                      <div>
                        <span className="px-2.5 py-1 text-xs font-bold bg-[#EEF4FF] text-[#0052CC] rounded-full">
                          {categoryLabel[selectedTicket.category] || selectedTicket.category}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 mt-2">{selectedTicket.title}</h3>
                        <p className="text-xs text-gray-400 mt-1">{t('modals.support.sentDate')} {formatDate(selectedTicket.created_at)}</p>
                      </div>
                      <div className="shrink-0">{renderStatusBadge(selectedTicket.status)}</div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('modals.support.descLabel')}:</h4>
                      <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {selectedTicket.detailed_description}
                      </div>
                    </div>

                    {/* Evidence image */}
                    {selectedTicket.evidence_image_url && (
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('modals.support.evidenceAttached')}</h4>
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

                  {/* Admin response */}
                  <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-3 bg-[#0052CC] rounded-full" />
                      Phản hồi từ Quản trị viên
                    </h4>
                    {selectedTicket.admin_response ? (
                      <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-sm text-blue-800 whitespace-pre-wrap leading-relaxed">
                        {selectedTicket.admin_response}
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 text-sm text-gray-400 italic">
                        Chưa có phản hồi từ quản trị viên.
                      </div>
                    )}
                  </div>
                </div>
              ) : tickets.length > 0 ? (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl bg-white overflow-hidden shadow-sm">
                  {tickets.map((tItem) => (
                    <div
                      key={tItem.ticket_id}
                      onClick={() => setSelectedTicket(tItem)}
                      className="p-5 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#EEF4FF] text-[#0052CC] rounded-full">
                              {categoryLabel[tItem.category] || tItem.category}
                            </span>
                            <span className="text-[10px] text-gray-400">{formatDate(tItem.created_at)}</span>
                          </div>
                          <p className="font-bold text-sm text-[#172B4D] group-hover:text-[#0052CC] transition-colors">{tItem.title}</p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{tItem.detailed_description}</p>
                          {tItem.evidence_image_url && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 mt-1.5 font-semibold">
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {t('modals.support.hasEvidence')}
                            </span>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-2">
                          {renderStatusBadge(tItem.status)}
                          <span className="text-xs text-[#0052CC] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            {t('modals.support.btnDetail')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-booking-muted bg-white border border-gray-100 rounded-xl">
                  <svg className="w-16 h-16 mx-auto text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm font-semibold">{t('modals.support.noData')}</p>
                  <button
                    onClick={() => setViewTab('create')}
                    className="mt-4 text-sm font-bold text-[#0052CC] hover:underline"
                  >
                    {t('modals.support.createFirst')}
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
              {t('modals.support.pageInfo').replace('{{page}}', String(page)).replace('{{totalPages}}', String(totalPages)).replace('{{total}}', String(totalItems))}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1 || loading}
                className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {t('modals.support.prev')}
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages || loading}
                className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {t('modals.support.next')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
