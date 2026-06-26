'use client';

import React, { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import StatusBadge from '@/components/admin/StatusBadge';
import { adminService } from '@/services/adminService';
import { getRoomFallbackImage } from '@/utils/imageFallback';
import { Check, X, Building, Search, Filter, AlertCircle, AlertTriangle, CheckCircle, Eye, ShieldCheck, XCircle, ChevronRight, MessageSquare } from 'lucide-react';
import RoomDetailModal from '@/components/admin/RoomDetailModal';
import { useTranslation } from '@/context/LanguageContext';

const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
  }
};

export default function ComplaintsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [adminResponsesTenant, setAdminResponsesTenant] = useState<Record<string, string>>({});
  const [adminResponsesLandlord, setAdminResponsesLandlord] = useState<Record<string, string>>({});
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setReports([]);
      await new Promise(resolve => setTimeout(resolve, 300));
      const res = await adminService.getViolationReports({
        page,
        limit,
        search: debouncedSearch,
        status: filterStatus === 'ALL' ? undefined : filterStatus
      });
      setReports(res.items);
      setPagination({ total: res.pagination?.total || 0, totalPages: res.pagination?.totalPages || Math.ceil((res.pagination?.total || 0) / limit) || 1 });
      setError(null);
    } catch (err: any) {
      setError(err.message || t.admin.complaintsPage.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filterStatus, page, limit, debouncedSearch]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const handleUpdateStatus = async (reportId: string, status: string) => {
    try {
      setActionLoading(reportId);
      const tenantResp = adminResponsesTenant[reportId] || '';
      const landlordResp = adminResponsesLandlord[reportId] || '';
      await adminService.updateViolationReportStatus(reportId, status, tenantResp || undefined, landlordResp || undefined);
      showToast(t.admin.complaintsPage.updateSuccess, 'success');
      setAdminResponsesTenant(prev => { const copy = { ...prev }; delete copy[reportId]; return copy; });
      setAdminResponsesLandlord(prev => { const copy = { ...prev }; delete copy[reportId]; return copy; });
      fetchReports();
    } catch (err: any) {
      showToast(err.message || t.admin.complaintsPage.updateError, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return t.admin.complaintsPage.statusPending;
      case 'PROCESSING': return t.admin.complaintsPage.statusProcessing;
      case 'RESOLVED': return t.admin.complaintsPage.statusResolved;
      case 'DISMISSED': return t.admin.complaintsPage.statusDismissed;
      default: return status;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <AdminHeader
        title={t.admin.complaintsPage.title}
        description={t.admin.complaintsPage.description}
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
              placeholder={t.admin.complaintsPage.searchPlaceholder}
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-booking-primary/20 focus:border-booking-primary transition-all text-sm shadow-sm"
            />
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            {loading && reports.length > 0 && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-booking-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-4 py-1.5 font-medium rounded-md text-sm transition-colors ${filterStatus === 'ALL' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                {t.admin.complaintsPage.filterAll}
              </button>
              <button
                onClick={() => setFilterStatus('PENDING')}
                className={`px-4 py-1.5 font-medium rounded-md text-sm transition-colors ${filterStatus === 'PENDING' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                {t.admin.complaintsPage.filterPending}
              </button>
              <button
                onClick={() => setFilterStatus('PROCESSING')}
                className={`px-4 py-1.5 font-medium rounded-md text-sm transition-colors ${filterStatus === 'PROCESSING' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                {t.admin.complaintsPage.filterProcessing}
              </button>
              <button
                onClick={() => setFilterStatus('RESOLVED')}
                className={`px-4 py-1.5 font-medium rounded-md text-sm transition-colors ${filterStatus === 'RESOLVED' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                {t.admin.complaintsPage.filterResolved}
              </button>
              <button
                onClick={() => setFilterStatus('DISMISSED')}
                className={`px-4 py-1.5 font-medium rounded-md text-sm transition-colors ${filterStatus === 'DISMISSED' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                {t.admin.complaintsPage.filterDismissed}
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className={`space-y-4 min-h-[500px] transition-opacity duration-200 ${loading && reports.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
          {loading && reports.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
              <div className="flex justify-center mb-2"><div className="w-6 h-6 border-2 border-booking-teal border-t-transparent rounded-full animate-spin"></div></div>
              {t.admin.complaintsPage.loadingData}
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
              <div className="flex justify-center mb-3"><AlertTriangle size={32} className="text-slate-300" /></div>
              {t.admin.complaintsPage.noReportsFound}
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.reportId} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row transition-all hover:shadow-md">

                {/* Left side: Image & Main Info */}
                <div className="p-6 flex-1 flex flex-col md:flex-row gap-6 border-b md:border-b-0 md:border-r border-slate-100">
                  <div className="w-full md:w-40 h-32 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative group cursor-pointer">
                    {report.evidenceImageUrl ? (
                      <>
                        <img src={report.evidenceImageUrl} alt="Bằng chứng" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-xs font-semibold">{t.admin.complaintsPage.viewImage}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-slate-400 flex flex-col items-center">
                        <AlertTriangle size={24} className="mb-1" />
                        <span className="text-xs">{t.admin.complaintsPage.noImage}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-bold text-slate-900">{report.reason}</h3>
                        <StatusBadge status={getStatusText(report.resolutionStatus)} />
                      </div>

                      {report.room && (
                        <div
                          className="flex items-center gap-3 mt-3 mb-2 p-2 bg-slate-50 border border-slate-100 rounded-lg w-fit cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => setSelectedRoomId(report.room.roomId)}
                        >
                          <div className="w-10 h-10 bg-slate-200 rounded flex-shrink-0 overflow-hidden border border-slate-200">
                            <img
                              src={getRoomFallbackImage(report.room.roomId || 'rp', report.room.coverImageUrl)}
                              alt="Room"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-booking-primary hover:text-booking-primary-dark line-clamp-1">{report.room.title}</p>
                            <p className="text-xs text-slate-500 line-clamp-1">{report.room.address}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-6 mt-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                            {report.reporter?.fullName?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span className="text-sm text-slate-500">{t.admin.complaintsPage.byReporter}<span className="font-medium text-slate-700">{report.reporter?.fullName || 'N/A'}</span></span>
                        </div>
                        {report.reportedLandlord && (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-[10px]">
                              {report.reportedLandlord?.fullName?.charAt(0).toUpperCase() || 'H'}
                            </div>
                            <span className="text-sm text-slate-500">{t.admin.complaintsPage.reportedHost}<span className="font-medium text-slate-700">{report.reportedLandlord?.fullName || 'N/A'}</span></span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-slate-400 flex items-center gap-2">
                      <span>{t.admin.complaintsPage.reportCodePrefix.replace('{{code}}', report.reportId.substring(0, 8))}</span>
                      <span>•</span>
                      <span>{t.admin.complaintsPage.sentAtPrefix.replace('{{time}}', new Date(report.createdAt).toLocaleString('vi-VN'))}</span>
                    </div>
                  </div>
                </div>

                {/* Right side: Actions */}
                <div className="p-6 w-full md:w-72 bg-slate-50 flex flex-col justify-center gap-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{t.admin.complaintsPage.actionHandling}</p>

                  {['RESOLVED', 'DISMISSED'].includes(report.resolutionStatus) && (report.adminResponseTenant || report.adminResponseLandlord) && (
                    <div className="space-y-2 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                      {report.adminResponseTenant && (
                        <div>
                          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                            {t.admin.complaintsPage.tenantFeedbackLabel} (Đã gửi)
                          </span>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{report.adminResponseTenant}</p>
                        </div>
                      )}
                      {report.adminResponseLandlord && (
                        <div className={report.adminResponseTenant ? "mt-2 pt-2 border-t border-slate-100" : ""}>
                          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                            {t.admin.complaintsPage.hostFeedbackLabel} (Đã gửi)
                          </span>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{report.adminResponseLandlord}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {['PENDING', 'PROCESSING'].includes(report.resolutionStatus) && (
                    <div className="space-y-2 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          {t.admin.complaintsPage.tenantFeedbackLabel}
                        </label>
                        <textarea
                          value={adminResponsesTenant[report.reportId] ?? report.adminResponseTenant ?? ''}
                          onChange={(e) => setAdminResponsesTenant(prev => ({ ...prev, [report.reportId]: e.target.value }))}
                          placeholder={t.admin.complaintsPage.tenantFeedbackPlaceholder}
                          rows={1}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-booking-primary/20 focus:border-booking-primary transition-all text-xs resize-none h-11"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          {t.admin.complaintsPage.hostFeedbackLabel}
                        </label>
                        <textarea
                          value={adminResponsesLandlord[report.reportId] ?? report.adminResponseLandlord ?? ''}
                          onChange={(e) => setAdminResponsesLandlord(prev => ({ ...prev, [report.reportId]: e.target.value }))}
                          placeholder={t.admin.complaintsPage.hostFeedbackPlaceholder}
                          rows={1}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-booking-primary/20 focus:border-booking-primary transition-all text-xs resize-none h-11"
                        />
                      </div>
                    </div>
                  )}

                  {report.resolutionStatus === 'PENDING' && (
                    <button
                      onClick={() => handleUpdateStatus(report.reportId, 'PROCESSING')}
                      disabled={actionLoading === report.reportId}
                      className="w-full flex items-center justify-between px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium disabled:opacity-70"
                    >
                      <span>{t.admin.complaintsPage.btnProcess}</span>
                      <ChevronRight size={16} />
                    </button>
                  )}

                  {['PENDING', 'PROCESSING'].includes(report.resolutionStatus) && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(report.reportId, 'RESOLVED')}
                        disabled={actionLoading === report.reportId}
                        className="w-full flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition-colors text-sm font-medium disabled:opacity-70"
                      >
                        <ShieldCheck size={16} />
                        <span>{t.admin.complaintsPage.btnResolve}</span>
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(report.reportId, 'DISMISSED')}
                        disabled={actionLoading === report.reportId}
                        className="w-full flex items-center gap-2 px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 rounded-xl transition-colors text-sm font-medium disabled:opacity-70"
                      >
                        <XCircle size={16} />
                        <span>{t.admin.complaintsPage.btnDismiss}</span>
                      </button>
                    </>
                  )}

                  {['RESOLVED', 'DISMISSED'].includes(report.resolutionStatus) && (
                    <div className="text-center py-2 text-sm text-slate-500">
                      {t.admin.complaintsPage.reportClosed}
                    </div>
                  )}
                </div>

              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {!loading && reports.length > 0 && (
          <div className="mt-6 px-6 py-4 border border-slate-200 rounded-2xl bg-white flex items-center justify-between text-sm">
            <span className="text-slate-500">{t.admin.complaintsPage.showingCount.replace('{{count}}', reports.length.toString()).replace('{{total}}', pagination.total.toString())}</span>
            <div className="flex gap-1 items-center">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 border border-slate-200 rounded bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {t.admin.complaintsPage.prevPage}
              </button>
              <span className="px-2 font-medium text-slate-900">
                {t.admin.complaintsPage.pageText.replace('{{page}}', page.toString()).replace('{{totalPages}}', pagination.totalPages.toString())}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                className="px-3 py-1 border border-slate-200 rounded bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {t.admin.complaintsPage.nextPage}
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Room Detail Modal for viewing room info without approve/reject actions */}
      {selectedRoomId && (
        <RoomDetailModal
          roomId={selectedRoomId}
          isOpen={!!selectedRoomId}
          onClose={() => setSelectedRoomId(null)}
          onApprove={() => { }}
          onReject={() => { }}
          actionLoading={null}
          isPending={false}
        />
      )}
    </div>
  );
}

