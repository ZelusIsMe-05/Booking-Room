'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPromptModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleShow = (e: Event) => {
      const customEvent = e as CustomEvent<{ redirectUrl?: string }>;
      const url = customEvent.detail?.redirectUrl || window.location.href;
      setRedirectUrl(url);
      setIsOpen(true);
    };

    window.addEventListener('show-login-prompt', handleShow);
    return () => {
      window.removeEventListener('show-login-prompt', handleShow);
    };
  }, []);

  if (!isOpen) return null;

  const handleLogin = () => {
    setIsOpen(false);
    const loginUrl = `/auth/login?redirect=${encodeURIComponent(redirectUrl)}`;
    router.push(loginUrl);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        {/* Lock Icon */}
        <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-[#004ac6] text-xl font-bold">
          🔒
        </div>

        {/* Text */}
        <div className="space-y-1.5 text-center">
          <h3 className="font-bold text-lg text-slate-800">Yêu cầu đăng nhập</h3>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Bạn cần đăng nhập để thực hiện chức năng này. Bạn có muốn đi tới trang đăng nhập ngay không?
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => setIsOpen(false)}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-sm active:scale-[0.98]"
          >
            Hủy
          </button>
          <button
            onClick={handleLogin}
            className="flex-1 py-2.5 px-4 bg-[#004ac6] hover:bg-[#003f9e] text-white font-bold rounded-xl transition text-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
          >
            Đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}
