'use client';

export interface StepPricingProps {
  sellingPrice: number | '';
  errors: Record<string, string>;
  onFieldChange: (field: string, value: string | number | '') => void;
  onClearError: (key: string) => void;
}

export function StepPricing({
  sellingPrice,
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
        <p className="text-xs text-slate-500 mt-1">SKUs are generated per hub when you create the product (parent is live in all hubs).</p>
      </div>
    </div>
  );
}
