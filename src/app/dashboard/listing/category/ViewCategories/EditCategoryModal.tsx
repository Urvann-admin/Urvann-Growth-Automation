'use client';

import type { ReactNode } from 'react';
import type { FormRuleItem, RuleConditionField } from '../CategoryMasterForm/types';
import { StepHierarchy } from '../CategoryMasterForm/steps/StepHierarchy';
import { StepTypeAndRule } from '../CategoryMasterForm/steps/StepTypeAndRule';
import { HUB_MAPPINGS } from '@/shared/constants/hubs';
import { SubstoreMultiPicker } from '../CategoryMasterForm/shared';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { ModalContainer, ModalHeader, ModalFooter } from '../../shared';

export interface EditCategoryForm {
  category: string;
  alias: string;
  typeOfCategory: string;
  description: string;
  l1Parent: string;
  l2Parent: string;
  l3Parent: string;
  publish: boolean;
  priorityOrder: string;
  type: 'Automatic' | 'Manual';
  ruleOperator: 'AND' | 'OR';
  ruleItems: FormRuleItem[];
  substores: string[];
}

export interface EditCategoryRecordMeta {
  /** StoreHippo entity _id (same as DB `categoryId`); read-only in UI */
  storeHippoId?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

interface EditCategoryModalProps {
  isOpen: boolean;
  editForm: EditCategoryForm;
  recordMeta: EditCategoryRecordMeta | null;
  saving: boolean;
  l1Options: { value: string; label: string }[];
  l2Options: { value: string; label: string }[];
  l3Options: { value: string; label: string }[];
  ruleErrors: Record<string, string>;
  onClose: () => void;
  onSave: () => void;
  onChange: (form: EditCategoryForm) => void;
  onClearRuleError: (key: string) => void;
  onAddRuleCondition: (path: number[]) => void;
  onAddRuleGroup: (path: number[]) => void;
  onRemoveRuleItem: (path: number[]) => void;
  onUpdateRuleItem: (
    path: number[],
    updates: Partial<{ field: RuleConditionField; value: string }> | { rule_operator: 'AND' | 'OR' }
  ) => void;
}

function formatMetaDate(v: string | Date | null | undefined): string {
  if (v == null || v === '') return '—';
  const d = typeof v === 'string' ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{children}</h3>
  );
}

