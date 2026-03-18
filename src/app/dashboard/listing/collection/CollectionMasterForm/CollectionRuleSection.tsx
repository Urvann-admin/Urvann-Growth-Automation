'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Trash2, X, ChevronDown } from 'lucide-react';
import { CustomSelect } from '@/app/dashboard/listing/category/CategoryMasterForm/shared';

export const COLLECTION_RULE_FIELDS = [
  'Price',
  'Categories',
  'Collections',
] as const;

export const COLLECTION_RULE_OPERATORS = [
  'Equals',
  'Not Equals',
  'greater than',
  'less than',
  'Has',
  'Have not',
] as const;

export type CollectionRuleField = (typeof COLLECTION_RULE_FIELDS)[number];
export type CollectionRuleOperator = (typeof COLLECTION_RULE_OPERATORS)[number];

/** Fields that accept multiple values (sent as array to StoreHippo). */
export const MULTI_VALUE_FIELDS = ['Categories', 'Collections'] as const;

export interface CollectionRuleCondition {
  field: string;
  operator: string;
  /** Single value – used for Price. */
  value: string;
  /** Multi-value array – used for Categories and Collections. */
  values?: string[];
}

export interface CollectionRuleSectionProps {
  ruleOperator: 'AND' | 'OR';
  ruleItems: CollectionRuleCondition[];
  onRuleOperatorChange: (v: 'AND' | 'OR') => void;
  onAddCondition: () => void;
  onRemoveRuleItem: (index: number) => void;
  onUpdateRuleItem: (index: number, updates: Partial<CollectionRuleCondition>) => void;
}

export interface DropdownOption {
  value: string;
  label: string;
}

