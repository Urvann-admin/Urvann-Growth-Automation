'use client';

import { ModalContainer, ModalHeader, ModalFooter, ModalSection } from '../../shared';
import { CustomSelect } from '../../components/CustomSelect';

export interface EditCollectionForm {
  name: string;
  publish: number;
  description: string;
}

interface EditCollectionModalProps {
  isOpen: boolean;
  title: string;
  editForm: EditCollectionForm;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (form: EditCollectionForm) => void;
}

export function EditCollectionModal({
  isOpen,
  title,
  editForm,
  saving,
  onClose,
  onSave,
  onChange,
}: EditCollectionModalProps) {
  const inputClass =
    'w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-shadow';

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose}>
      <ModalHeader title={title} onClose={onClose} />

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6 space-y-6">
          <ModalSection title="Collection information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block sm:col-span-2">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">
                  Name
                </span>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    onChange({ ...editForm, name: e.target.value })
                  }
                  className={inputClass}
                  placeholder="Collection name"
                />
              </label>
              <div className="block">
                <CustomSelect
                  label="Publish"
                  value={String(editForm.publish)}
                  onChange={(v) =>
                    onChange({ ...editForm, publish: Number(v) })
                  }
                  options={[
                    { value: '0', label: '0' },
                    { value: '1', label: '1' },
                  ]}
                  searchable={false}
                  placeholder="Choose..."
                />
              </div>
              <label className="block sm:col-span-2">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description (optional)
                </span>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    onChange({ ...editForm, description: e.target.value })
                  }
                  className={`${inputClass} min-h-[80px] py-3`}
                  placeholder="Optional description"
                  rows={3}
                />
              </label>
            </div>
          </ModalSection>
        </div>
      </div>

      <ModalFooter
        onCancel={onClose}
        onSave={onSave}
        saveLabel="Save"
        saving={saving}
      />
    </ModalContainer>
  );
}
