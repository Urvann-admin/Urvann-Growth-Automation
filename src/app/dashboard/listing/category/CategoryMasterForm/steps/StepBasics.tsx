'use client';

import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Field, inputBase, inputError, inputNormal } from '../shared';
import { CustomSelect } from '../shared/CustomSelect';

const TYPE_OF_CATEGORY_OPTIONS = [
  { value: 'L1', label: 'L1' },
  { value: 'L2', label: 'L2' },
  { value: 'L3', label: 'L3' },
] as const;

export interface StepBasicsProps {
  category: string;
  alias: string;
  typeOfCategory: string;
  description: string;
  errors: Record<string, string>;
  onCategoryChange: (v: string) => void;
  onAliasChange: (v: string) => void;
  onTypeOfCategoryChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onClearError: (key: string) => void;
}

export function StepBasics({
  category,
  alias,
  typeOfCategory,
  description,
  errors,
  onCategoryChange,
  onAliasChange,
  onTypeOfCategoryChange,
  onDescriptionChange,
  onClearError,
}: StepBasicsProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field label="Name" required error={errors.category}>
          <input
            id="category"
            type="text"
            placeholder="Category name"
            value={category}
            onChange={(e) => {
              onCategoryChange(e.target.value);
              onClearError('category');
            }}
            className={`${inputBase} ${errors.category ? inputError : inputNormal}`}
          />
        </Field>
        <Field label="Alias" required error={errors.alias}>
          <input
            id="alias"
            type="text"
            placeholder="unique-slug"
            value={alias}
            onChange={(e) => {
              onAliasChange(e.target.value);
              onClearError('alias');
            }}
            className={`${inputBase} ${errors.alias ? inputError : inputNormal}`}
          />
        </Field>
        <Field label="Type of category" required error={errors.typeOfCategory}>
          <CustomSelect
            value={typeOfCategory}
            options={[...TYPE_OF_CATEGORY_OPTIONS]}
            onChange={(v) => {
              onTypeOfCategoryChange(v);
              onClearError('typeOfCategory');
            }}
            placeholder="Select L1, L2 or L3"
            hasError={!!errors.typeOfCategory}
          />
        </Field>
        <Field label="Description" required error={errors.description} className="sm:col-span-2 lg:col-span-4">
          <RichTextEditor
            value={description}
            onChange={(v) => {
              onDescriptionChange(v);
              onClearError('description');
            }}
            placeholder="Short description"
            hasError={!!errors.description}
            minHeight="140px"
          />
        </Field>
      </div>
    </div>
  );
}
