'use client';

import React, { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import StatCard from '@/components/admin/StatCard';
import StatusBadge from '@/components/admin/StatusBadge';
import Link from 'next/link';
import { adminService, DashboardOverview } from '@/services/adminService';
import { BedDouble, Users, FileText, AlertTriangle, Check, X, MoreHorizontal } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { getRoomFallbackImage } from '@/utils/imageFallback';

export default function AdminDashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [pendingRooms, setPendingRooms] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        const [overviewData, roomsRes, txnRes, reportsRes, usersRes] = await Promise.all([
          adminService.getDashboardOverview(),
          adminService.getPendingRooms({ limit: 3 }),
          adminService.getTransactions({ limit: 4 }),
          adminService.getViolationReports({ limit: 3, status: 'PENDING' }),
          adminService.getUsers({ limit: 5 }),
        ]);
        
        setOverview(overviewData);
        setPendingRooms(roomsRes.items);
        setRecentTransactions(txnRes.items);
        setRecentReports(reportsRes.items);
        setRecentUsers(usersRes.items);
        
        setError(null);
      } catch (err: any) {
        console.error('Failed to load dashboard overview:', err);
        setError(err.message || 'Lỗi khi tải dữ liệu tổng quan');
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <AdminHeader 
        title="Tổng quan hệ thống" 
        description="Theo dõi các chỉ số quan trọng và hoạt động gần đây."
      />

      <div className="flex-1 p-8 overflow-y-auto">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Bài đăng chờ duyệt"
            value={overview?.rooms.pendingApproval ?? 0}
            trend={{ value: '+12%', isPositive: true }}
            icon={BedDouble}
            iconBgColor="bg-orange-100"
            iconColor="text-orange-600"
            loading={loading}
          />
          <StatCard
            title="Người dùng mới (tuần)"
            value={overview?.users.total ?? 0}
            trend={{ value: '+5%', isPositive: true }}
            icon={Users}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
            loading={loading}
          />
          <StatCard
            title="Giao dịch trong ngày"
            value={overview?.transactions.today ?? 0}
            trend={{ value: '-2%', isPositive: false }}
            icon={FileText}
            iconBgColor="bg-emerald-100"
            iconColor="text-emerald-600"
            loading={loading}
          />
          <StatCard
            title="Khiếu nại mới"
            value={overview?.support.totalViolationReports ?? 0}
            trend={{ value: 'Chờ xử lý', isPositive: false }}
            icon={AlertTriangle}
            iconBgColor="bg-red-100"
            iconColor="text-red-600"
            loading={loading}
          />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Pending Listings */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-900 text-lg">Bài đăng chờ duyệt</h3>
                <Link href="/admin/listings" className="text-sm font-semibold text-blue-600 hover:text-blue-700">Xem tất cả</Link>
              </div>
              <div className="p-0">
                {pendingRooms.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">Không có bài đăng nào đang chờ duyệt.</div>
                ) : (
                  pendingRooms.map((room, idx) => (
                    <div key={room.roomId} className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${idx !== 0 ? 'border-t border-slate-100' : ''}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                          <img 
                            src={getRoomFallbackImage(room.roomId || 'rm', room.coverImageUrl)} 
                            alt={room.title} 
                            className="w-full h-full object-cover text-[8px] text-slate-400" 
                            onError={(e) => {
                              e.currentTarget.src = getRoomFallbackImage(room.roomId, null);
                            }}
                          />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 line-clamp-1">{room.title}</h4>
                          <p className="text-sm text-slate-500 mt-1">Host: {room.host?.fullName || 'N/A'} • {new Date(room.createdAt).toLocaleDateString('vi-VN')}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-900 text-lg">Giao dịch gần đây</h3>
                <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={20} /></button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 bg-slate-50/50">
                      <th className="px-6 py-3 font-semibold">Mã GD</th>
                      <th className="px-6 py-3 font-semibold">Người dùng</th>
                      <th className="px-6 py-3 font-semibold">Số tiền</th>
                      <th className="px-6 py-3 font-semibold">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {recentTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-slate-500">Không có giao dịch nào gần đây.</td>
                      </tr>
                    ) : (
                      recentTransactions.map((txn) => (
                        <tr key={txn.transaction_id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">#{txn.transaction_id.substring(0, 8)}</td>
                          <td className="px-6 py-4 text-slate-600">{txn.tenant_name || 'N/A'}</td>
                          <td className="px-6 py-4 text-slate-900 font-medium">{formatCurrency(txn.amount)}</td>
                          <td className="px-6 py-4"><StatusBadge status={txn.status === 'SUCCESS' ? 'Thành công' : txn.status === 'PENDING' ? 'Đang xử lý' : 'Từ chối'} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right Column (1/3 width) */}
          <div className="space-y-6">
            
            {/* Complaints */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <h3 className="font-bold text-slate-900 text-lg">Khiếu nại cần xử lý</h3>
              </div>
              <div className="p-4 space-y-4">
                {recentReports.length === 0 ? (
                  <div className="text-center text-slate-500 text-sm">Không có khiếu nại nào cần xử lý.</div>
                ) : (
                  recentReports.map((report) => (
                    <div key={report.reportId} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">Mức độ: Cao</span>
                        <span className="text-xs text-slate-400">{new Date(report.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <h4 className="font-semibold text-slate-900 mb-1 line-clamp-1">{report.reason}</h4>
                      <p className="text-sm text-slate-600 line-clamp-2">Người báo cáo: {report.reporter?.fullName || 'N/A'}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-slate-200 bg-slate-50/50">
                <Link href="/admin/complaints" className="block w-full text-center text-sm font-semibold text-slate-700 hover:text-slate-900">
                  Xem danh sách khiếu nại
                </Link>
              </div>
            </div>

            {/* Quick User Search */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <h3 className="font-bold text-slate-900 text-lg">Quản lý tài khoản</h3>
              </div>
              <div className="p-6">
                <div className="relative mb-6">
                  <input 
                    type="text" 
                    placeholder="Tìm email, số điện thoại..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-booking-primary/20 focus:border-booking-primary transition-all text-sm"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  </div>
                </div>

                <div className="space-y-4">
                  {recentUsers.length === 0 ? (
                    <div className="text-center text-slate-500 text-sm">Không có dữ liệu.</div>
                  ) : (
                    recentUsers.map((user) => (
                      <div key={user.userId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${user.role === 'ADMIN' ? 'bg-purple-600' : user.role === 'HOST' ? 'bg-blue-600' : 'bg-emerald-400'} text-white flex items-center justify-center text-xs font-bold`}>
                            {user.fullName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{user.email}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
