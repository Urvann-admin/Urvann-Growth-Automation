'use client';

import { CustomSelect } from '../../../components/CustomSelect';
import { INVENTORY_MANAGEMENT_OPTIONS, INVENTORY_MANAGEMENT_LEVEL_OPTIONS } from '../types';

export interface StepPricingProps {
  price: number | '';
  compare_price: number | '';
  inventoryQuantity: number | '';
  inventory_management: string;
  inventory_management_level: string;
  inventory_allow_out_of_stock: number | '';
  publish: string;
  hub: string;
  hubOptions: { value: string; label: string }[];
  skuPreview?: string;
  errors: Record<string, string>;
  onFieldChange: (field: string, value: string | number | '') => void;
  onClearError: (key: string) => void;
}

export function StepPricing({
  price,
  compare_price,
  inventoryQuantity,
  inventory_management,
  inventory_management_level,
  inventory_allow_out_of_stock,
  publish,
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
              onClearError('compare_price');
            }}
            className={`${inputBase} ${errors.price ? inputError : inputNormal}`}
            placeholder="0.00"
          />
          {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Compare Price</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={compare_price}
            onChange={(e) => {
              onFieldChange('compare_price', e.target.value ? parseFloat(e.target.value) : '');
              onClearError('compare_price');
            }}
            className={`${inputBase} ${errors.compare_price ? inputError : inputNormal}`}
            placeholder="0.00"
          />
          {errors.compare_price ? (
            <p className="text-red-500 text-xs mt-1">{errors.compare_price}</p>
          ) : (
            <p className="text-xs text-slate-500 mt-1">Original/strikethrough price; must be ≥ Price (optional)</p>
          )}
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CustomSelect
          label="Inventory Management"
          value={inventory_management}
          onChange={(v) => onFieldChange('inventory_management', v)}
          options={INVENTORY_MANAGEMENT_OPTIONS}
          placeholder="Select"
        />
        <CustomSelect
          label="Inventory Management Level"
          value={inventory_management_level}
          onChange={(v) => onFieldChange('inventory_management_level', v)}
          options={INVENTORY_MANAGEMENT_LEVEL_OPTIONS}
          placeholder="Leave empty"
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Allow out of stock (quantity)</label>
          <input
            type="number"
            min={0}
            value={inventory_allow_out_of_stock}
            onChange={(e) =>
              onFieldChange('inventory_allow_out_of_stock', e.target.value ? parseInt(e.target.value, 10) : '')
            }
            className={`${inputBase} ${inputNormal}`}
            placeholder="0"
          />
          <p className="text-xs text-slate-500 mt-1">Amount allowed for purchase when out of stock (optional)</p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
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
