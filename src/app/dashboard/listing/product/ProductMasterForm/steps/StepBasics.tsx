'use client';

import { CustomSelect } from '../../../components';
import { MOSS_STICK_OPTIONS, PLANT_TYPES } from '../types';

export interface StepBasicsProps {
  plant: string;
  otherNames: string;
  variety: string;
  colour: string;
  height: number | '';
  mossStick: string;
  size: number | '';
  type: string;
  seller: string;
  sort_order: number | '';
  finalName: string;
  sellerOptions: { value: string; label: string }[];
  errors: Record<string, string>;
  onFieldChange: (field: string, value: string | number | '') => void;
  onClearError: (key: string) => void;
}

export function StepBasics({
  plant,
  otherNames,
  variety,
  colour,
  height,
  mossStick,
  size,
  type,
  seller,
  sort_order,
  finalName,
  sellerOptions,
  errors,
  onFieldChange,
  onClearError,
}: StepBasicsProps) {
  const inputBase = 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';
  const inputError = 'border-red-300';
  const inputNormal = 'border-slate-300';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Plant Name *</label>
          <input
            type="text"
            value={plant}
            onChange={(e) => { onFieldChange('plant', e.target.value); onClearError('plant'); }}
            className={`${inputBase} ${errors.plant ? inputError : inputNormal}`}
            placeholder="Enter plant name"
          />
          {errors.plant && <p className="text-red-500 text-xs mt-1">{errors.plant}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Other Names</label>
          <input
            type="text"
            value={otherNames}
            onChange={(e) => onFieldChange('otherNames', e.target.value)}
            className={`${inputBase} ${inputNormal}`}
            placeholder="Alternative names"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Variety</label>
          <input
            type="text"
            value={variety}
            onChange={(e) => onFieldChange('variety', e.target.value)}
            className={`${inputBase} ${inputNormal}`}
            placeholder="Plant variety"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Colour</label>
          <input
            type="text"
            value={colour}
            onChange={(e) => onFieldChange('colour', e.target.value)}
            className={`${inputBase} ${inputNormal}`}
            placeholder="Plant colour"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Height (feet)</label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={height}
            onChange={(e) => onFieldChange('height', e.target.value ? parseFloat(e.target.value) : '')}
            className={`${inputBase} ${inputNormal}`}
            placeholder="Height in feet"
          />
        </div>
        <CustomSelect
          label="Moss Stick"
          value={mossStick}
          onChange={(v) => onFieldChange('mossStick', v)}
          options={MOSS_STICK_OPTIONS}
          placeholder="Select Moss Stick"
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Size (inches)</label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={size}
            onChange={(e) => onFieldChange('size', e.target.value ? parseFloat(e.target.value) : '')}
            className={`${inputBase} ${inputNormal}`}
            placeholder="Size in inches"
          />
        </div>
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
        <label className="block text-sm font-medium text-slate-700 mb-2">Final Name</label>
        <input
          type="text"
          value={finalName}
          readOnly
          className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
          placeholder="Auto-generated"
        />
        <p className="text-xs text-slate-500 mt-1">
          Generated from: plant + other names + variety + colour + in + size + inch + type
        </p>
      </div>
    </div>
  );
}
