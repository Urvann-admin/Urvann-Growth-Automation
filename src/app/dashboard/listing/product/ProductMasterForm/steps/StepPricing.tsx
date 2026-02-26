'use client';

import { CustomSelect } from '../../../components/CustomSelect';

export interface StepPricingProps {
  price: number | '';
  hub: string;
  hubOptions: { value: string; label: string }[];
  skuPreview?: string;
  errors: Record<string, string>;
  onFieldChange: (field: string, value: string | number | '') => void;
  onClearError: (key: string) => void;
}

export function StepPricing({
  price,
  hub,
  hubOptions,
  skuPreview = '',
  errors,
  onFieldChange,
  onClearError,
}: StepPricingProps) {
  const inputBase = 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';
  const inputError = 'border-red-300';
  const inputNormal = 'border-slate-300';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Price *</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={price}
            onChange={(e) => {
              onFieldChange('price', e.target.value ? parseFloat(e.target.value) : '');
              onClearError('price');
            }}
            className={`${inputBase} ${errors.price ? inputError : inputNormal}`}
            placeholder="0.00"
          />
          {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
        </div>
        <CustomSelect
          label="Hub"
          value={hub}
          onChange={(v) => onFieldChange('hub', v)}
          options={hubOptions}
          placeholder="Select Hub"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">SKU</label>
        <input
          type="text"
          readOnly
          value={skuPreview || '—'}
          className={`${inputBase} border-slate-300 bg-slate-50 text-slate-600 cursor-default`}
          aria-label="SKU (auto-filled)"
        />
        <p className="text-xs text-slate-500 mt-1">Preview only — actual SKU is assigned when you create the product</p>
      </div>
    </div>
  );
}
