'use client';

export const inputBase =
  'h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all';
export const textareaBase =
  'min-h-[120px] w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all resize-y';
export const inputError = 'border-red-300 focus:ring-red-500/20 focus:border-red-400';
export const inputNormal = 'border-slate-200 hover:border-slate-300';

export function Field({
  id,
  label,
  required,
  error,
  children,
  className = '',
  layout = 'vertical',
}: {
  id?: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
  /** `horizontal`: label and control on one row (fills width; control flexes). */
  layout?: 'vertical' | 'horizontal';
}) {
  if (layout === 'horizontal') {
    return (
      <div className={className}>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3 w-full min-w-0">
          <label
            htmlFor={id}
            className="text-sm font-medium text-slate-700 sm:w-32 shrink-0 leading-tight"
          >
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <div className="min-w-0 flex-1 w-full">{children}</div>
        </div>
        {error && <p className="mt-1.5 text-xs text-red-600 font-medium sm:pl-[8.75rem]">{error}</p>}
      </div>
    );
  }

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
