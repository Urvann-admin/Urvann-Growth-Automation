'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export function CustomSelect<T extends string>({
  value,
  options,
  onChange,
  placeholder,
  className = '',
  hasError,
  size = 'md',
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  size?: 'sm' | 'md';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);
  const triggerBorder = hasError
    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
    : 'border-slate-200 hover:border-slate-300 focus:ring-pink-500/20 focus:border-pink-500';
  const isSm = size === 'sm';
  const triggerHeight = isSm ? 'h-9' : 'h-10';
  const triggerPadding = isSm ? 'px-2.5 py-1.5' : 'px-3 py-2';
  const textSize = isSm ? 'text-xs' : 'text-sm';
  const optionPadding = isSm ? 'px-2.5 py-1.5' : 'px-3 py-2';

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${triggerHeight} w-full rounded-lg border bg-white ${triggerPadding} text-left ${textSize} text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 focus:border ${triggerBorder} flex items-center justify-between gap-2`}
      >
        <span className={selected ? '' : 'text-slate-400'}>
          {selected ? selected.label : placeholder || 'Select...'}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[140px] rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full ${optionPadding} text-left ${textSize} transition-all first:rounded-t-md last:rounded-b-md ${
                opt.value === value
                  ? 'bg-[#E6007A] text-white'
                  : 'text-slate-700 hover:bg-pink-50 hover:text-pink-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
