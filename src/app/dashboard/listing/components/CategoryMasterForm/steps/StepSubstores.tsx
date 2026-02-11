'use client';

import { X } from 'lucide-react';
import { SubstoreMultiPicker } from '../shared';

export interface StepSubstoresProps {
  substores: string[];
  hubOptions: { value: string; label: string }[];
  getSubstoresByHub: (hub: string) => string[];
  getSelectedHubsFromSubstores: (substores: string[]) => string[];
  error?: string;
  onChange: (value: string[]) => void;
  onRemoveHub: (hub: string) => void;
  onClearError: () => void;
}

export function StepSubstores({
  substores,
  hubOptions,
  getSubstoresByHub,
  getSelectedHubsFromSubstores,
  error,
  onChange,
  onRemoveHub,
  onClearError,
}: StepSubstoresProps) {
  const selectedHubs = getSelectedHubsFromSubstores(substores);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <div className="space-y-3 max-w-md">
        <SubstoreMultiPicker
          value={substores}
          options={hubOptions}
          optionToSubstores={getSubstoresByHub}
          onChange={(v) => {
            onChange(v);
            onClearError();
          }}
          hasError={!!error}
        />
        {selectedHubs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedHubs.map((hub) => (
              <span
                key={hub}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F4F6F8] px-2.5 py-1 text-sm text-slate-800 shadow-sm"
              >
                {hub}
                <button
                  type="button"
                  onClick={() => onRemoveHub(hub)}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                  aria-label={`Remove ${hub}`}
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
