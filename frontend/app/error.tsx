'use client';

// File này bắt buộc phải là Client Component theo yêu cầu của Next.js App Router
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfdfd] text-[#172B4D]">
      <h2 className="text-2xl font-bold mb-4">Có lỗi xảy ra!</h2>
      <p className="text-[#6B778C] mb-6">{error.message || 'Vui lòng thử lại.'}</p>
      <button
        onClick={reset}
        className="bg-[#0052CC] hover:bg-[#0043A8] text-white px-6 py-2.5 rounded-md font-semibold transition-colors"
      >
        Thử lại
      </button>
    </div>
  );
}
