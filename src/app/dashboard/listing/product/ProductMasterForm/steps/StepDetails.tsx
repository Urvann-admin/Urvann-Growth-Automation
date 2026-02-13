'use client';

import { CustomSelect } from '../../../components/CustomSelect';
import { MOSS_STICK_OPTIONS, PLANT_TYPES } from '../types';
import { RichTextEditor } from '@/components/ui/RichTextEditor';

export interface StepDetailsProps {
  mossStick: string;
  type: string;
  seller: string;
  description: string;
  sort_order: number | '';
  sellerOptions: { value: string; label: string }[];
  errors: Record<string, string>;
  onFieldChange: (field: string, value: string | number | '') => void;
  onClearError: (key: string) => void;
}

export function StepDetails({
  mossStick,
  type,
  seller,
  description,
  sort_order,
  sellerOptions,
  errors,
  onFieldChange,
  onClearError,
}: StepDetailsProps) {
  const inputBase = 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';
  const inputNormal = 'border-slate-300';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CustomSelect
          label="Moss Stick"
          value={mossStick}
          onChange={(v) => onFieldChange('mossStick', v)}
          options={MOSS_STICK_OPTIONS}
          placeholder="Select Moss Stick"
        />
        <CustomSelect
          label="Type"
          value={type}
          onChange={(v) => onFieldChange('type', v)}
          options={PLANT_TYPES}
          placeholder="Select Type"
        />
        <CustomSelect
          label="Seller Name"
          value={seller}
          onChange={(v) => onFieldChange('seller', v)}
          options={sellerOptions}
          placeholder="Select Seller"
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Sort Order</label>
          <input
            type="number"
            min={0}
            value={sort_order}
            onChange={(e) => onFieldChange('sort_order', e.target.value ? parseInt(e.target.value, 10) : '')}
            className={`${inputBase} ${inputNormal}`}
            placeholder="Optional"
          />
          <p className="text-xs text-slate-500 mt-1">Display order (optional, can leave empty)</p>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Description *</label>
        <RichTextEditor
          value={description}
          onChange={(v) => { onFieldChange('description', v); onClearError('description'); }}
          placeholder="Product description"
          hasError={!!errors.description}
          minHeight="140px"
        />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
      </div>
    </div>
  );
}
