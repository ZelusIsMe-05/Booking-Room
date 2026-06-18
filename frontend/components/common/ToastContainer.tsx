'use client';

import { useState, useEffect } from 'react';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleShowToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: 'success' | 'error' | 'info'; duration?: number }>;
      if (!customEvent.detail) return;

      const { message, type, duration = 5000 } = customEvent.detail;
      const id = Math.random().toString(36).substring(2, 9);
      
      setToasts((prev) => [...prev, { id, message, type, duration }]);
    };

    window.addEventListener('show-toast', handleShowToast);
    return () => {
      window.removeEventListener('show-toast', handleShowToast);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  const [width, setWidth] = useState(100);

  useEffect(() => {
    const duration = toast.duration || 5000;
    const intervalTime = 50; // Update progress bar every 50ms
    const startTime = Date.now();
    
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPercent = Math.max(0, 100 - (elapsed / duration) * 100);
      
      if (remainingPercent <= 0) {
        clearInterval(timer);
        onRemove(toast.id);
      } else {
        setWidth(remainingPercent);
      }
    }, intervalTime);

    return () => {
      clearInterval(timer);
    };
  }, [toast, onRemove]);

  const typeStyles = {
    success: {
      bg: 'bg-white/95 border-emerald-100 text-slate-800 shadow-emerald-100/30',
      iconBg: 'bg-emerald-50 text-emerald-600',
      barBg: 'bg-emerald-500',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    error: {
      bg: 'bg-white/95 border-rose-100 text-slate-800 shadow-rose-100/30',
      iconBg: 'bg-rose-50 text-rose-600',
      barBg: 'bg-rose-500',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    info: {
      bg: 'bg-white/95 border-blue-100 text-slate-800 shadow-blue-100/30',
      iconBg: 'bg-blue-50 text-blue-600',
      barBg: 'bg-blue-500',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const style = typeStyles[toast.type];

  return (
    <div
      onClick={() => onRemove(toast.id)}
      className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border bg-white shadow-xl pointer-events-auto cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-95 animate-in slide-in-from-bottom-5 fade-in duration-200 ${style.bg}`}
    >
      {/* Icon */}
      <div className={`p-1.5 rounded-xl flex items-center justify-center shrink-0 ${style.iconBg}`}>
        {style.icon}
      </div>

      {/* Message */}
      <p className="text-sm font-bold leading-tight select-none pr-4">{toast.message}</p>

      {/* Close button indicator */}
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-sm select-none">
        ×
      </span>

      {/* Progress Bar */}
      <div
        className={`absolute bottom-0 left-0 h-1 rounded-b-2xl transition-all ease-linear ${style.barBg}`}
        style={{ width: `${width}%`, transitionDuration: '50ms' }}
      />
    </div>
  );
}
