'use client';

import { CustomSelect } from '../../../components/CustomSelect';
import { COLOUR_OPTIONS, MOSS_STICK_OPTIONS, PARENT_KIND_OPTIONS, POT_TYPE_OPTIONS } from '../types';

export interface StepProductInfoProps {
  plant: string;
  otherNames: string;
  variety: string;
  colour: string;
  height: number | '';
  size: number | '';
  mossStick: string;
  potType: string;
  parentKind: string;
  /** Shown in the Final name field: override if set, otherwise the auto-built name. */
  finalNameInputValue: string;
  errors: Record<string, string>;
  onFieldChange: (field: string, value: string | number | '') => void;
  onClearError: (key: string) => void;
}

export function StepProductInfo({
  plant,
  otherNames,
  variety,
  colour,
  height,
  size,
  mossStick,
  potType,
  parentKind,
  finalNameInputValue,
  errors,
  onFieldChange,
  onClearError,
}: StepProductInfoProps) {
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
        <CustomSelect
          label="Colour"
          value={colour}
          onChange={(v) => onFieldChange('colour', v)}
          options={COLOUR_OPTIONS}
          placeholder="Select Colour"
        />
        <CustomSelect
          label="Parent type (optional)"
          value={parentKind}
          onChange={(v) => onFieldChange('parentKind', v)}
          options={PARENT_KIND_OPTIONS}
          placeholder="Plant or pot"
        />
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
          label="Pot Type"
          value={potType}
          onChange={(v) => onFieldChange('potType', v)}
          options={POT_TYPE_OPTIONS}
          placeholder="Select Pot Type"
        />
        <CustomSelect
          label="Moss Stick"
          value={mossStick}
          onChange={(v) => onFieldChange('mossStick', v)}
          options={MOSS_STICK_OPTIONS}
          placeholder="Select Moss Stick"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Final name</label>
        <input
          type="text"
          value={finalNameInputValue}
          onChange={(e) => onFieldChange('finalNameOverride', e.target.value)}
          className={`${inputBase} ${inputNormal}`}
          placeholder="Auto from fields above"
        />
        <p className="text-xs text-slate-500 mt-1">
          Built from the fields above unless you edit it here. Clear the field to go back to the auto name when attributes change.
        </p>
      </div>
    </div>
  );
}
