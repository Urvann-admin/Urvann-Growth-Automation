'use client';

import { ModalContainer, ModalHeader, ModalFooter, ModalSection } from '../../shared';

export interface EditSellerForm {
  seller_name: string;
  place: string;
  multiplicationFactor: string;
  billNo: string;
  phoneNumber: string;
}

interface EditSellerModalProps {
  isOpen: boolean;
  title: string;
  editForm: EditSellerForm;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (form: EditSellerForm) => void;
}

export function EditSellerModal({
  isOpen,
  title,
  editForm,
  saving,
  onClose,
  onSave,
  onChange,
}: EditSellerModalProps) {
  const inputClass =
    'w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-shadow';

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose}>
      <ModalHeader title={title} onClose={onClose} />

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6 space-y-6">
          <ModalSection title="Seller information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block sm:col-span-2">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">
                  Seller name
                </span>
                <input
                  type="text"
                  value={editForm.seller_name}
                  onChange={(e) =>
                    onChange({ ...editForm, seller_name: e.target.value })
                  }
                  className={inputClass}
                  placeholder="Seller name"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">
                  Place
                </span>
                <input
                  type="text"
                  value={editForm.place}
                  onChange={(e) =>
                    onChange({ ...editForm, place: e.target.value })
                  }
                  className={inputClass}
                  placeholder="Place"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">
                  Multiplication factor
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editForm.multiplicationFactor}
                  onChange={(e) =>
                    onChange({
                      ...editForm,
                      multiplicationFactor: e.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="0"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">
                  Bill no.
                </span>
                <input
                  type="text"
                  value={editForm.billNo}
                  onChange={(e) =>
                    onChange({ ...editForm, billNo: e.target.value })
                  }
                  className={inputClass}
                  placeholder="Bill number"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">
                  Phone number
                </span>
                <input
                  type="text"
                  value={editForm.phoneNumber}
                  onChange={(e) =>
                    onChange({ ...editForm, phoneNumber: e.target.value })
                  }
                  className={inputClass}
                  placeholder="Phone number"
                />
              </label>
            </div>
          </ModalSection>
        </div>
      </div>

      <ModalFooter
        onCancel={onClose}
        onSave={onSave}
        saving={saving}
        saveLabel="Save"
      />
    </ModalContainer>
  );
}
