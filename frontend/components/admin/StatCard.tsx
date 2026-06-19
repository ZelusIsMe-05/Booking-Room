import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon?: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  loading?: boolean;
}

export default function StatCard({
  title,
  value,
  trend,
  icon: Icon,
  iconBgColor = 'bg-blue-100',
  iconColor = 'text-blue-600',
  loading = false,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between h-full">
      <div className="flex justify-between items-start mb-4">
        {Icon && (
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconBgColor}`}>
            <Icon size={24} className={iconColor} />
          </div>
        )}
        
        {trend && (
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              trend.isPositive
                ? 'bg-emerald-100 text-emerald-700'
                : trend.value === 'Chờ xử lý' 
                  ? 'bg-slate-200 text-slate-700'
                  : 'bg-orange-100 text-orange-700'
            }`}
          >
            {trend.value}
          </div>
        )}
      </div>
      
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        {loading ? (
          <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"></div>
        ) : (
          <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
        )}
      </div>
    </div>
  );
}
