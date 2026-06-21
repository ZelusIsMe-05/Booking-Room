import React, { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function PromptModal({
  isOpen,
  title,
  message,
  placeholder = 'Nhập nội dung...',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  onConfirm,
  onCancel,
  isLoading = false,
}: PromptModalProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setValue('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!value.trim()) {
      setError('Vui lòng không để trống ô này.');
      return;
    }
    onConfirm(value);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center bg-red-100 text-red-600">
              <AlertCircle size={24} />
            </div>
            <div className="flex-1 mt-1">
              <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
            </div>
          </div>
          <div className="mt-2">
            <textarea
              autoFocus
              rows={3}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (e.target.value.trim()) setError('');
              }}
              placeholder={placeholder}
              className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 transition-all text-sm resize-none ${
                error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-red-500 focus:ring-red-500/20'
              }`}
            />
            {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
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
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2 bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
