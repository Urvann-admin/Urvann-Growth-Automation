import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

export default function StatCard({ 
  label, 
  value, 
  subValue,
  icon: Icon, 
  iconBg, 
  iconColor 
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm h-full w-full">
      <div className="flex items-start justify-between h-full">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-800 tracking-tight">
            {value}
            {subValue && <span className="text-lg font-normal text-slate-400">{subValue}</span>}
          </p>
        </div>
        <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

