'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Rule, Category } from '@/models/category';
import { HUB_MAPPINGS, getSubstoresByHub, getSelectedHubsFromSubstores } from '@/shared/constants/hubs';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import {
  clearFormStorageOnReload,
  getPersistedForm,
  setPersistedForm,
  removePersistedForm,
} from '../../hooks/useFormPersistence';
import {
  STEPS,
  initialFormData,
  type StepId,
  type CategoryFormData,
  type FormRuleItem,
  type RuleConditionField,
} from './types';
import { Notification } from '@/components/ui/Notification';

const FORM_STORAGE_KEY = 'listing_form_category';
import {
  StepBasics,
  StepHierarchy,
  StepTypeAndRule,
  StepPublishAndOrder,
  StepSubstores,
  StepReview,
} from './steps';

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-|-$/g, '');
}

function hasConditionWithValue(items: FormRuleItem[]): boolean {
  for (const item of items) {
    if ('field' in item) {
      if (String((item as { value: string }).value).trim() !== '') return true;
    } else {
      if (hasConditionWithValue(item.items)) return true;
    }
  }
  return false;
}

function formRuleItemsToRuleItems(
  items: FormRuleItem[]
): Rule['items'] {
  return items
    .map((item): Rule['items'][number] => {
      if ('field' in item) {
        const cond = item as { field: string; value: string };
        const v = cond.value?.trim();
        const num = Number(v);
        const value =
          v !== '' && !Number.isNaN(num) ? num : (v as string | number);
        return { field: cond.field as RuleConditionField, value };
      }
      return {
        rule_operator: item.rule_operator,
        items: formRuleItemsToRuleItems(item.items),
      };
    })
    .filter((i) => {
      if ('field' in i) return i.value !== '' && i.value !== undefined;
      return (i as Rule).items.length > 0;
    });
}

function getListAtPath(items: FormRuleItem[], path: number[]): FormRuleItem[] {
  if (path.length === 0) return items;
  const [i, ...rest] = path;
  const parent = items[i];
  if (!parent || !('items' in parent)) return items;
  return getListAtPath(parent.items, rest);
}

function setListAtPath(
  items: FormRuleItem[],
  path: number[],
  newList: FormRuleItem[]
): FormRuleItem[] {
  if (path.length === 0) return newList;
  const [i, ...rest] = path;
  const parent = { ...items[i] } as { rule_operator: 'AND' | 'OR'; items: FormRuleItem[] };
  parent.items = setListAtPath(parent.items, rest, newList);
  const next = [...items];
  next[i] = parent;
  return next;
}

function removeAtPath(items: FormRuleItem[], path: number[]): FormRuleItem[] {
  if (path.length === 1) {
    return items.filter((_, i) => i !== path[0]);
  }
  const [i, ...rest] = path;
  const parent = items[i] as { rule_operator: 'AND' | 'OR'; items: FormRuleItem[] } | undefined;
  if (!parent || !('items' in parent)) return items;
  return items.map((it, idx) =>
    idx === i ? { ...parent, items: removeAtPath(parent.items, rest) } : it
  ) as FormRuleItem[];
}

function appendToPath(
  items: FormRuleItem[],
  path: number[],
  item: FormRuleItem
): FormRuleItem[] {
  const list = getListAtPath(items, path);
  const newList = [...list, item];
  return setListAtPath(items, path, newList);
}

function getItemAtPath(items: FormRuleItem[], path: number[]): FormRuleItem | null {
  if (path.length === 0) return null;
  if (path.length === 1) return items[path[0]] ?? null;
  const [i, ...rest] = path;
  const parent = items[i];
  if (!parent || !('items' in parent)) return null;
  return getItemAtPath(parent.items, rest);
}

function setItemAtPath(
  items: FormRuleItem[],
  path: number[],
  newItem: FormRuleItem
): FormRuleItem[] {
  if (path.length === 1) {
    const next = [...items];
    next[path[0]] = newItem;
    return next;
  }
  const [i, ...rest] = path;
  const parent = items[i] as { rule_operator: 'AND' | 'OR'; items: FormRuleItem[] } | undefined;
  if (!parent || !('items' in parent)) return items;
  return items.map((it, idx) =>
    idx === i ? { ...parent, items: setItemAtPath(parent.items, rest, newItem) } : it
  ) as FormRuleItem[];
}

