'use client';

import { Field, SearchableSelect } from '../shared';

export interface StepHierarchyProps {
  typeOfCategory: string;
  l1Parent: string;
  l2Parent: string;
  l3Parent: string;
  l1Options: { value: string; label: string }[];
  l2Options: { value: string; label: string }[];
  l3Options: { value: string; label: string }[];
  onL1ParentChange: (v: string) => void;
  onL2ParentChange: (v: string) => void;
  onL3ParentChange: (v: string) => void;
}

export function StepHierarchy({
  typeOfCategory,
  l1Parent,
  l2Parent,
  l3Parent,
  l1Options,
  l2Options,
  l3Options,
  onL1ParentChange,
  onL2ParentChange,
  onL3ParentChange,
}: StepHierarchyProps) {
  const typeUpper = String(typeOfCategory || '').toUpperCase();
  const isL1 = typeUpper === 'L1';
  const isL2 = typeUpper === 'L2';
  const parentsDisabled = isL1;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {isL1 && (
        <p className="text-sm text-slate-500 mb-4">
          L1 categories are top-level and do not have parents. Parent selection is disabled.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="L1 parent">
          <SearchableSelect
            value={l1Parent}
            options={l1Options}
            onChange={onL1ParentChange}
            placeholder="Select L1 parent"
            disabled={parentsDisabled}
          />
        </Field>
        {!isL2 && (
          <>
            <Field label="L2 parent">
              <SearchableSelect
                value={l2Parent}
                options={l2Options}
                onChange={onL2ParentChange}
                placeholder="Select L2 parent"
                disabled={parentsDisabled}
              />
            </Field>
            <Field label="L3 parent">
              <SearchableSelect
                value={l3Parent}
                options={l3Options}
                onChange={onL3ParentChange}
                placeholder="Select L3 parent"
                disabled={parentsDisabled}
              />
            </Field>
          </>
        )}
      </div>
    </div>
  );
}
