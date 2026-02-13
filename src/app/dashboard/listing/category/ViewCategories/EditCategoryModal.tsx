'use client';

import { HUB_MAPPINGS } from '@/shared/constants/hubs';
import { SubstoreMultiPicker } from '../CategoryMasterForm/shared';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { ModalContainer, ModalHeader, ModalFooter, ModalSection } from '../../shared';

interface EditCategoryForm {
  category: string;
  alias: string;
  typeOfCategory: string;
  description: string;
  l1Parent: string;
  l2Parent: string;
  l3Parent: string;
  publish: boolean;
  priorityOrder: string;
  type: string;
  substores: string[];
}

interface EditCategoryModalProps {
  isOpen: boolean;
  editForm: EditCategoryForm;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (form: EditCategoryForm) => void;
}

export function EditCategoryModal({
  isOpen,
  editForm,
  saving,
  onClose,
  onSave,
  onChange,
}: EditCategoryModalProps) {
  const hubOptions = HUB_MAPPINGS.map((m) => ({ value: m.hub, label: m.hub }));

  const inputClass =
    'w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-shadow';

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Edit category" onClose={onClose} />

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6 space-y-6">
          <ModalSection title="Basic Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Category Name</span>
                <input
                  type="text"
                  value={editForm.category}
                  onChange={(e) => onChange({ ...editForm, category: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Alias</span>
                <input
                  type="text"
                  value={editForm.alias}
                  onChange={(e) => onChange({ ...editForm, alias: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Type</span>
                <select
                  value={editForm.typeOfCategory}
                  onChange={(e) => onChange({ ...editForm, typeOfCategory: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select Type</option>
                  <option value="L1">L1</option>
                  <option value="L2">L2</option>
                  <option value="L3">L3</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Priority Order</span>
                <input
                  type="number"
                  min={0}
                  value={editForm.priorityOrder}
                  onChange={(e) => onChange({ ...editForm, priorityOrder: e.target.value })}
                  className={inputClass}
                />
              </label>
            </div>
            <div className="mt-4">
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Description</span>
                <RichTextEditor
                  value={editForm.description}
                  onChange={(v) => onChange({ ...editForm, description: v })}
                  placeholder="Description"
                  minHeight="120px"
                />
              </label>
            </div>
          </ModalSection>

          <ModalSection title="Status & Substores">
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.publish}
                  onChange={(e) => onChange({ ...editForm, publish: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-slate-700">Published</span>
              </label>
            </div>
            <SubstoreMultiPicker
              selectedSubstores={editForm.substores}
              hubOptions={hubOptions}
              onSubstoresChange={(substores) => onChange({ ...editForm, substores })}
            />
          </ModalSection>
        </div>
      </div>

      <ModalFooter onCancel={onClose} onSave={onSave} saving={saving} />
    </ModalContainer>
  );
}