function validateStep(stepId: StepId, data: CategoryFormData): Record<string, string> {
  const err: Record<string, string> = {};
  switch (stepId) {
    case 'basics':
      if (!data.category.trim()) err.category = 'Name is required';
      if (!data.alias.trim()) err.alias = 'Alias is required';
      if (!data.typeOfCategory.trim()) err.typeOfCategory = 'Type of category is required';
      break;
    case 'type-rule':
      if (!data.type) err.type = 'Type is required';
      if (data.type === 'Automatic') {
        if (!hasConditionWithValue(data.ruleItems))
          err.rule = 'Add at least one condition with a value when Type is Automatic';
      }
      break;
    case 'publish-substores': {
      if (data.substores.length === 0) err.substores = 'Select at least one hub';
      break;
    }
    case 'review':
      break;
    default:
      break;
  }
  return err;
}

export function CategoryMasterForm() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(() => {
    clearFormStorageOnReload(FORM_STORAGE_KEY);
    const saved = getPersistedForm<{ data: CategoryFormData; stepIndex: number }>(FORM_STORAGE_KEY);
    return saved?.stepIndex ?? 0;
  });
  const [data, setData] = useState<CategoryFormData>(() => {
    const saved = getPersistedForm<{ data: CategoryFormData & { conditions?: { field: string; value: string }[] }; stepIndex: number }>(FORM_STORAGE_KEY);
    const d = saved?.data ?? initialFormData;
    if (d && 'conditions' in d && Array.isArray((d as any).conditions) && !('ruleItems' in d && Array.isArray((d as any).ruleItems))) {
      return { ...d, ruleItems: (d as any).conditions, conditions: undefined } as CategoryFormData;
    }
    return d as CategoryFormData;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const createButtonClickedRef = useRef(false);

  const currentStep = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  // Full validation for Review step: used to show errors on review and disable save
  const allValidationErrors = useMemo(() => {
    const all: Record<string, string> = {};
    STEPS.forEach((s) => Object.assign(all, validateStep(s.id, data)));
    return all;
  }, [data]);
  const hasValidationErrors = Object.keys(allValidationErrors).length > 0;

  // Step is completed only when its validation passes (not just visited)
  const stepCompleted = useMemo(
    () => STEPS.map((step) => Object.keys(validateStep(step.id, data)).length === 0),
    [data]
  );

  const fetchCategories = useCallback(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) {
          setCategories(json.data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPersistedForm(FORM_STORAGE_KEY, { data, stepIndex });
  }, [data, stepIndex]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Refetch when user opens Hierarchy step so L1/L2/L3 dropdowns show latest categories
  useEffect(() => {
    if (currentStep.id === 'hierarchy') {
      fetchCategories();
    }
  }, [currentStep.id, fetchCategories]);

  const hubOptions = useMemo(
    () => HUB_MAPPINGS.map((m) => ({ value: m.hub, label: m.hub })),
    []
  );

  const l1Options = useMemo(() => {
    const list = categories.filter((c) => String(c.typeOfCategory || '').toUpperCase() === 'L1');
    return list.map((c) => ({
      value: (c.category ?? c.categoryId ?? '').toString(),
      label: c.category || (c.categoryId ?? ''),
    })).filter((o) => o.value);
  }, [categories]);

  const l2Options = useMemo(() => {
    const list = categories.filter((c) => String(c.typeOfCategory || '').toUpperCase() === 'L2');
    return list.map((c) => ({
      value: (c.category ?? c.categoryId ?? '').toString(),
      label: c.category || (c.categoryId ?? ''),
    })).filter((o) => o.value);
  }, [categories]);

  const l3Options = useMemo(() => {
    const list = categories.filter((c) => String(c.typeOfCategory || '').toUpperCase() === 'L3');
    return list.map((c) => ({
      value: (c.category ?? c.categoryId ?? '').toString(),
      label: c.category || (c.categoryId ?? ''),
    })).filter((o) => o.value);
  }, [categories]);

  const setField = <K extends keyof CategoryFormData>(key: K, value: CategoryFormData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const clearError = (key: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const goNext = async () => {
    const stepErrors = validateStep(currentStep.id, data);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    // On Basics step, ensure alias is unique in our database before proceeding
    if (currentStep.id === 'basics' && data.alias.trim()) {
      try {
        const res = await fetch(`/api/categories/check-alias?alias=${encodeURIComponent(data.alias.trim())}`);
        const json = await res.json();
        if (json?.success && json.exists) {
          setErrors((prev) => ({ ...prev, alias: 'A category with this alias already exists.' }));
          return;
        }
      } catch {
        setErrors((prev) => ({ ...prev, alias: 'Could not verify alias. Please try again.' }));
        return;
      }
    }
    setErrors({});
    // When moving from Basics to Hierarchy, keep parent dropdowns empty by default
    if (currentStep.id === 'basics') {
      setData((prev) => ({
        ...prev,
        l1Parent: '',
        l2Parent: '',
        l3Parent: '',
      }));
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setErrors({});
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Only create when user is on Review step and has clicked "Create category" (not e.g. Enter key)
    if (currentStep.id !== 'review') return;
    if (!createButtonClickedRef.current) return;
    createButtonClickedRef.current = false;
    setMessage(null);
    const allErrors: Record<string, string> = {};
    STEPS.forEach((s) => {
      Object.assign(allErrors, validateStep(s.id, data));
    });
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      // Stay on Review step so user sees red boundaries and can fix or jump to step
      return;
    }
    setSubmitting(true);

    const ruleItemsConverted = formRuleItemsToRuleItems(data.ruleItems);
    const rule: Rule | undefined =
      data.type === 'Automatic' && ruleItemsConverted.length > 0
        ? { rule_operator: data.ruleOperator, items: ruleItemsConverted }
        : undefined;

    const typeUpper = String(data.typeOfCategory || '').toUpperCase();
    const isL1 = typeUpper === 'L1';
    const isL2 = typeUpper === 'L2';
    const payload = {
      category: data.category.trim(),
      alias: data.alias.trim(),
      typeOfCategory: data.typeOfCategory.trim(),
      description: (data.description || '').trim(),
      l1Parent: isL1 ? '' : data.l1Parent.trim(),
      l2Parent: isL1 || isL2 ? '' : data.l2Parent.trim(),
      l3Parent: isL1 || isL2 ? '' : data.l3Parent.trim(),
      publish: data.publish,
      type: data.type,
      rule,
      // priorityOrder is set to 10 by default in the backend
      substores: data.substores,
    };

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: resData.message || 'Failed to create category' });
        setSubmitting(false);
        return;
      }

      removePersistedForm(FORM_STORAGE_KEY);
      setMessage({ type: 'success', text: 'Category created successfully.' });
      setData(initialFormData);
      setErrors({});
      setStepIndex(0);
      fetchCategories();
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const addCondition = (path: number[]) => {
    setData((prev) => ({
      ...prev,
      ruleItems: appendToPath(prev.ruleItems, path, { field: 'Plant', value: '' }),
    }));
  };

  const addGroup = (path: number[]) => {
    setData((prev) => ({
      ...prev,
      ruleItems: appendToPath(prev.ruleItems, path, {
        rule_operator: 'AND',
        items: [{ field: 'Plant', value: '' }],
      }),
    }));
  };

  const removeRuleItem = (path: number[]) => {
    setData((prev) => ({
      ...prev,
      ruleItems: removeAtPath(prev.ruleItems, path),
    }));
  };

  const updateRuleItem = (
    path: number[],
    updates: Partial<{ field: RuleConditionField; value: string }> | { rule_operator: 'AND' | 'OR' }
  ) => {
    setData((prev) => {
      const current = getItemAtPath(prev.ruleItems, path);
      if (!current) return prev;
      const newItem: FormRuleItem =
        'field' in current
          ? { ...current, ...(updates as Partial<{ field: RuleConditionField; value: string }>) }
          : { ...current, ...('rule_operator' in updates ? { rule_operator: updates.rule_operator } : {}) };
      return {
        ...prev,
        ruleItems: setItemAtPath(prev.ruleItems, path, newItem),
      };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        {/* Step tracker – horizontal with connecting line (only between circles) */}
        <div className="mt-6 relative">
          {/* Gray track: from center of first circle to center of last circle only */}
          <div
            className="absolute top-5 h-0.5 bg-slate-200 rounded-full"
            style={{
              left: `${100 / (STEPS.length * 2)}%`,
              width: `${(100 * (STEPS.length - 1)) / STEPS.length}%`,
            }}
            aria-hidden
          />
          {/* Green progress: from first circle to current step */}
          <div
            className="absolute top-5 h-0.5 bg-emerald-500 rounded-full transition-all duration-300 ease-out"
            style={{
              left: `${100 / (STEPS.length * 2)}%`,
              width:
                stepIndex === 0
                  ? '0%'
                  : `${(100 * (STEPS.length - 1)) / STEPS.length * (stepIndex / (STEPS.length - 1))}%`,
            }}
            aria-hidden
          />
          <div className="relative flex justify-between px-2">
            {STEPS.map((step, i) => {
              // Only mark a step completed if user has moved past it AND its validation passes
              const isPast = i < stepIndex;
              const isCompleted = isPast && stepCompleted[i];
              const hasStepError = isPast && !stepCompleted[i];
              const isCurrent = i === stepIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setStepIndex(i)}
                  className="flex flex-col items-center flex-1 min-w-0 cursor-pointer bg-transparent border-0 p-0 text-left"
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Go to step ${i + 1}: ${step.label}`}
                >
                  <div
                    className={`flex items-center justify-center rounded-full w-10 h-10 text-sm font-semibold shrink-0 transition-colors ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : hasStepError
                        ? 'bg-red-500 text-white'
                        : isCurrent
                        ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 ring-offset-2'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" strokeWidth={2.5} /> : i + 1}
                  </div>
                  <span
                    className={`text-xs font-medium mt-1.5 text-center truncate w-full max-w-[4.5rem] sm:max-w-none block ${
                      isCurrent
                        ? 'text-slate-900'
                        : isCompleted
                        ? 'text-slate-700'
                        : hasStepError
                        ? 'text-red-500'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current step content */}
      <div className="min-h-[200px]">
        {currentStep.id === 'basics' && (
          <StepBasics
            category={data.category}
            alias={data.alias}
            typeOfCategory={data.typeOfCategory}
            description={data.description}
            errors={errors}
            onCategoryChange={(v) =>
              setData((prev) => ({
                ...prev,
                category: v,
                alias: slugify(v),
              }))
            }
            onAliasChange={(v) => setField('alias', v)}
            onTypeOfCategoryChange={(v) => setField('typeOfCategory', v)}
            onDescriptionChange={(v) => setField('description', v)}
            onClearError={clearError}
          />
        )}
        {currentStep.id === 'hierarchy' && (
          <StepHierarchy
            typeOfCategory={data.typeOfCategory}
            l1Parent={data.l1Parent}
            l2Parent={data.l2Parent}
            l3Parent={data.l3Parent}
            l1Options={l1Options}
            l2Options={l2Options}
            l3Options={l3Options}
            onL1ParentChange={(v) => setField('l1Parent', v)}
            onL2ParentChange={(v) => setField('l2Parent', v)}
            onL3ParentChange={(v) => setField('l3Parent', v)}
          />
        )}
        {currentStep.id === 'type-rule' && (
          <StepTypeAndRule
            type={data.type}
            ruleOperator={data.ruleOperator}
            ruleItems={data.ruleItems}
            errors={errors}
            onTypeChange={(v) => setField('type', v)}
            onRuleOperatorChange={(v) => setField('ruleOperator', v)}
            onAddCondition={addCondition}
            onAddGroup={addGroup}
            onRemoveRuleItem={removeRuleItem}
            onUpdateRuleItem={updateRuleItem}
            onClearError={clearError}
          />
        )}
        {currentStep.id === 'publish-substores' && (
          <div className="space-y-6">
            <StepPublishAndOrder
              publish={data.publish}
              onPublishChange={(v) => setField('publish', v)}
            />
            <StepSubstores
              substores={data.substores}
              hubOptions={hubOptions}
              getSubstoresByHub={getSubstoresByHub}
              getSelectedHubsFromSubstores={getSelectedHubsFromSubstores}
              error={errors.substores}
              onChange={(v) => setField('substores', v)}
              onRemoveHub={(hub) => {
                const toRemove = getSubstoresByHub(hub);
                setData((prev) => ({
                  ...prev,
                  substores: prev.substores.filter((s) => !toRemove.includes(s.toLowerCase())),
                }));
              }}
              onClearError={() => clearError('substores')}
            />
          </div>
        )}
        {currentStep.id === 'review' && (
          <StepReview data={data} errors={hasValidationErrors ? allValidationErrors : undefined} />
        )}
      </div>

      {message && (
        <Notification
          type={message.type}
          text={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}

      {/* Navigation & actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-3 ml-auto">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 min-w-[100px] transition-colors shadow-sm"
          >
            Cancel
          </button>
          {!isFirst && (
            <button
              type="button"
              onClick={goBack}
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          {isLast ? (
            <button
              type="submit"
              disabled={submitting || hasValidationErrors}
              onClick={() => { createButtonClickedRef.current = true; }}
              className="min-w-[160px] rounded-lg bg-[#E6007A] hover:bg-pink-600 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? 'Creating...' : 'Create category'}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="rounded-lg bg-[#E6007A] hover:bg-pink-600 px-5 py-2.5 text-sm font-medium text-white shadow-md flex items-center gap-1.5"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
