'use client';

import { formatSubstoreForDisplay } from '@/shared/constants/hubs';
import type { CategoryFormData } from '../types';

export interface StepReviewProps {
  data: CategoryFormData;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 py-2 border-b border-slate-100 last:border-0">
      <dt className="text-sm font-medium text-slate-500 min-w-[10rem] shrink-0">{label}</dt>
      <dd className="text-sm text-slate-900">{value ?? '—'}</dd>
    </div>
  );
}

export function StepReview({ data }: StepReviewProps) {
  const conditionsSummary =
    data.type === 'Automatic' && data.conditions.length > 0
      ? data.conditions
          .filter((c) => String(c.value).trim() !== '')
          .map((c) => `${c.field}: ${c.value}`)
          .join(` ${data.ruleOperator} `)
      : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-600 mb-6">
        Please review your category details below. Click &quot;Create category&quot; to submit.
      </p>
      <dl className="space-y-0">
        <Row label="Name" value={data.category || '—'} />
        <Row label="Alias" value={data.alias || '—'} />
        <Row label="Type of category" value={data.typeOfCategory || '—'} />
        <Row label="Description" value={data.description || '—'} />
        <Row label="L1 parent" value={data.l1Parent || 'None'} />
        <Row label="L2 parent" value={data.l2Parent || 'None'} />
        <Row label="L3 parent" value={data.l3Parent || 'None'} />
        <Row label="Type" value={data.type} />
        {data.type === 'Automatic' && conditionsSummary && (
          <Row label="Conditions" value={conditionsSummary} />
        )}
        <Row label="Publish" value={data.publish ? 'Yes' : 'No'} />
        <Row label="Priority order" value={data.priorityOrder} />
        <Row
          label="Substores"
          value={
            data.substores.length > 0 ? (
              <span className="flex flex-wrap gap-1.5">
                {data.substores.map((s) => (
                  <span
                    key={s}
                    className="inline-flex rounded-lg border border-slate-200 bg-[#F4F6F8] px-2 py-0.5 text-xs text-slate-800"
                  >
                    {formatSubstoreForDisplay(s)}
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
