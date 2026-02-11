'use client';

import { Minus, Plus } from 'lucide-react';

export interface StepPublishAndOrderProps {
  publish: boolean;
  priorityOrder: string;
  errorPriorityOrder?: string;
  onPublishChange: (v: boolean) => void;
  onPriorityOrderChange: (v: string) => void;
  onClearError: (key: string) => void;
}

export function StepPublishAndOrder({
  publish,
  priorityOrder,
  errorPriorityOrder,
  onPublishChange,
  onPriorityOrderChange,
  onClearError,
}: StepPublishAndOrderProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500 mb-4">Control visibility and sort order for this category.</p>
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={publish}
            onChange={(e) => onPublishChange(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
          />
          <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
            Publish <span className="text-red-500">*</span>
          </span>
        </label>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700 shrink-0">
            Priority order <span className="text-red-500">*</span>
          </label>
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => {
                const n = Math.max(0, parseInt(priorityOrder, 10) - 1);
                onPriorityOrderChange(String(n));
                onClearError('priorityOrder');
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#F4F6F8] text-slate-700 transition-colors hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-1"
              aria-label="Decrease priority"
            >
              <Minus className="w-4 h-4" strokeWidth={2.5} />
            </button>
            <div className="w-px self-stretch bg-slate-200 shrink-0" aria-hidden />
            <input
              id="priorityOrder"
              type="number"
              min={0}
              value={priorityOrder}
              onChange={(e) => {
                onPriorityOrderChange(e.target.value);
                onClearError('priorityOrder');
              }}
              className={`h-8 w-10 shrink-0 border-0 bg-white text-center text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-inset [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${errorPriorityOrder ? 'ring-2 ring-red-400 ring-inset' : ''}`}
            />
            <div className="w-px self-stretch bg-slate-200 shrink-0" aria-hidden />
            <button
              type="button"
              onClick={() => {
                const n = (parseInt(priorityOrder, 10) || 0) + 1;
                onPriorityOrderChange(String(n));
                onClearError('priorityOrder');
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#F4F6F8] text-slate-700 transition-colors hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-1"
              aria-label="Increase priority"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
          {errorPriorityOrder && (
            <p className="text-xs text-red-600 shrink-0">{errorPriorityOrder}</p>
          )}
        </div>
      </div>
    </div>
  );
}
