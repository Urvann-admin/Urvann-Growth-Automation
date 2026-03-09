'use client';

import { CustomSelect } from '../../../components/CustomSelect';
import { MOSS_STICK_OPTIONS, POT_TYPE_OPTIONS } from '../types';
import { RichTextEditor } from '@/components/ui/RichTextEditor';

export interface StepDetailsProps {
  mossStick: string;
  potType: string;
  seller: string;
  description: string;
  sellerOptions: { value: string; label: string }[];
  errors: Record<string, string>;
  onFieldChange: (field: string, value: string | number | '') => void;
  onClearError: (key: string) => void;
}

export function StepDetails({
  mossStick,
  potType,
  seller,
  description,
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
          label="Pot Type"
          value={potType}
          onChange={(v) => onFieldChange('potType', v)}
          options={POT_TYPE_OPTIONS}
          placeholder="Select Pot Type"
        />
        <CustomSelect
          label="Procurement Seller"
          value={seller}
          onChange={(v) => onFieldChange('seller', v)}
          options={sellerOptions}
          placeholder="Select Procurement Seller"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
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
