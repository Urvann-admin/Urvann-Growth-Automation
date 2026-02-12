'use client';

import { CustomSelect } from '../../../components';

export interface StepPricingProps {
  price: number | '';
  inventoryQuantity: number | '';
  publish: string;
  hub: string;
  hubOptions: { value: string; label: string }[];
  errors: Record<string, string>;
  onFieldChange: (field: string, value: string | number | '') => void;
  onClearError: (key: string) => void;
}

export function StepPricing({
  price,
  inventoryQuantity,
  publish,
  hub,
  hubOptions,
  errors,
  onFieldChange,
  onClearError,
}: StepPricingProps) {
  const inputBase = 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';
  const inputError = 'border-red-300';
  const inputNormal = 'border-slate-300';

  return (
    <div>
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
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Inventory Quantity *</label>
          <input
            type="number"
            min={0}
            value={inventoryQuantity}
            onChange={(e) => {
              onFieldChange('inventoryQuantity', e.target.value ? parseInt(e.target.value, 10) : '');
              onClearError('inventoryQuantity');
            }}
            className={`${inputBase} ${errors.inventoryQuantity ? inputError : inputNormal}`}
            placeholder="0"
          />
          {errors.inventoryQuantity && (
            <p className="text-red-500 text-xs mt-1">{errors.inventoryQuantity}</p>
          )}
        </div>
        <CustomSelect
          label="Hub"
          value={hub}
          onChange={(v) => onFieldChange('hub', v)}
          options={hubOptions}
          placeholder="Select Hub"
        />
        <div className="flex items-center gap-3 pt-8">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={publish === 'published'}
              onChange={(e) => onFieldChange('publish', e.target.checked ? 'published' : 'draft')}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-medium text-slate-700">Published</span>
          </label>
          <p className="text-xs text-slate-500">Tick to publish, leave unticked for draft</p>
        </div>
      </div>
    </div>
  );
}
