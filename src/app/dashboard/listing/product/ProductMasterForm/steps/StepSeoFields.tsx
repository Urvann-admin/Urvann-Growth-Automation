'use client';

import { buildDefaultSeoDescription, buildDefaultSeoTitle } from '../types';

export interface StepSeoFieldsProps {
  plantName: string;
  seoTitle: string;
  seoDescription: string;
  onFieldChange: (field: string, value: string) => void;
}

export function StepSeoFields({ plantName, seoTitle, seoDescription, onFieldChange }: StepSeoFieldsProps) {
  const inputBase =
    'w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm';
  const phTitle = buildDefaultSeoTitle(plantName);
  const phDesc = buildDefaultSeoDescription(plantName);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Title and description are prefilled from the plant name on this step; edit if needed.
      </p>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">SEO title</label>
        <input
          type="text"
          value={seoTitle}
          onChange={(e) => onFieldChange('seoTitle', e.target.value)}
          className={inputBase}
          placeholder={phTitle}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">SEO description</label>
        <textarea
          value={seoDescription}
          onChange={(e) => onFieldChange('seoDescription', e.target.value)}
          className={`${inputBase} min-h-[100px] resize-y`}
          placeholder={phDesc}
          rows={4}
        />
      </div>
    </div>
  );
}
