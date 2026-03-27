'use client';

export interface StepPublishAndOrderProps {
  publish: boolean;
  onPublishChange: (v: boolean) => void;
}

export function StepPublishAndOrder({ publish, onPublishChange }: StepPublishAndOrderProps) {
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
      </div>
    </div>
  );
}