/** Multi-select: dropdown of options from DB + chips for selected values. */
function MultiValueDropdown({
  options,
  selectedValues,
  loading,
  placeholder,
  onChange,
}: {
  options: DropdownOption[];
  selectedValues: string[];
  loading?: boolean;
  placeholder?: string;
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, search]);

  const add = (value: string) => {
    if (!selectedValues.includes(value)) onChange([...selectedValues, value]);
    setOpen(false);
    setSearch('');
  };

  const remove = (idx: number) =>
    onChange(selectedValues.filter((_, i) => i !== idx));

  const selectedLabels = selectedValues.map(
    (v) => options.find((o) => o.value === v)?.label ?? v
  );

  return (
    <div ref={ref} className="relative min-h-[36px] flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
      {selectedLabels.map((label, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-md bg-pink-50 px-2 py-0.5 text-xs font-medium text-pink-700 border border-pink-200"
        >
          {label}
          <button
            type="button"
            onClick={() => remove(i)}
            className="hover:text-pink-900"
            aria-label={`Remove ${label}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => !loading && setOpen((o) => !o)}
          disabled={loading}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : placeholder ?? 'Select...'}
          <ChevronDown className={`w-4 h-4 ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] max-h-[220px] flex flex-col rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="shrink-0 border-b border-slate-200 p-2 bg-slate-50/50">
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
              />
            </div>
            <div className="overflow-auto py-1 max-h-[180px]">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-500">No options</p>
              ) : (
                filtered.map((opt) => {
                  const isSelected = selectedValues.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => add(opt.value)}
                      disabled={isSelected}
                      className={`w-full px-3 py-2 text-left text-sm transition-all ${
                        isSelected
                          ? 'bg-pink-50 text-pink-700 cursor-default'
                          : 'text-slate-700 hover:bg-pink-50 hover:text-pink-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConditionRow({
  index,
  field,
  operator,
  value,
  values,
  categoryOptions,
  collectionOptions,
  loadingCategories,
  loadingCollections,
  onUpdate,
  onRemove,
  canRemove,
}: {
  index: number;
  field: string;
  operator: string;
  value: string;
  values?: string[];
  categoryOptions: DropdownOption[];
  collectionOptions: DropdownOption[];
  loadingCategories: boolean;
  loadingCollections: boolean;
  onUpdate: (index: number, u: Partial<CollectionRuleCondition>) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  const fieldOptions = COLLECTION_RULE_FIELDS.map((f) => ({ value: f, label: f }));
  const operatorOptions = COLLECTION_RULE_OPERATORS.map((o) => ({ value: o, label: o }));
  const isMulti = MULTI_VALUE_FIELDS.includes(field as (typeof MULTI_VALUE_FIELDS)[number]);

  const inputClass =
    'h-9 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 shadow-sm';

  const handleFieldChange = (newField: string) => {
    const willBeMulti = MULTI_VALUE_FIELDS.includes(newField as (typeof MULTI_VALUE_FIELDS)[number]);
    onUpdate(index, {
      field: newField,
      value: '',
      values: willBeMulti ? [] : undefined,
    });
  };

  const multiOptions = field === 'Categories' ? categoryOptions : collectionOptions;
  const multiLoading = field === 'Categories' ? loadingCategories : loadingCollections;

  return (
    <div className="bg-white p-3 rounded-lg border border-slate-100">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[140px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Field *</label>
          <CustomSelect<string>
            value={field}
            options={fieldOptions}
            onChange={handleFieldChange}
            className="w-full"
            size="sm"
          />
        </div>
        <div className="min-w-[140px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Operator</label>
          <CustomSelect<string>
            value={operator}
            options={operatorOptions}
            onChange={(v) => onUpdate(index, { operator: v })}
            className="w-full"
            size="sm"
          />
        </div>
        <div className="min-w-[180px] flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Value {isMulti ? <span className="font-normal text-slate-400">(select from dropdown)</span> : null}
          </label>
          {isMulti ? (
            <MultiValueDropdown
              options={multiOptions}
              selectedValues={values ?? []}
              loading={multiLoading}
              placeholder={field === 'Categories' ? 'Select categories…' : 'Select collections…'}
              onChange={(next) => onUpdate(index, { values: next })}
            />
          ) : (
            <input
              type="text"
              placeholder="Value"
              value={value}
              onChange={(e) => onUpdate(index, { value: e.target.value })}
              className={`${inputClass} w-full`}
            />
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors self-end mb-0.5"
          aria-label="Remove condition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function CollectionRuleSection({
  ruleOperator,
  ruleItems,
  onRuleOperatorChange,
  onAddCondition,
  onRemoveRuleItem,
  onUpdateRuleItem,
}: CollectionRuleSectionProps) {
  const [categoryOptions, setCategoryOptions] = useState<DropdownOption[]>([]);
  const [collectionOptions, setCollectionOptions] = useState<DropdownOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingCollections, setLoadingCollections] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoadingCategories(true);
      try {
        const res = await fetch('/api/categories?limit=500');
        const json = await res.json();
        if (cancelled) return;
        if (json?.success && Array.isArray(json.data)) {
          setCategoryOptions(
            json.data.map((c: { alias?: string; category?: string }) => ({
              value: c.alias ?? '',
              label: c.category ?? c.alias ?? '',
            })).filter((o: DropdownOption) => o.value)
          );
        }
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoadingCollections(true);
      try {
        const res = await fetch('/api/collection-master?limit=500');
        const json = await res.json();
        if (cancelled) return;
        if (json?.success && Array.isArray(json.data)) {
          setCollectionOptions(
            json.data.map((c: { alias?: string; name?: string }) => ({
              value: c.alias ?? '',
              label: c.name ?? c.alias ?? '',
            })).filter((o: DropdownOption) => o.value)
          );
        }
      } finally {
        if (!cancelled) setLoadingCollections(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-[#F4F6F8] p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Rule operator (top level)
          </label>
          <CustomSelect<'AND' | 'OR'>
            value={ruleOperator}
            options={[
              { value: 'AND', label: 'AND' },
              { value: 'OR', label: 'OR' },
            ]}
            onChange={onRuleOperatorChange}
            className="max-w-[120px]"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-slate-700">Conditions</span>
            <button
              type="button"
              onClick={onAddCondition}
              className="inline-flex items-center gap-1 text-sm font-medium text-pink-600 hover:text-pink-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add condition
            </button>
          </div>
          <div className="space-y-2">
            {ruleItems.map((item, index) => (
              <ConditionRow
                key={index}
                index={index}
                field={item.field}
                operator={item.operator}
                value={item.value}
                values={item.values}
                categoryOptions={categoryOptions}
                collectionOptions={collectionOptions}
                loadingCategories={loadingCategories}
                loadingCollections={loadingCollections}
                onUpdate={onUpdateRuleItem}
                onRemove={onRemoveRuleItem}
                canRemove={ruleItems.length > 1}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
