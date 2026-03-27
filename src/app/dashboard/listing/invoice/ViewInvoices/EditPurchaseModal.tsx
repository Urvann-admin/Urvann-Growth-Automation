'use client';

import { ModalContainer, ModalHeader, ModalFooter, ModalSection } from '../../shared';

export interface EditPurchaseForm {
  billNumber: string;
  productCode: string;
  productName: string;
  quantity: string;
  amount: string;
  parentSku: string;
  seller: string;
  listing: string;
  revival: string;
  growth: string;
  consumers: string;
}

interface EditPurchaseModalProps {
  isOpen: boolean;
  editForm: EditPurchaseForm;
  saving: boolean;
  parentOptions: { value: string; label: string }[];
  sellerOptions: { value: string; label: string }[];
  onClose: () => void;
  onSave: () => void;
  onChange: (form: EditPurchaseForm) => void;
}

export function EditPurchaseModal({
  isOpen,
  editForm,
  saving,
  parentOptions,
  sellerOptions,
  onClose,
  onSave,
  onChange,
}: EditPurchaseModalProps) {
  const inputClass =
    'w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500';

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Edit purchase record" onClose={onClose} />

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6 space-y-6">
          <ModalSection title="Line details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Bill number</span>
                <input
                  type="text"
                  value={editForm.billNumber}
                  onChange={(e) => onChange({ ...editForm, billNumber: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Product code</span>
                <input
                  type="text"
                  value={editForm.productCode}
                  onChange={(e) => onChange({ ...editForm, productCode: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Product name</span>
                <input
                  type="text"
                  value={editForm.productName}
                  onChange={(e) => onChange({ ...editForm, productName: e.target.value })}
                  className={inputClass}
                  placeholder="Optional"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Quantity</span>
                <input
                  type="number"
                  min={0}
                  value={editForm.quantity}
                  onChange={(e) => onChange({ ...editForm, quantity: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Amount</span>
                <input
                  type="number"
                  min={0}
                  value={editForm.amount}
                  onChange={(e) => onChange({ ...editForm, amount: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Parent SKU</span>
                <select
                  value={editForm.parentSku}
                  onChange={(e) => onChange({ ...editForm, parentSku: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select</option>
                  {parentOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Seller</span>
                <select
                  value={editForm.seller}
                  onChange={(e) => onChange({ ...editForm, seller: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select</option>
                  {sellerOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Listing</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editForm.listing}
                  onChange={(e) => onChange({ ...editForm, listing: e.target.value })}
                  className={inputClass}
                  placeholder="Optional"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Revival</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editForm.revival}
                  onChange={(e) => onChange({ ...editForm, revival: e.target.value })}
                  className={inputClass}
                  placeholder="Optional"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Growth</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editForm.growth}
                  onChange={(e) => onChange({ ...editForm, growth: e.target.value })}
                  className={inputClass}
                  placeholder="Optional"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Consumers</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editForm.consumers}
                  onChange={(e) => onChange({ ...editForm, consumers: e.target.value })}
                  className={inputClass}
                  placeholder="Optional"
                />
              </label>
            </div>
          </ModalSection>
        </div>
      </div>

      <ModalFooter onCancel={onClose} onSave={onSave} saving={saving} saveLabel="Save" />
    </ModalContainer>
  );
}