export function EditCategoryModal({
  isOpen,
  editForm,
  recordMeta,
  saving,
  l1Options,
  l2Options,
  l3Options,
  ruleErrors,
  onClose,
  onSave,
  onChange,
  onClearRuleError,
  onAddRuleCondition,
  onAddRuleGroup,
  onRemoveRuleItem,
  onUpdateRuleItem,
}: EditCategoryModalProps) {
  const hubOptions = HUB_MAPPINGS.map((m) => ({ value: m.hub, label: m.hub }));

  const inputClass =
    'w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400 transition-shadow';

  const readOnlyInputClass =
    'w-full min-h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600 cursor-default focus:outline-none focus:border-slate-200';

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      contentClassName="w-full max-w-[min(94vw,40rem)] sm:max-w-[min(94vw,44rem)] max-h-[88vh]"
    >
      <ModalHeader title="Edit category" onClose={onClose} />

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-5 py-4 sm:px-6 sm:py-5 divide-y divide-slate-100">
          {recordMeta && (
            <section className="space-y-2 pb-5">
              <SectionTitle>Record</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                <label className="block min-w-0 sm:col-span-1">
                  <span className="block text-sm font-medium text-slate-700 mb-1">StoreHippo ID</span>
                  <input
                    type="text"
                    readOnly
                    value={recordMeta.storeHippoId?.trim() ? recordMeta.storeHippoId.trim() : '—'}
                    className={readOnlyInputClass}
                    title="Used to sync with StoreHippo"
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">Not editable</p>
                </label>
                <div>
                  <span className="block text-sm font-medium text-slate-700 mb-1">Created</span>
                  <p className="text-slate-800 tabular-nums py-2 text-sm leading-snug">
                    {formatMetaDate(recordMeta.createdAt)}
                  </p>
                </div>
                <div>
                  <span className="block text-sm font-medium text-slate-700 mb-1">Last updated</span>
                  <p className="text-slate-800 tabular-nums py-2 text-sm leading-snug">
                    {formatMetaDate(recordMeta.updatedAt)}
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="space-y-3 py-5">
            <SectionTitle>Basic information</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3">
              <label className="block min-w-0">
                <span className="block text-sm font-medium text-slate-700 mb-1">Category name</span>
                <input
                  type="text"
                  value={editForm.category}
                  onChange={(e) => onChange({ ...editForm, category: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block min-w-0">
                <span className="block text-sm font-medium text-slate-700 mb-1">Alias</span>
                <input
                  type="text"
                  value={editForm.alias}
                  onChange={(e) => onChange({ ...editForm, alias: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block min-w-0">
                <span className="block text-sm font-medium text-slate-700 mb-1">Level</span>
                <select
                  value={editForm.typeOfCategory}
                  onChange={(e) => onChange({ ...editForm, typeOfCategory: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select</option>
                  <option value="L1">L1</option>
                  <option value="L2">L2</option>
                  <option value="L3">L3</option>
                </select>
              </label>
              <label className="block min-w-0">
                <span className="block text-sm font-medium text-slate-700 mb-1">Priority order</span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={editForm.priorityOrder}
                  onChange={(e) => onChange({ ...editForm, priorityOrder: e.target.value })}
                  className={inputClass}
                />
              </label>
            </div>
            <label className="block pt-1">
              <span className="block text-sm font-medium text-slate-700 mb-1">Description</span>
              <RichTextEditor
                value={editForm.description}
                onChange={(v) => onChange({ ...editForm, description: v })}
                placeholder="Description"
                minHeight="120px"
              />
            </label>
          </section>

          <section className="space-y-2 py-5">
            <SectionTitle>Hierarchy (parents)</SectionTitle>
            <StepHierarchy
              variant="plain"
              typeOfCategory={editForm.typeOfCategory}
              l1Parent={editForm.l1Parent}
              l2Parent={editForm.l2Parent}
              l3Parent={editForm.l3Parent}
              l1Options={l1Options}
              l2Options={l2Options}
              l3Options={l3Options}
              onL1ParentChange={(v) => onChange({ ...editForm, l1Parent: v })}
              onL2ParentChange={(v) => onChange({ ...editForm, l2Parent: v })}
              onL3ParentChange={(v) => onChange({ ...editForm, l3Parent: v })}
            />
          </section>

          <section className="space-y-2 py-5">
            <SectionTitle>Assignment type &amp; rule</SectionTitle>
            <StepTypeAndRule
              variant="plain"
              type={editForm.type}
              ruleOperator={editForm.ruleOperator}
              ruleItems={editForm.ruleItems}
              errors={ruleErrors}
              onTypeChange={(v) => onChange({ ...editForm, type: v })}
              onRuleOperatorChange={(v) => onChange({ ...editForm, ruleOperator: v })}
              onAddCondition={onAddRuleCondition}
              onAddGroup={onAddRuleGroup}
              onRemoveRuleItem={onRemoveRuleItem}
              onUpdateRuleItem={onUpdateRuleItem}
              onClearError={onClearRuleError}
            />
          </section>

          <section className="space-y-3 py-5">
            <SectionTitle>Status &amp; substores</SectionTitle>
            <label className="flex items-center gap-2.5 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={editForm.publish}
                onChange={(e) => onChange({ ...editForm, publish: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500/30"
              />
              <span className="text-sm font-medium text-slate-800">Published</span>
            </label>
            <SubstoreMultiPicker
              value={editForm.substores}
              options={hubOptions}
              onChange={(substores) => onChange({ ...editForm, substores })}
            />
          </section>
        </div>
      </div>

      <ModalFooter onCancel={onClose} onSave={onSave} saving={saving} />
    </ModalContainer>
  );
}
