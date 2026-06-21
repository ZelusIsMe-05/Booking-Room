import React, { useState } from 'react';

interface AvatarProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackText?: string;
}

export default function Avatar({ src, alt, className = 'w-10 h-10', fallbackText }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const letter = (fallbackText || alt || '?').charAt(0).toUpperCase();

  return (
    <div className={`relative rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center flex-shrink-0 overflow-hidden ${className}`}>
      <span className="font-semibold text-slate-500 absolute z-0">{letter}</span>
      {src && !imgError && (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover absolute z-10 bg-slate-200"
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}
