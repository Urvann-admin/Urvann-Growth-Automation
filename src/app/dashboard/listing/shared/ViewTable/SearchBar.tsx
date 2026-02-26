'use client';

import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder?: string;
  totalCount?: number;
  entityName?: string;
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search...',
  totalCount,
  entityName = 'items',
}: SearchBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {totalCount !== undefined && (
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <span className="text-sm font-medium text-slate-700">{entityName}</span>
          <span className="inline-flex items-center justify-center min-w-[1.75rem] h-6 rounded-lg bg-pink-50 text-xs font-medium text-[#E6007A]">
            {totalCount}
          </span>
        </div>
      )}
      <form onSubmit={onSubmit} className="relative flex-1 min-w-[200px] flex gap-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-shadow"
        />
        <button
          type="submit"
          className="rounded-xl px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#E6007A' }}
        >
          Search
        </button>
      </form>
    </div>
  );
}
