import React from 'react';
import { Bell, Settings, User } from 'lucide-react';

interface AdminHeaderProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export default function AdminHeader({ title, description, action }: AdminHeaderProps) {
  return (
    <div className="flex items-center justify-between px-8 py-6">
      {/* Left side: Title and Description */}
      <div>
        {title && <h1 className="text-2xl font-bold text-slate-900 mb-1">{title}</h1>}
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>

      {/* Right side: Actions and Profile */}
      <div className="flex items-center gap-4">
        {action && <div>{action}</div>}
        
        <div className="flex items-center gap-3 border-l border-slate-200 pl-4 ml-2">
          <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-50"></span>
          </button>
          <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <Settings size={20} />
          </button>
          <button className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden">
            <User size={18} className="text-slate-500" />
            {/* If we have user avatar, we can put img here */}
          </button>
        </div>
      </div>
    </div>
  );
}
