import React from 'react';

type StatusType = 
  | 'Hoạt động' 
  | 'Bị khóa' 
  | 'Chờ xác thực' 
  | 'Thành công' 
  | 'Đang xử lý' 
  | 'Mở' 
  | 'Đã giải quyết' 
  | 'Chờ duyệt';

interface StatusBadgeProps {
  status: StatusType | string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  let colorClasses = 'bg-slate-100 text-slate-700';
  let dotColor = 'bg-slate-400';

  if (['Hoạt động', 'Thành công', 'Đã giải quyết'].includes(status)) {
    colorClasses = 'bg-emerald-100 text-emerald-700';
    dotColor = 'bg-emerald-500';
  } else if (['Bị khóa', 'Từ chối'].includes(status)) {
    colorClasses = 'bg-red-100 text-red-700';
    dotColor = 'bg-red-500';
  } else if (['Chờ xác thực', 'Đang xử lý', 'Mở', 'Chờ duyệt', 'Đang chờ'].includes(status)) {
    colorClasses = 'bg-orange-100 text-orange-700';
    dotColor = 'bg-orange-500';
  } else if (status === 'Đã đóng') {
    colorClasses = 'bg-slate-200 text-slate-600';
    dotColor = 'bg-slate-400';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colorClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
      {status}
    </span>
  );
}
