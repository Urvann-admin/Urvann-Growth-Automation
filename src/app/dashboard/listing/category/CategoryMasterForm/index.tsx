'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Rule, Category } from '@/models/category';
import { HUB_MAPPINGS, getSubstoresByHub, getSelectedHubsFromSubstores } from '@/shared/constants/hubs';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import {
  STEPS,
  initialFormData,
  type StepId,
  type CategoryFormData,
} from './types';
import { Notification } from '@/components/ui/Notification';
import {
  StepBasics,
  StepHierarchy,
  StepTypeAndRule,
  StepPublishAndOrder,
  StepSubstores,
  StepReview,
} from './steps';

function isDescriptionEmpty(html: string): boolean {
  if (!html || !html.trim()) return true;
  const text = html.replace(/<[^>]*>/g, '').trim();
  return !text;
}

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-|-$/g, '');
}

function validateStep(stepId: StepId, data: CategoryFormData): Record<string, string> {
  const err: Record<string, string> = {};
  switch (stepId) {
    case 'basics':
      if (!data.category.trim()) err.category = 'Name is required';
      if (!data.alias.trim()) err.alias = 'Alias is required';
      if (!data.typeOfCategory.trim()) err.typeOfCategory = 'Type of category is required';
      if (isDescriptionEmpty(data.description)) err.description = 'Description is required';
      break;
    case 'type-rule':
      if (!data.type) err.type = 'Type is required';
      if (data.type === 'Automatic') {
        const valid = data.conditions.filter((c) => String(c.value).trim() !== '');
        if (valid.length === 0)
          err.rule = 'Add at least one condition with a value when Type is Automatic';
      }
      break;
    case 'publish-substores': {
      const order = parseFloat(data.priorityOrder);
      if (Number.isNaN(order) || order < 0)
        err.priorityOrder = 'Enter a valid priority (0 or more, up to one decimal place)';
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
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<CategoryFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const createButtonClickedRef = useRef(false);

  const currentStep = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

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
    const opts = list.map((c) => ({
      value: (c.category ?? c.categoryId ?? '').toString(),
      label: c.category || (c.categoryId ?? ''),
    }));
    return [{ value: '', label: 'None' }, ...opts.filter((o) => o.value)];
  }, [categories]);

  const l2Options = useMemo(() => {
    const list = categories.filter((c) => String(c.typeOfCategory || '').toUpperCase() === 'L2');
    const opts = list.map((c) => ({
      value: (c.category ?? c.categoryId ?? '').toString(),
      label: c.category || (c.categoryId ?? ''),
    }));
    return [{ value: '', label: 'None' }, ...opts.filter((o) => o.value)];
  }, [categories]);

  const l3Options = useMemo(() => {
    const list = categories.filter((c) => String(c.typeOfCategory || '').toUpperCase() === 'L3');
    const opts = list.map((c) => ({
      value: (c.category ?? c.categoryId ?? '').toString(),
      label: c.category || (c.categoryId ?? ''),
    }));
    return [{ value: '', label: 'None' }, ...opts.filter((o) => o.value)];
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
      setStepIndex(0);
      return;
    }
    setSubmitting(true);

    const rule: Rule | undefined =
      data.type === 'Automatic' && data.conditions.length > 0
        ? {
            rule_operator: data.ruleOperator,
            items: data.conditions
              .map((c) => ({
                field: c.field,
                value:
                  typeof c.value === 'string' &&
                  c.value.trim() !== '' &&
                  !Number.isNaN(Number(c.value))
                    ? Number(c.value)
                    : c.value,
              }))
              .filter((c) => c.value !== '' && c.value !== undefined),
          }
        : undefined;

    const payload = {
      category: data.category.trim(),
      alias: data.alias.trim(),
      typeOfCategory: data.typeOfCategory.trim(),
      description: data.description.trim(),
      l1Parent: data.l1Parent.trim(),
      l2Parent: data.l2Parent.trim(),
      l3Parent: data.l3Parent.trim(),
      publish: data.publish,
      type: data.type,
      rule,
      priorityOrder: Math.max(0, Math.round((parseFloat(data.priorityOrder) || 0) * 10) / 10),
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

  const addCondition = () => {
    setData((prev) => ({
      ...prev,
      conditions: [...prev.conditions, { field: 'Plant', value: '' }],
    }));
  };

  const removeCondition = (index: number) => {
    setData((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const updateCondition = (
    index: number,
    updates: Partial<{ field: CategoryFormData['conditions'][number]['field']; value: string }>
  ) => {
    setData((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c, i) =>
        i === index ? { ...c, ...updates } : c
      ),
    }));
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
              const isCompleted = i < stepIndex;
              const isCurrent = i === stepIndex;
              return (
                <div
                  key={step.id}
                  className="flex flex-col items-center flex-1 min-w-0"
                >
                  <div
                    className={`flex items-center justify-center rounded-full w-10 h-10 text-sm font-semibold shrink-0 transition-colors ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 ring-offset-2'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    {isCompleted ? <Check className="w-5 h-5" strokeWidth={2.5} /> : i + 1}
                  </div>
                  <span
                    className={`text-xs font-medium mt-1.5 text-center truncate w-full max-w-[4.5rem] sm:max-w-none ${
                      isCurrent ? 'text-slate-900' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
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
            conditions={data.conditions}
            errors={errors}
            onTypeChange={(v) => setField('type', v)}
            onRuleOperatorChange={(v) => setField('ruleOperator', v)}
            onAddCondition={addCondition}
            onRemoveCondition={removeCondition}
            onUpdateCondition={updateCondition}
            onClearError={clearError}
          />
        )}
        {currentStep.id === 'publish-substores' && (
          <div className="space-y-6">
            <StepPublishAndOrder
              publish={data.publish}
              priorityOrder={data.priorityOrder}
              errorPriorityOrder={errors.priorityOrder}
              onPublishChange={(v) => setField('publish', v)}
              onPriorityOrderChange={(v) => setField('priorityOrder', v)}
              onClearError={clearError}
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
        {currentStep.id === 'review' && <StepReview data={data} />}
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
              disabled={submitting}
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
