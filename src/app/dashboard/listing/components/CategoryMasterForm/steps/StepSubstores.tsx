'use client';

import { X } from 'lucide-react';
import { SubstoreMultiPicker } from '../shared';
import { formatSubstoreForDisplay } from '@/shared/constants/hubs';

export interface StepSubstoresProps {
  substores: string[];
  options: { value: string; label: string }[];
  error?: string;
  onChange: (value: string[]) => void;
  onRemove: (value: string) => void;
  onClearError: () => void;
}

export function StepSubstores({
  substores,
  options,
  error,
  onChange,
  onRemove,
  onClearError,
}: StepSubstoresProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <div className="space-y-3 max-w-md">
        <SubstoreMultiPicker
          value={substores}
          options={options}
          onChange={(v) => {
            onChange(v);
            onClearError();
          }}
          hasError={!!error}
        />
        {substores.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {substores.map((sub) => (
              <span
                key={sub}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F4F6F8] px-2.5 py-1 text-sm text-slate-800 shadow-sm"
              >
                {formatSubstoreForDisplay(sub)}
                <button
                  type="button"
                  onClick={() => onRemove(sub)}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                  aria-label={`Remove ${sub}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
