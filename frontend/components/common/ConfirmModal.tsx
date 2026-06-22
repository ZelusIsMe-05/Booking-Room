'use client';

import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận hủy giao dịch',
  message = 'Bạn có chắc chắn muốn hủy giao dịch đặt cọc này? Hành động này không thể hoàn tác.',
  confirmText = 'Xác nhận hủy',
  cancelText = 'Hủy bỏ',
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Warning Icon */}
        <div className="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 text-2xl font-bold">
          ⚠️
        </div>

        {/* Text */}
        <div className="space-y-1">
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-sm disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition text-sm flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Đang xử lý...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
