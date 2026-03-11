'use client';

import { ModalContainer, ModalHeader, ModalFooter, ModalSection } from '../../shared';

export type AllocationMethod = 'Equal' | 'Manual' | 'quantity' | 'value';

export interface OverheadFormState {
  overheadAmount: string;
  overheadNature: string;
  bill: string;
  allocationMethod: AllocationMethod;
}

interface OverheadModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: OverheadFormState;
  onChange: (form: OverheadFormState) => void;
  onApply: () => void;
  saving: boolean;
  rowCount: number;
  manualAmounts: number[];
  onManualAmountChange: (index: number, value: number) => void;
  manualTotalError: string | null;
  /** When true, hide the Bill reference field (e.g. when bill is known from context, e.g. import) */
  hideBillField?: boolean;
}

export function OverheadModal({
  isOpen,
  onClose,
  form,
  onChange,
  onApply,
  saving,
  rowCount,
  manualAmounts,
  onManualAmountChange,
  manualTotalError,
  hideBillField = false,
}: OverheadModalProps) {
  const inputClass =
    'w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500';

  const overheadNum = form.overheadAmount.trim() !== '' ? Number(form.overheadAmount) : 0;
  const isManual = form.allocationMethod === 'Manual';

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Add overhead" onClose={onClose} />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <ModalSection title="Overhead details">
          <div className="space-y-4">
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Overhead amount</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.overheadAmount}
                onChange={(e) => onChange({ ...form, overheadAmount: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Overhead nature</span>
              <input
                type="text"
                value={form.overheadNature}
                onChange={(e) => onChange({ ...form, overheadNature: e.target.value })}
                className={inputClass}
                placeholder="e.g. Freight"
              />
            </label>
            {!hideBillField && (
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1">Bill</span>
                <input
                  type="text"
                  value={form.bill}
                  onChange={(e) => onChange({ ...form, bill: e.target.value })}
                  className={inputClass}
                  placeholder="Bill reference"
                />
              </label>
            )}
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Allocation</span>
              <select
                value={form.allocationMethod}
                onChange={(e) =>
                  onChange({ ...form, allocationMethod: e.target.value as AllocationMethod })
                }
                className={inputClass}
              >
                <option value="Equal">Equal</option>
                <option value="Manual">Manual</option>
                <option value="quantity">Quantity (proportional to quantity)</option>
                <option value="value">Value (proportional to amount)</option>
              </select>
            </label>
          </div>
        </ModalSection>
        {isManual && rowCount > 0 && (
          <ModalSection title="Allocated amount per line">
            <p className="text-sm text-slate-600 mb-2">
              Enter amount for each of the {rowCount} line(s). Sum must equal overhead amount (
              {overheadNum}).
            </p>
            {manualTotalError && (
              <p className="text-sm text-red-600 mb-2">{manualTotalError}</p>
            )}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {manualAmounts.map((val, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 w-20">Line {i + 1}</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={val}
                    onChange={(e) =>
                      onManualAmountChange(i, Math.max(0, Number(e.target.value) || 0))
                    }
                    className={`${inputClass} flex-1`}
                  />
                </div>
              ))}
            </div>
          </ModalSection>
        )}
      </div>
      <ModalFooter
        onCancel={onClose}
        onSave={onApply}
        saving={saving}
        saveLabel="Apply overhead"
      />
    </ModalContainer>
  );
}
