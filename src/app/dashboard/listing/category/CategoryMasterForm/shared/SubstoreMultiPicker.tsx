'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

/** If provided, options are hubs and value is substores[]; toggling a hub adds/removes that hub's substores. Renders as dropdown (not modal) with search and Select all / Deselect all. */
export function SubstoreMultiPicker({
  value,
  options,
  onChange,
  hasError,
  optionToSubstores,
}: {
  value: string[];
  options: { value: string; label: string }[];
  onChange: (value: string[]) => void;
  hasError?: boolean;
  optionToSubstores?: (optionValue: string) => string[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const isHubMode = Boolean(optionToSubstores);

  const valueNorm = useMemo(() => new Set(value.map((s) => s.toLowerCase().trim()).filter(Boolean)), [value]);

  const selectedHubCount = useMemo(() => {
    if (!isHubMode || !optionToSubstores) return value.length;
    return options.filter(
      (opt) =>
        optionToSubstores(opt.value).length > 0 &&
        optionToSubstores(opt.value).every((s) => valueNorm.has(s.toLowerCase()))
    ).length;
  }, [isHubMode, optionToSubstores, options, valueNorm, value.length]);

  const displayCount = isHubMode ? selectedHubCount : value.length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, search]);

  const triggerBorder = hasError
    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
    : 'border-slate-200 hover:border-slate-300 focus:ring-pink-500/20 focus:border-pink-500';

  const handleToggle = (optValue: string) => {
    if (isHubMode && optionToSubstores) {
      const subs = optionToSubstores(optValue).map((s) => s.toLowerCase());
      const currentSet = new Set(value.map((s) => s.toLowerCase()));
      const allSelected = subs.length > 0 && subs.every((s) => currentSet.has(s));
      const removeSet = new Set(subs);
      const newSubstores = allSelected
        ? value.filter((s) => !removeSet.has(s.toLowerCase()))
        : [...new Set([...value.map((s) => s.toLowerCase()), ...subs])];
      onChange(newSubstores);
    } else {
      const current = new Set(value.filter(Boolean));
      if (current.has(optValue)) current.delete(optValue);
      else current.add(optValue);
      onChange(Array.from(current));
    }
  };

  const handleSelectAll = () => {
    if (isHubMode && optionToSubstores) {
      const all = options.flatMap((o) => optionToSubstores(o.value).map((s) => s.toLowerCase()));
      onChange([...new Set(all)]);
    } else {
      const combined = new Set([...value, ...filtered.map((o) => o.value)]);
      onChange(Array.from(combined));
    }
  };

  const handleDeselectAll = () => {
    if (isHubMode && optionToSubstores) {
      const toRemove = new Set(options.flatMap((o) => optionToSubstores(o.value).map((s) => s.toLowerCase())));
      onChange(value.filter((s) => !toRemove.has(s.toLowerCase())));
    } else {
      const toRemove = new Set(filtered.map((o) => o.value));
      onChange(value.filter((s) => !toRemove.has(s)));
    }
  };

  const isHubSelected = (optValue: string) => {
    if (!isHubMode || !optionToSubstores) return value.includes(optValue);
    const subs = optionToSubstores(optValue);
    return subs.length > 0 && subs.every((s) => valueNorm.has(s.toLowerCase()));
  };

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`h-10 w-full rounded-lg border bg-white px-3 py-2 text-left text-sm text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 focus:border ${triggerBorder} flex items-center justify-between gap-2`}
      >
        <span className={displayCount > 0 ? '' : 'text-slate-400'}>
          {displayCount > 0
            ? `${displayCount} hub${displayCount === 1 ? '' : 's'} selected`
            : 'Select hubs'}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] max-h-[320px] flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="shrink-0 border-b border-slate-200 p-2 bg-slate-50/50 space-y-2">
            <input
              type="text"
              placeholder="Search hubs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 shadow-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors whitespace-nowrap"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors whitespace-nowrap"
              >
                Deselect all
              </button>
            </div>
          </div>
          <div className="overflow-auto py-1 max-h-[220px]">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-500">No hubs match your search.</p>
            ) : (
              filtered.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-pink-50/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isHubSelected(opt.value)}
                    onChange={() => handleToggle(opt.value)}
                    className="h-4 w-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                  />
                  <span>{opt.label}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
