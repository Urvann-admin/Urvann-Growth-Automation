'use client';

import { getSelectedHubsFromSubstores } from '@/shared/constants/hubs';
import type { CategoryFormData, FormRuleItem } from '../types';

export interface StepReviewProps {
  data: CategoryFormData;
  /** When present, rows for these keys show a red border and error message */
  errors?: Record<string, string>;
}

function Row({
  label,
  value,
  errorKey,
  errors,
}: {
  label: string;
  value: React.ReactNode;
  errorKey?: string;
  errors?: Record<string, string>;
}) {
  const error = errorKey && errors?.[errorKey];
  return (
    <div
      className={`flex flex-wrap gap-2 py-2 border-b border-slate-100 last:border-0 rounded-lg px-2 -mx-2 ${
        error ? 'border-2 border-red-400 bg-red-50/50' : ''
      }`}
    >
      <dt className="text-sm font-medium text-slate-500 min-w-[10rem] shrink-0">{label}</dt>
      <dd className="text-sm text-slate-900 flex-1">{value ?? '—'}</dd>
      {error && (
        <dd className="text-sm text-red-600 w-full mt-1 min-w-0">
          {error}
        </dd>
      )}
    </div>
  );
}

function ruleItemsSummary(items: FormRuleItem[], op: string): string {
  const parts: string[] = [];
  for (const item of items) {
    if ('field' in item) {
      const v = String((item as { value: string }).value).trim();
      if (v) parts.push(`${item.field}: ${v}`);
    } else {
      const nested = ruleItemsSummary(item.items, item.rule_operator);
      if (nested) parts.push(`(${nested})`);
    }
  }
  return parts.join(` ${op} `);
}

export function StepReview({ data, errors }: StepReviewProps) {
  const selectedHubs = getSelectedHubsFromSubstores(data.substores);
  const conditionsSummary =
    data.type === 'Automatic' && data.ruleItems.length > 0
      ? ruleItemsSummary(data.ruleItems, data.ruleOperator)
      : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-600 mb-6">
        Please review your category details below. Click &quot;Create category&quot; to submit.
        {errors && Object.keys(errors).length > 0 && (
          <span className="block mt-2 text-red-600 font-medium">
            Please fix the fields marked in red before saving.
          </span>
        )}
      </p>
      <dl className="space-y-0">
        <Row label="Name" value={data.category || '—'} errorKey="category" errors={errors} />
        <Row label="Alias" value={data.alias || '—'} errorKey="alias" errors={errors} />
        <Row
          label="Type of category"
          value={data.typeOfCategory || '—'}
          errorKey="typeOfCategory"
          errors={errors}
        />
        <Row label="Description" value={data.description || '—'} />
        <Row label="L1 parent" value={data.l1Parent || '—'} />
        <Row label="L2 parent" value={data.l2Parent || '—'} />
        <Row label="L3 parent" value={data.l3Parent || '—'} />
        <Row label="Type" value={data.type} errorKey="type" errors={errors} />
        {data.type === 'Automatic' && (
          <Row
            label="Conditions"
            value={conditionsSummary || '—'}
            errorKey="rule"
            errors={errors}
          />
        )}
        <Row label="Publish" value={data.publish ? 'Yes' : 'No'} />
        <Row label="Priority order" value="10" />
        <Row
          label="Hubs"
          errorKey="substores"
          errors={errors}
          value={
            selectedHubs.length > 0 ? (
              <span className="flex flex-wrap gap-1.5">
                {selectedHubs.map((hub) => (
                  <span
                    key={hub}
                    className="inline-flex rounded-lg border border-slate-200 bg-[#F4F6F8] px-2 py-0.5 text-xs text-slate-800"
                  >
                    {hub}
                  </span>
                ))}
              </span>
            ) : (
              '—'
            )
          }
        />
      </dl>
    </div>
  );
}
