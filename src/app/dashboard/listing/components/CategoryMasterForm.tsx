'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import type { Rule, RuleCondition, RuleConditionField, Category } from '@/models/category';
import { getAllSubstores, formatSubstoreForDisplay } from '@/shared/constants/hubs';
import { Plus, Trash2, ChevronDown, Minus, X } from 'lucide-react';

/** Custom dropdown: white panel, rounded, shadow; selected/hover option with solid bg and white text */
function CustomSelect<T extends string>({
  value,
  options,
  onChange,
  placeholder,
  className = '',
  hasError,
  size = 'md',
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  size?: 'sm' | 'md';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);
  const triggerBorder = hasError ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' : 'border-slate-200 hover:border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-400';
  const isSm = size === 'sm';
  const triggerHeight = isSm ? 'h-9' : 'h-10';
  const triggerPadding = isSm ? 'px-2.5 py-1.5' : 'px-3 py-2';
  const textSize = isSm ? 'text-xs' : 'text-sm';
  const optionPadding = isSm ? 'px-2.5 py-1.5' : 'px-3 py-2';

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${triggerHeight} w-full rounded-lg border bg-white ${triggerPadding} text-left ${textSize} text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 focus:border ${triggerBorder} flex items-center justify-between gap-2`}
      >
        <span className={selected ? '' : 'text-slate-400'}>{selected ? selected.label : placeholder || 'Select...'}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[140px] rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full ${optionPadding} text-left ${textSize} transition-all first:rounded-t-md last:rounded-b-md ${
                opt.value === value
                  ? 'bg-indigo-500 text-white'
                  : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Single-select dropdown with search: same look as CustomSelect, search input inside panel */
function SearchableSelect({
  value,
  options,
  onChange,
  placeholder,
  className = '',
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, search]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-10 w-full rounded-lg border border-slate-200 hover:border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 flex items-center justify-between gap-2"
      >
        <span className={selected ? '' : 'text-slate-400'}>{selected ? selected.label : placeholder || 'Select...'}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[180px] rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="shrink-0 border-b border-slate-200 p-2 bg-slate-50/50">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>
          <div className="max-h-[220px] overflow-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-500">No matches</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full px-3 py-2 text-left text-sm transition-all ${
                    opt.value === value ? 'bg-indigo-500 text-white' : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Substore multi-select modal: search + checkboxes, apply on Done */
function SubstoreMultiPicker({
  value,
  options,
  onChange,
  hasError,
}: {
  value: string[];
  options: { value: string; label: string }[];
  onChange: (value: string[]) => void;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSelected(new Set(value.filter(Boolean)));
      setSearch('');
    }
  }, [open, value]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, search]);

  const triggerBorder = hasError ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' : 'border-slate-200 hover:border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-400';

  const handleToggle = (optValue: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(optValue)) next.delete(optValue);
      else next.add(optValue);
      return next;
    });
  };

  const handleDone = () => {
    onChange(Array.from(selected));
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`h-10 w-full rounded-lg border bg-white px-3 py-2 text-left text-sm text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 focus:border ${triggerBorder} flex items-center justify-between gap-2`}
      >
        <span className={value.length > 0 ? '' : 'text-slate-400'}>
          {value.length > 0 ? `${value.length} substore${value.length === 1 ? '' : 's'} selected` : 'Select substores'}
        </span>
        <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="substore-picker-title"
        >
          <div
            className="absolute inset-0 bg-slate-900/20"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-md max-h-[85vh] flex flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between shrink-0 border-b border-slate-100 px-5 py-4 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
              <h2 id="substore-picker-title" className="text-base font-semibold text-slate-900">
                Select substores
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="shrink-0 border-b border-slate-100 px-4 py-3 bg-slate-50/50">
              <input
                type="text"
                placeholder="Search substores..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 shadow-sm"
              />
            </div>
            <div className="overflow-auto py-2 max-h-[50vh]">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-500">No substores match your search.</p>
              ) : (
                filtered.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(opt.value)}
                      onChange={() => handleToggle(opt.value)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))
              )}
            </div>
            <div className="shrink-0 flex justify-end gap-2 border-t border-slate-100 px-4 py-3 bg-slate-50/30">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDone}
                className="rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white hover:from-indigo-600 hover:to-indigo-700 shadow-sm transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const RULE_FIELDS: RuleConditionField[] = ['Plant', 'variety', 'Colour', 'Height', 'Size', 'Type', 'Category'];

const TYPE_OPTIONS = [
  { value: 'Manual', label: 'Manual' },
  { value: 'Automatic', label: 'Automatic' },
];

const inputBase =
  'h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all';
const inputError = 'border-red-300 focus:ring-red-500/20 focus:border-red-400';
const inputNormal = 'border-slate-200 hover:border-slate-300';

function Field({
  id,
  label,
  required,
  error,
  children,
  className = '',
}: {
  id?: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}

export function CategoryMasterForm() {
  const router = useRouter();
  const [category, setCategory] = useState('');
  const [alias, setAlias] = useState('');
  const [typeOfCategory, setTypeOfCategory] = useState('');
  const [description, setDescription] = useState('');
  const [l1Parent, setL1Parent] = useState('');
  const [l2Parent, setL2Parent] = useState('');
  const [l3Parent, setL3Parent] = useState('');
  const [publish, setPublish] = useState(true);
  const [type, setType] = useState<'Automatic' | 'Manual'>('Manual');
  const [ruleOperator, setRuleOperator] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<RuleCondition[]>([{ field: 'Plant', value: '' }]);
  const [priorityOrder, setPriorityOrder] = useState<string>('0');
  const [substores, setSubstores] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.success && Array.isArray(json.data)) {
          setCategories(json.data);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const substoreOptions = useMemo(
    () => getAllSubstores().map((s) => ({ value: s, label: formatSubstoreForDisplay(s) })),
    []
  );

  // Parent dropdowns use category name as value so backend can find by name and send categoryId to StoreHippo
  const l1Options = useMemo(() => {
    const list = categories.filter((c) => String(c.typeOfCategory || '').toUpperCase() === 'L1');
    const opts = list.map((c) => ({ value: (c.category ?? c.categoryId ?? '').toString(), label: c.category || (c.categoryId ?? '') }));
    return [{ value: '', label: 'None' }, ...opts.filter((o) => o.value)];
  }, [categories]);

  const l2Options = useMemo(() => {
    const list = categories.filter((c) => String(c.typeOfCategory || '').toUpperCase() === 'L2');
    const opts = list.map((c) => ({ value: (c.category ?? c.categoryId ?? '').toString(), label: c.category || (c.categoryId ?? '') }));
    return [{ value: '', label: 'None' }, ...opts.filter((o) => o.value)];
  }, [categories]);

  const l3Options = useMemo(() => {
    const list = categories.filter((c) => String(c.typeOfCategory || '').toUpperCase() === 'L3');
    const opts = list.map((c) => ({ value: (c.category ?? c.categoryId ?? '').toString(), label: c.category || (c.categoryId ?? '') }));
    return [{ value: '', label: 'None' }, ...opts.filter((o) => o.value)];
  }, [categories]);

  const addCondition = () => {
    setConditions((prev) => [...prev, { field: 'Plant', value: '' }]);
  };

  const removeCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    setConditions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  };

  const removeSubstore = (value: string) => {
    setSubstores((prev) => prev.filter((s) => s !== value));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!category.trim()) next.category = 'Name is required';
    if (!alias.trim()) next.alias = 'Alias is required';
    if (!typeOfCategory.trim()) next.typeOfCategory = 'Type of category is required';
    if (!description.trim()) next.description = 'Description is required';
    if (!type) next.type = 'Type is required';
    if (type === 'Automatic') {
      const validConditions = conditions.filter((c) => String(c.value).trim() !== '');
      if (validConditions.length === 0) next.rule = 'Add at least one condition with a value when Type is Automatic';
    }
    const order = parseInt(priorityOrder, 10);
    if (Number.isNaN(order) || order < 0) next.priorityOrder = 'Enter a valid priority (0 or more)';
    if (substores.length === 0) next.substores = 'Select at least one substore';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!validate()) return;
    setSubmitting(true);

    const rule: Rule | undefined =
      type === 'Automatic' && conditions.length > 0
        ? {
            rule_operator: ruleOperator,
            conditions: conditions
              .map((c) => ({
                field: c.field,
                value: typeof c.value === 'string' && c.value.trim() !== '' && !Number.isNaN(Number(c.value)) ? Number(c.value) : c.value,
              }))
              .filter((c) => c.value !== '' && c.value !== undefined),
          }
        : undefined;

    const payload = {
      category: category.trim(),
      alias: alias.trim(),
      typeOfCategory: typeOfCategory.trim(),
      description: description.trim(),
      l1Parent: l1Parent.trim(),
      l2Parent: l2Parent.trim(),
      l3Parent: l3Parent.trim(),
      publish,
      type,
      rule,
      priorityOrder: Math.max(0, parseInt(priorityOrder, 10) || 0),
      substores,
    };

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.message || 'Failed to create category' });
        setSubmitting(false);
        return;
      }

      setMessage({ type: 'success', text: 'Category created successfully.' });
      setErrors({});
      setCategory('');
      setAlias('');
      setTypeOfCategory('');
      setDescription('');
      setL1Parent('');
      setL2Parent('');
      setL3Parent('');
      setPublish(true);
      setType('Manual');
      setRuleOperator('AND');
      setConditions([{ field: 'Plant', value: '' }]);
      setPriorityOrder('0');
      setSubstores([]);
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-pink-50/50 rounded-xl p-6 border border-indigo-100/50">
        <h2 className="text-2xl font-bold text-slate-900">Add New Category</h2>
        <p className="text-sm text-slate-600 mt-1">All fields marked with <span className="text-red-500 font-medium">*</span> are required.</p>
      </div>

      {/* Required fields – compact grid */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
          Required fields
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Name" required error={errors.category}>
            <input
              id="category"
              type="text"
              placeholder="Category name"
              value={category}
              onChange={(e) => { setCategory(e.target.value); setErrors((e) => ({ ...e, category: '' })); }}
              className={`${inputBase} ${errors.category ? inputError : inputNormal}`}
            />
          </Field>
          <Field label="Alias" required error={errors.alias}>
            <input
              id="alias"
              type="text"
              placeholder="unique-slug"
              value={alias}
              onChange={(e) => { setAlias(e.target.value); setErrors((e) => ({ ...e, alias: '' })); }}
              className={`${inputBase} ${errors.alias ? inputError : inputNormal}`}
            />
          </Field>
          <Field label="Type of category" required error={errors.typeOfCategory}>
            <input
              id="typeOfCategory"
              type="text"
              placeholder="L1, L2, L3"
              value={typeOfCategory}
              onChange={(e) => { setTypeOfCategory(e.target.value); setErrors((e) => ({ ...e, typeOfCategory: '' })); }}
              className={`${inputBase} ${errors.typeOfCategory ? inputError : inputNormal}`}
            />
          </Field>
          <Field label="Description" required error={errors.description} className="sm:col-span-2 lg:col-span-4">
            <input
              id="description"
              type="text"
              placeholder="Short description"
              value={description}
              onChange={(e) => { setDescription(e.target.value); setErrors((e) => ({ ...e, description: '' })); }}
              className={`${inputBase} ${errors.description ? inputError : inputNormal}`}
            />
          </Field>
        </div>
      </div>

      {/* Hierarchy – optional */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
          Hierarchy <span className="font-normal text-slate-400">(optional)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="L1 parent">
            <SearchableSelect
              value={l1Parent}
              options={l1Options}
              onChange={setL1Parent}
              placeholder="Select L1 parent"
            />
          </Field>
          <Field label="L2 parent">
            <SearchableSelect
              value={l2Parent}
              options={l2Options}
              onChange={setL2Parent}
              placeholder="Select L2 parent"
            />
          </Field>
          <Field label="L3 parent">
            <SearchableSelect
              value={l3Parent}
              options={l3Options}
              onChange={setL3Parent}
              placeholder="Select L3 parent"
            />
          </Field>
        </div>
      </div>

      {/* Type & Rule + Publish & order – one row on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30 p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
            Type & rule
          </h3>
          <div className="flex flex-col md:flex-row gap-4 md:gap-5">
            <Field label="Type" required error={errors.type} className="shrink-0 max-w-[180px]">
              <CustomSelect
                value={type}
                options={TYPE_OPTIONS}
                onChange={(v) => { setType(v as 'Automatic' | 'Manual'); setErrors((prev) => ({ ...prev, type: '', rule: '' })); }}
                hasError={!!errors.type}
              />
            </Field>
            {type === 'Automatic' && (
              <div className="flex-1 min-w-0 rounded-lg border border-indigo-200/50 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rule operator</label>
                  <CustomSelect
                    value={ruleOperator}
                    options={[{ value: 'AND', label: 'AND' }, { value: 'OR', label: 'OR' }]}
                    onChange={(v) => setRuleOperator(v)}
                    className="max-w-[120px]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700">Conditions</span>
                    <button type="button" onClick={addCondition} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Add condition
                    </button>
                  </div>
                  {errors.rule && <p className="text-xs text-red-600 mb-1.5">{errors.rule}</p>}
                  <div className="space-y-2">
                    {conditions.map((cond, index) => (
                      <div key={index} className="flex flex-wrap items-center gap-2 bg-white/60 p-2 rounded-lg">
                        <CustomSelect<RuleConditionField>
                          value={cond.field}
                          options={RULE_FIELDS.map((f) => ({ value: f, label: f }))}
                          onChange={(v) => updateCondition(index, { field: v })}
                          className="min-w-[120px]"
                          size="sm"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={cond.value}
                          onChange={(e) => updateCondition(index, { value: e.target.value })}
                          className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeCondition(index)}
                          disabled={conditions.length <= 1}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                          aria-label="Remove condition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-purple-100 bg-gradient-to-br from-white to-purple-50/30 p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
            Publish & order
          </h3>
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Publish <span className="text-red-500">*</span></span>
            </label>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700 shrink-0">
                Priority order <span className="text-red-500">*</span>
              </label>
              <div className="inline-flex overflow-hidden rounded-lg border border-indigo-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    const n = Math.max(0, parseInt(priorityOrder, 10) - 1);
                    setPriorityOrder(String(n));
                    setErrors((prev) => ({ ...prev, priorityOrder: '' }));
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center bg-indigo-50 text-indigo-700 transition-colors hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1"
                  aria-label="Decrease priority"
                >
                  <Minus className="w-4 h-4" strokeWidth={2.5} />
                </button>
                <div className="w-px self-stretch bg-indigo-200 shrink-0" aria-hidden />
                <input
                  id="priorityOrder"
                  type="number"
                  min={0}
                  value={priorityOrder}
                  onChange={(e) => { setPriorityOrder(e.target.value); setErrors((prev) => ({ ...prev, priorityOrder: '' })); }}
                  className={`h-8 w-10 shrink-0 border-0 bg-white text-center text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-inset [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${errors.priorityOrder ? 'ring-2 ring-red-400 ring-inset' : ''}`}
                />
                <div className="w-px self-stretch bg-indigo-200 shrink-0" aria-hidden />
                <button
                  type="button"
                  onClick={() => {
                    const n = (parseInt(priorityOrder, 10) || 0) + 1;
                    setPriorityOrder(String(n));
                    setErrors((prev) => ({ ...prev, priorityOrder: '' }));
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center bg-indigo-50 text-indigo-700 transition-colors hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1"
                  aria-label="Increase priority"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
              {errors.priorityOrder && <p className="text-xs text-red-600 shrink-0">{errors.priorityOrder}</p>}
            </div>
          </div>
        </section>
      </div>

      {/* Substores */}
      <section className="rounded-xl border border-pink-100 bg-gradient-to-br from-white to-pink-50/30 p-5 shadow-sm">
        <h3 className="text-xs font-semibold text-pink-600 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-pink-500 rounded-full"></span>
          Substores <span className="text-red-500">*</span>
        </h3>
        {errors.substores && <p className="text-xs text-red-600 mb-2">{errors.substores}</p>}
        <div className="space-y-3 max-w-md">
          <SubstoreMultiPicker
            value={substores}
            options={substoreOptions}
            onChange={(v) => { setSubstores(v); setErrors((prev) => ({ ...prev, substores: '' })); }}
            hasError={!!errors.substores}
          />
          {substores.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {substores.map((sub) => (
                <span
                  key={sub}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-2.5 py-1 text-sm text-indigo-700 shadow-sm"
                >
                  {formatSubstoreForDisplay(sub)}
                  <button
                    type="button"
                    onClick={() => removeSubstore(sub)}
                    className="rounded p-0.5 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                    aria-label={`Remove ${sub}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4">
        {message && (
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${message.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}
        <div className="flex items-center gap-3 ml-auto">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 min-w-[100px] transition-colors shadow-sm"
          >
            Cancel
          </button>
          <Button 
            type="submit" 
            disabled={submitting} 
            className="min-w-[160px] bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
          >
            {submitting ? 'Creating...' : 'Create category'}
          </Button>
        </div>
      </div>
    </form>
  );
}
