'use client';

// =============================================================
// frontend/components/tenant/TenantDashboard.tsx
// Dashboard dành riêng cho Tenant (Người thuê phòng / Khách hàng).
// Sẽ được dùng làm giao diện chính cho phân vùng /tenant.
// =============================================================

import React from 'react';
import Link from 'next/link';

export default function TenantDashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Tiêu đề & Chào hỏi */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#172B4D]">Bảng điều khiển của Người thuê</h1>
        <p className="text-[#6B778C] text-sm mt-1">Chào mừng bạn trở lại! Quản lý thông tin đặt phòng và tìm kiếm phòng của bạn.</p>
      </div>

      {/* Grid thống kê nhanh */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#EEF4FF] text-[#0052CC] flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-[#6B778C] font-semibold">Phòng đang thuê</p>
            <p className="text-xl font-bold text-[#172B4D] mt-0.5">Chưa có</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#E3FCEF] text-[#006644] flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-[#6B778C] font-semibold">Lịch sử đặt phòng</p>
            <p className="text-xl font-bold text-[#172B4D] mt-0.5">0 lịch sử</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FFF0B3] text-[#855A00] flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-[#6B778C] font-semibold">Ví tích điểm</p>
            <p className="text-xl font-bold text-[#172B4D] mt-0.5">0đ</p>
          </div>
        </div>
      </div>

      {/* Vùng Content chính */}
      <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[#172B4D] mb-4">Hoạt động gần đây</h3>
        <div className="text-center py-12 text-[#6B778C]">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v4h16z" />
          </svg>
          <p className="text-sm">Bạn chưa có hoạt động đặt phòng hoặc giao dịch nào.</p>
          <Link href="/" className="inline-block mt-4 bg-[#0052CC] hover:bg-[#0043A8] text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors">
            Khám phá phòng ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
