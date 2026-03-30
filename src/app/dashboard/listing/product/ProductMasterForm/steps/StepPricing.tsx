'use client';

import { CustomSelect } from '../../../components/CustomSelect';
import { TAX_OPTIONS } from '../types';

export interface StepPricingProps {
  sellingPrice: number | '';
  /** When set with `compareAtEditable`, allows overriding the default selling × 4 */
  compare_at?: number | '';
  /** On review step, allow editing compare-at; otherwise show selling × 4 only */
  compareAtEditable?: boolean;
  tax: string;
  errors: Record<string, string>;
  onFieldChange: (field: string, value: string | number | '') => void;
  onClearError: (key: string) => void;
}

export function StepPricing({
  sellingPrice,
  compare_at = '',
  compareAtEditable = false,
  tax,
  errors,
  onFieldChange,
  onClearError,
}: StepPricingProps) {
  const inputBase = 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';
  const inputError = 'border-red-300';
  const inputNormal = 'border-slate-300';

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Selling Price</label>
        <input
          type="number"
          min={0}
          step={0.01}
          value={sellingPrice}
          onChange={(e) => {
            onFieldChange('sellingPrice', e.target.value ? parseFloat(e.target.value) : '');
            onClearError('sellingPrice');
          }}
          className={`${inputBase} ${errors.sellingPrice ? inputError : inputNormal}`}
          placeholder="0.00"
        />
        {errors.sellingPrice && <p className="text-red-500 text-xs mt-1">{errors.sellingPrice}</p>}
        <p className="text-xs text-slate-500 mt-1">A single SKU (no hub letter) is generated when you create the product; parent is live in all hubs.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Compare-at price</label>
        {compareAtEditable ? (
          <>
            <input
              type="number"
              min={0}
              step={0.01}
              value={compare_at}
              onChange={(e) => {
                onFieldChange('compare_at', e.target.value ? parseFloat(e.target.value) : '');
                onClearError('compare_at');
              }}
              className={`${inputBase} ${errors.compare_at ? inputError : inputNormal}`}
              placeholder={
                typeof sellingPrice === 'number' && !Number.isNaN(sellingPrice)
                  ? `Default ${(sellingPrice * 4).toFixed(2)} (selling × 4)`
                  : 'Selling × 4 when selling price set'
              }
            />
            {errors.compare_at && <p className="text-red-500 text-xs mt-1">{errors.compare_at}</p>}
            <p className="text-xs text-slate-500 mt-1">
              Default is <strong>selling price × 4</strong>. Leave empty on save to use that value.
            </p>
          </>
        ) : (
          <>
            <div
              className={`${inputBase} bg-slate-50 text-slate-800 font-medium ${
                errors.compare_at ? inputError : inputNormal
              }`}
            >
              {typeof sellingPrice === 'number' && !Number.isNaN(sellingPrice) ? (
                <span>{(sellingPrice * 4).toFixed(2)}</span>
              ) : (
                <span className="text-slate-400 font-normal">Enter selling price — compare-at is selling × 4</span>
              )}
            </div>
            {errors.compare_at && <p className="text-red-500 text-xs mt-1">{errors.compare_at}</p>}
            <p className="text-xs text-slate-500 mt-1">
              Compare-at is <strong>selling price × 4</strong>. Override on the final review step if needed.
            </p>
          </>
        )}
      </div>

      <CustomSelect
        label="Tax (optional)"
        value={tax}
        onChange={(v) => {
          onFieldChange('tax', v);
          onClearError('tax');
        }}
        options={TAX_OPTIONS}
        placeholder="Select tax rate"
      />
      {errors.tax && <p className="text-red-500 text-xs mt-1">{errors.tax}</p>}
    </div>
  );
}
