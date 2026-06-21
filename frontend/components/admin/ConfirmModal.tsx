import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  onConfirm,
  onCancel,
  isLoading = false,
  type = 'warning'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getColors = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-red-100',
          iconText: 'text-red-600',
          btnConfirm: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
        };
      case 'info':
        return {
          iconBg: 'bg-blue-100',
          iconText: 'text-blue-600',
          btnConfirm: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
        };
      case 'warning':
      default:
        return {
          iconBg: 'bg-emerald-100', // Used emerald for positive confirmation like "Approve"
          iconText: 'text-emerald-600',
          btnConfirm: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
        };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center ${colors.iconBg} ${colors.iconText}`}>
              <AlertTriangle size={24} />
            </div>
            <div className="flex-1 mt-1">
              <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2 ${colors.btnConfirm}`}
          >
            {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
