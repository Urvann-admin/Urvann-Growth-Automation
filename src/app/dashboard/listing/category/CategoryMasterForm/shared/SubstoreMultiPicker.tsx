'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, X } from 'lucide-react';

/** If provided, options are hubs and value is substores[]; toggling a hub adds/removes that hub's substores. */
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
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
    if (open) {
      queueMicrotask(() => {
        if (isHubMode && optionToSubstores) {
          const selectedHubs = new Set<string>();
          options.forEach((opt) => {
            const subs = optionToSubstores(opt.value);
            if (subs.length > 0 && subs.every((s) => valueNorm.has(s.toLowerCase()))) selectedHubs.add(opt.value);
          });
          setSelected(selectedHubs);
        } else {
          setSelected(new Set(value.filter(Boolean)));
        }
        setSearch('');
      });
    }
  }, [open, value, valueNorm, options, isHubMode, optionToSubstores]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
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
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(optValue)) next.delete(optValue);
      else next.add(optValue);
      return next;
    });
  };

  const handleDone = () => {
    if (isHubMode && optionToSubstores) {
      const substores = Array.from(selected).flatMap((hub) => optionToSubstores(hub));
      onChange(substores);
    } else {
      onChange(Array.from(selected));
    }
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`h-10 w-full rounded-lg border bg-white px-3 py-2 text-left text-sm text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 focus:border ${triggerBorder} flex items-center justify-between gap-2`}
      >
        <span className={displayCount > 0 ? '' : 'text-slate-400'}>
          {displayCount > 0
            ? `${displayCount} hub${displayCount === 1 ? '' : 's'} selected`
            : 'Select hubs'}
        </span>
        <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="substore-picker-title"
        >
          <div
            className="absolute inset-0 bg-slate-900/20"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-md max-h-[85vh] flex flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between shrink-0 border-b border-slate-200 px-5 py-4 bg-[#F4F6F8]">
              <h2 id="substore-picker-title" className="text-base font-semibold text-slate-900">
                Select hubs
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="shrink-0 border-b border-slate-100 px-4 py-3 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search hubs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setSelected(new Set(filtered.map((o) => o.value)))}
                  className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors whitespace-nowrap"
                >
                  Select all
                </button>
              </div>
            </div>
            <div className="overflow-auto py-2 max-h-[50vh]">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-500">
                  No hubs match your search.
                </p>
              ) : (
                filtered.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-pink-50/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(opt.value)}
                      onChange={() => handleToggle(opt.value)}
                      className="h-4 w-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))
              )}
            </div>
            <div className="shrink-0 flex justify-end gap-2 border-t border-slate-200 px-4 py-3 bg-[#F4F6F8]">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDone}
                className="rounded-lg bg-[#E6007A] px-4 py-2 text-sm font-medium text-white hover:bg-pink-600 shadow-sm transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
