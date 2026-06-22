'use client';

import React, { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import StatusBadge from '@/components/admin/StatusBadge';
import { adminService } from '@/services/adminService';
import { Search, Filter, AlertCircle, MessageSquare, Tag, Clock, ChevronDown, MessageCircle, Send } from 'lucide-react';

const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
  }
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [adminResponses, setAdminResponses] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setTickets([]);
      await new Promise(resolve => setTimeout(resolve, 300));
      const res = await adminService.getSupportTickets({ 
        page,
        limit,
        search: debouncedSearch,
        status: filterStatus === 'ALL' ? undefined : filterStatus,
        category: filterCategory === 'ALL' ? undefined : filterCategory
      });
      setTickets(res.items);
      setPagination({ total: res.pagination?.total || 0, totalPages: res.pagination?.totalPages || Math.ceil((res.pagination?.total || 0)/limit) || 1 });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải danh sách yêu cầu hỗ trợ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filterStatus, filterCategory, page, limit, debouncedSearch]);

  const handleUpdateStatus = async (ticketId: string, status: string) => {
    try {
      setActionLoading(ticketId);
      const response = adminResponses[ticketId] || '';
      await adminService.updateSupportTicketStatus(ticketId, status, response || undefined);
      showToast('Cập nhật trạng thái thành công', 'success');
      setAdminResponses(prev => { const copy = {...prev}; delete copy[ticketId]; return copy; });
      fetchTickets();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi cập nhật trạng thái', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'OPEN': return 'Chờ xử lý';
      case 'IN_PROGRESS': return 'Đang xử lý';
      case 'CLOSED': return 'Đã giải quyết';
      default: return status;
    }
  };

  const getCategoryText = (category: string) => {
    switch(category) {
      case 'APP_FAULT': return 'Lỗi hệ thống';
      case 'ACCOUNT': return 'Tài khoản';
      case 'PAYMENT': return 'Thanh toán';
      case 'OTHER': return 'Khác';
      default: return category;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <AdminHeader 
        title="Hỗ trợ người dùng" 
        description="Giải quyết các vấn đề kỹ thuật và thắc mắc từ người dùng."
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
              placeholder="Tiêu đề, email..." 
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-booking-primary/20 focus:border-booking-primary transition-all text-sm shadow-sm"
            />
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            {loading && tickets.length > 0 && (
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
                Tất cả
              </button>
              <button 
                onClick={() => setFilterStatus('OPEN')}
                className={`px-4 py-1.5 font-medium rounded-md text-sm transition-colors ${filterStatus === 'OPEN' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Chờ xử lý
              </button>
              <button 
                onClick={() => setFilterStatus('IN_PROGRESS')}
                className={`px-4 py-1.5 font-medium rounded-md text-sm transition-colors ${filterStatus === 'IN_PROGRESS' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Đang xử lý
              </button>
            </div>
            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="appearance-none flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-booking-primary/20 focus:border-booking-primary"
              >
                <option value="ALL">Tất cả danh mục</option>
                <option value="APP_FAULT">Lỗi hệ thống</option>
                <option value="ACCOUNT">Tài khoản</option>
                <option value="PAYMENT">Thanh toán</option>
                <option value="OTHER">Khác</option>
              </select>
              <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* List */}
        <div className={`space-y-4 min-h-[500px] transition-opacity duration-200 ${loading && tickets.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
          {loading && tickets.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
              <div className="flex justify-center mb-2"><div className="w-6 h-6 border-2 border-booking-teal border-t-transparent rounded-full animate-spin"></div></div>
              Đang tải dữ liệu...
            </div>
          ) : !loading && tickets.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
              <div className="flex justify-center mb-3"><MessageCircle size={32} className="text-slate-300" /></div>
              Không tìm thấy yêu cầu nào.
            </div>
          ) : (
            tickets.map((ticket) => {
              const isExpanded = expandedId === ticket.ticketId;
              
              return (
                <div key={ticket.ticketId} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md">
                  
                  {/* Header summary (Always visible) */}
                  <div 
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : ticket.ticketId)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-2 h-12 rounded-full ${ticket.status === 'OPEN' ? 'bg-orange-400' : ticket.status === 'IN_PROGRESS' ? 'bg-blue-400' : 'bg-slate-300'}`}></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-slate-900 text-base">{ticket.title}</h3>
                          <StatusBadge status={getStatusText(ticket.status)} />
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                            <Tag size={12} />
                            {getCategoryText(ticket.category)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                              {ticket.user?.fullName?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            {ticket.user?.fullName || 'N/A'} ({ticket.user?.role || 'Khách'})
                          </span>
                          <span className="flex items-center gap-1"><Clock size={14} /> {new Date(ticket.createdAt).toLocaleString('vi-VN')}</span>
                          <span>Mã yêu cầu: #{ticket.ticketId.substring(0, 8)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-slate-400 pl-4">
                      <ChevronDown size={20} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 p-6 bg-slate-50/50 flex flex-col md:flex-row gap-8">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-slate-900 mb-2">Mô tả chi tiết vấn đề:</h4>
                        <div className="bg-white border border-slate-200 p-4 rounded-xl text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                          {ticket.detailedDescription || 'Không có mô tả chi tiết.'}
                        </div>
                        
                        {ticket.evidenceImageUrl && (
                          <div className="mt-4">
                            <h4 className="text-sm font-semibold text-slate-900 mb-2">Hình ảnh đính kèm:</h4>
                            <div className="w-48 h-32 rounded-lg border border-slate-200 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                              <img src={ticket.evidenceImageUrl} alt="Đính kèm" className="w-full h-full object-cover" />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="w-full md:w-64 bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-fit">
                        <h4 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Cập nhật trạng thái</h4>

                        {ticket.status !== 'CLOSED' && (
                          <div className="mb-4">
                            <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                              <Send size={12} />
                              Phản hồi của Admin (tùy chọn)
                            </label>
                            <textarea
                              value={adminResponses[ticket.ticketId] || ''}
                              onChange={(e) => setAdminResponses(prev => ({...prev, [ticket.ticketId]: e.target.value}))}
                              placeholder="Nhập phản hồi gửi đến người dùng..."
                              rows={2}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-booking-primary/20 focus:border-booking-primary transition-all text-sm resize-none mt-1"
                            />
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(ticket.ticketId, 'OPEN'); }}
                            disabled={actionLoading === ticket.ticketId || ticket.status === 'OPEN'}
                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ticket.status === 'OPEN' ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'hover:bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200'}`}
                          >
                            <div className="flex justify-between items-center">
                              <span>Chờ xử lý</span>
                              {ticket.status === 'OPEN' && <span className="w-2 h-2 rounded-full bg-orange-500"></span>}
                            </div>
                          </button>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(ticket.ticketId, 'IN_PROGRESS'); }}
                            disabled={actionLoading === ticket.ticketId || ticket.status === 'IN_PROGRESS'}
                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ticket.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'hover:bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200'}`}
                          >
                            <div className="flex justify-between items-center">
                              <span>Đang xử lý</span>
                              {ticket.status === 'IN_PROGRESS' && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                            </div>
                          </button>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(ticket.ticketId, 'CLOSED'); }}
                            disabled={actionLoading === ticket.ticketId || ticket.status === 'CLOSED'}
                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ticket.status === 'CLOSED' ? 'bg-slate-100 text-slate-700 border border-slate-300' : 'hover:bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200'}`}
                          >
                            <div className="flex justify-between items-center">
                              <span>Đã giải quyết</span>
                              {ticket.status === 'CLOSED' && <span className="w-2 h-2 rounded-full bg-slate-500"></span>}
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {!loading && tickets.length > 0 && (
          <div className="mt-6 px-6 py-4 border border-slate-200 rounded-2xl bg-white flex items-center justify-between text-sm">
            <span className="text-slate-500">Hiển thị {tickets.length} trên tổng <span className="font-medium text-slate-900">{pagination.total}</span> yêu cầu</span>
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
  );
}
