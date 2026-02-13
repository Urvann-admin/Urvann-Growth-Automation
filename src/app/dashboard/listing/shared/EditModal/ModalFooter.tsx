'use client';

interface ModalFooterProps {
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  saveLabel?: string;
  cancelLabel?: string;
}

export function ModalFooter({
  onCancel,
  onSave,
  saving,
  saveLabel = 'Save changes',
  cancelLabel = 'Cancel',
}: ModalFooterProps) {
  return (
    <div className="shrink-0 flex justify-end gap-3 border-t border-slate-200 bg-slate-50/80 px-6 py-4 rounded-b-xl">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {saving ? (
          <span className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Saving...
          </span>
        ) : (
          saveLabel
        )}
      </button>
    </div>
  );
}
