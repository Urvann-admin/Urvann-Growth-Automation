'use client';

import { Field, SearchableSelect } from '../shared';

export interface StepHierarchyProps {
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
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="L1 parent">
          <SearchableSelect
            value={l1Parent}
            options={l1Options}
            onChange={onL1ParentChange}
            placeholder="Select L1 parent"
          />
        </Field>
        <Field label="L2 parent">
          <SearchableSelect
            value={l2Parent}
            options={l2Options}
            onChange={onL2ParentChange}
            placeholder="Select L2 parent"
          />
        </Field>
        <Field label="L3 parent">
          <SearchableSelect
            value={l3Parent}
            options={l3Options}
            onChange={onL3ParentChange}
            placeholder="Select L3 parent"
          />
        </Field>
      </div>
    </div>
  );
}
