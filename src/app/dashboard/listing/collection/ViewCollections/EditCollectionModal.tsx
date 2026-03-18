'use client';

import { X } from 'lucide-react';
import { ModalContainer, ModalHeader, ModalFooter, ModalSection } from '../../shared';
import { CustomSelect } from '../../components/CustomSelect';
import { SubstoreMultiPicker } from '@/app/dashboard/listing/category/CategoryMasterForm/shared/SubstoreMultiPicker';
import { HUB_MAPPINGS, getSubstoresByHub, getSelectedHubsFromSubstores } from '@/shared/constants/hubs';

const DEFAULT_SORT_OPTIONS = [
  { value: 'Manually', label: 'Manually' },
  { value: 'Alphabetically: A-Z', label: 'Alphabetically: A-Z' },
  { value: 'Alphabetically: Z-A', label: 'Alphabetically: Z-A' },
  { value: 'By price: Highest to lowest', label: 'By price: Highest to lowest' },
  { value: 'By price: Lowest to highest', label: 'By price: Lowest to highest' },
  { value: 'By date: Oldest to newest', label: 'By date: Oldest to newest' },
  { value: 'By date: Newest to oldest', label: 'By date: Newest to oldest' },
  { value: 'By best seller', label: 'By best seller' },
];

export interface EditCollectionForm {
  name: string;
  type: string;
  publish: number;
  description: string;
  default_sort_order: string;
  substore: string[];
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
                  label="Type"
                  value={editForm.type}
                  onChange={(v) => onChange({ ...editForm, type: v })}
                  options={[
                    { value: 'manual', label: 'manual' },
                    { value: 'dynamic', label: 'dynamic' },
                  ]}
                  searchable={false}
                  placeholder="Choose..."
                />
              </div>
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
              <div className="block sm:col-span-2">
                <CustomSelect
                  label="Default sort order"
                  value={editForm.default_sort_order}
                  onChange={(v) =>
                    onChange({ ...editForm, default_sort_order: v })
                  }
                  options={DEFAULT_SORT_OPTIONS}
                  searchable={true}
                  placeholder="Choose..."
                />
              </div>
              <div className="block sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Substore
                </label>
                <SubstoreMultiPicker
                  value={editForm.substore}
                  options={HUB_MAPPINGS.map((m) => ({ value: m.hub, label: m.hub }))}
                  onChange={(v) => onChange({ ...editForm, substore: v })}
                  optionToSubstores={getSubstoresByHub}
                />
                {getSelectedHubsFromSubstores(editForm.substore).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {getSelectedHubsFromSubstores(editForm.substore).map((hub) => (
                      <span
                        key={hub}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F4F6F8] px-2.5 py-1 text-sm text-slate-800"
                      >
                        {hub}
                        <button
                          type="button"
                          onClick={() => {
                            const toRemove = getSubstoresByHub(hub);
                            onChange({
                              ...editForm,
                              substore: editForm.substore.filter(
                                (s) => !toRemove.includes(s)
                              ),
                            });
                          }}
                          className="rounded p-0.5 text-slate-400 hover:bg-slate-200"
                          aria-label={`Remove ${hub}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
