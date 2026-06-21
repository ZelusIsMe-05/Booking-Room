import React from 'react';


interface AdminHeaderProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export default function AdminHeader({ title, description, action }: AdminHeaderProps) {
  return (
    <div className="h-[90px] sticky top-0 z-40 flex items-center justify-between px-8 bg-gradient-to-r from-white/90 via-booking-teal/5 to-white/90 backdrop-blur-xl border-b border-booking-teal/10 shadow-[0_10px_40px_-10px_rgba(13,148,136,0.15)] relative">
      {/* Left side: Title and Description */}
      <div className="relative z-10">
        {title && <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-booking-primary to-booking-teal bg-clip-text text-transparent mb-1 drop-shadow-sm tracking-tight">{title}</h1>}
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>

      {/* Right side: Actions */}
      {action && (
        <div className="flex items-center gap-4">
          <div>{action}</div>
        </div>
      )}
    </div>
  );
}
