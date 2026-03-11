'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Braces } from 'lucide-react';
import { Field, CustomSelect } from '../shared';
import type { RuleConditionField } from '../types';
import { RULE_FIELDS, TYPE_OPTIONS } from '../types';
import type { FormRuleItem } from '../types';
import { SearchableSelect } from '../shared/SearchableSelect';

const FIELDS_WITH_VALUE_DROPDOWN: RuleConditionField[] = ['Plant', 'Colour', 'variety', 'Height', 'Size', 'Type', 'Category'];

export interface StepTypeAndRuleProps {
  type: 'Automatic' | 'Manual';
  ruleOperator: 'AND' | 'OR';
  ruleItems: FormRuleItem[];
  errors: Record<string, string>;
  onTypeChange: (v: 'Automatic' | 'Manual') => void;
  onRuleOperatorChange: (v: 'AND' | 'OR') => void;
  onAddCondition: (path: number[]) => void;
  onAddGroup: (path: number[]) => void;
  onRemoveRuleItem: (path: number[]) => void;
  onUpdateRuleItem: (path: number[], updates: Partial<{ field: RuleConditionField; value: string }> | { rule_operator: 'AND' | 'OR' }) => void;
  onClearError: (key: string) => void;
}

function useRuleValueOptions(field: RuleConditionField | '') {
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    if (!field || !FIELDS_WITH_VALUE_DROPDOWN.includes(field)) {
      setOptions([]);
      return;
    }
    fetch(`/api/categories/rule-values?field=${encodeURIComponent(field)}&limit=200`)
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) {
          setOptions(json.data);
        } else {
          setOptions([]);
        }
      })
      .catch(() => setOptions([]));
  }, [field]);
  return options;
}

function ConditionRow({
  path,
  field,
  value,
  valueOptions,
  onUpdate,
  onRemove,
  canRemove,
}: {
  path: number[];
  field: RuleConditionField;
  value: string;
  valueOptions: { value: string; label: string }[];
  onUpdate: (path: number[], u: Partial<{ field: RuleConditionField; value: string }>) => void;
  onRemove: (path: number[]) => void;
  canRemove: boolean;
}) {
  const useDropdown = valueOptions.length > 0;
  return (
    <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg border border-slate-100">
      <CustomSelect<RuleConditionField>
        value={field}
        options={RULE_FIELDS.map((f) => ({ value: f, label: f }))}
        onChange={(v) => onUpdate(path, { field: v })}
        className="min-w-[120px]"
        size="sm"
      />
      {useDropdown ? (
        <SearchableSelect
          value={value}
          options={valueOptions}
          onChange={(v) => onUpdate(path, { value: v })}
          placeholder="Value"
          className="min-w-[140px]"
        />
      ) : (
        <input
          type="text"
          placeholder="Value"
          value={value}
          onChange={(e) => onUpdate(path, { value: e.target.value })}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 shadow-sm"
        />
      )}
      <button
        type="button"
        onClick={() => onRemove(path)}
        disabled={!canRemove}
        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
        aria-label="Remove condition"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function RuleGroupEditor({
  path,
  ruleOperator,
  items,
  onUpdateOperator,
  onAddCondition,
  onAddGroup,
  onRemove,
  onUpdateItem,
  onRemoveItem,
  depth,
}: {
  path: number[];
  ruleOperator: 'AND' | 'OR';
  items: FormRuleItem[];
  onUpdateOperator: (path: number[], op: 'AND' | 'OR') => void;
  onAddCondition: (path: number[]) => void;
  onAddGroup: (path: number[]) => void;
  onRemove: (path: number[]) => void;
  onUpdateItem: (path: number[], u: Partial<{ field: RuleConditionField; value: string }> | { rule_operator: 'AND' | 'OR' }) => void;
  onRemoveItem: (path: number[]) => void;
  depth: number;
}) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-slate-50/50 p-3 ${depth > 0 ? 'ml-4 border-l-2 border-l-pink-200' : ''}`}>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-xs font-medium text-slate-500">Group</span>
        <CustomSelect<'AND' | 'OR'>
          value={ruleOperator}
          options={[
            { value: 'AND', label: 'AND' },
            { value: 'OR', label: 'OR' },
          ]}
          onChange={(v) => onUpdateOperator(path, v)}
          className="max-w-[100px]"
          size="sm"
        />
        <button
          type="button"
          onClick={() => onRemove(path)}
          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          aria-label="Remove group"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => {
          const itemPath = [...path, index];
          if ('field' in item) {
            return (
              <ConditionRowWithOptions
                key={JSON.stringify(itemPath)}
                path={itemPath}
                field={item.field}
                value={String(item.value ?? '')}
                onUpdate={onUpdateItem}
                onRemove={onRemoveItem}
                canRemove={items.length > 1}
              />
            );
          }
          return (
            <RuleGroupEditor
              key={JSON.stringify(itemPath)}
              path={itemPath}
              ruleOperator={item.rule_operator}
              items={item.items}
              onUpdateOperator={onUpdateOperator}
              onAddCondition={onAddCondition}
              onAddGroup={onAddGroup}
              onRemove={onRemoveItem}
              onUpdateItem={onUpdateItem}
              onRemoveItem={onRemoveItem}
              depth={depth + 1}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <button
          type="button"
          onClick={() => onAddCondition(path)}
          className="inline-flex items-center gap-1 text-sm font-medium text-pink-600 hover:text-pink-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add condition
        </button>
        <button
          type="button"
          onClick={() => onAddGroup(path)}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-700 transition-colors"
        >
          <Braces className="w-3.5 h-3.5" /> Add nested group
        </button>
      </div>
    </div>
  );
}

function ConditionRowWithOptions({
  path,
  field,
  value,
  onUpdate,
  onRemove,
  canRemove,
}: {
  path: number[];
  field: RuleConditionField;
  value: string;
  onUpdate: (path: number[], u: Partial<{ field: RuleConditionField; value: string }> | { rule_operator: 'AND' | 'OR' }) => void;
  onRemove: (path: number[]) => void;
  canRemove: boolean;
}) {
  const valueOptions = useRuleValueOptions(field);
  return (
    <ConditionRow
      path={path}
      field={field}
      value={value}
      valueOptions={valueOptions}
      onUpdate={onUpdate as (path: number[], u: Partial<{ field: RuleConditionField; value: string }>) => void}
      onRemove={onRemove}
      canRemove={canRemove}
    />
  );
}

export function StepTypeAndRule({
  type,
  ruleOperator,
  ruleItems,
  errors,
  onTypeChange,
  onRuleOperatorChange,
  onAddCondition,
  onAddGroup,
  onRemoveRuleItem,
  onUpdateRuleItem,
  onClearError,
}: StepTypeAndRuleProps) {
  const handleUpdateOperator = useCallback(
    (path: number[], op: 'AND' | 'OR') => {
      onUpdateRuleItem(path, { rule_operator: op });
    },
    [onUpdateRuleItem]
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col md:flex-row gap-4 md:gap-5">
        <Field label="Type" required error={errors.type} className="shrink-0 max-w-[180px]">
          <CustomSelect
            value={type}
            options={TYPE_OPTIONS}
            onChange={(v) => {
              onTypeChange(v);
              onClearError('type');
              onClearError('rule');
            }}
            hasError={!!errors.type}
          />
        </Field>
        {type === 'Manual' && (
          <p className="text-sm text-slate-500 mt-1 md:mt-7">
            Manual categories are assigned by you; no rules needed.
          </p>
        )}
        {type === 'Automatic' && (
          <div className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-[#F4F6F8] p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rule operator (top level)</label>
              <CustomSelect
                value={ruleOperator}
                options={[
                  { value: 'AND', label: 'AND' },
                  { value: 'OR', label: 'OR' },
                ]}
                onChange={onRuleOperatorChange}
                className="max-w-[120px]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-slate-700">Conditions</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onAddCondition([])}
                    className="inline-flex items-center gap-1 text-sm font-medium text-pink-600 hover:text-pink-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add condition
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddGroup([])}
                    className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-700 transition-colors"
                  >
                    <Braces className="w-3.5 h-3.5" /> Add group
                  </button>
                </div>
              </div>
              {errors.rule && <p className="text-xs text-red-600 mb-1.5">{errors.rule}</p>}
              <div className="space-y-2">
                {ruleItems.map((item, index) => {
                  const path = [index];
                  if ('field' in item) {
                    return (
                      <ConditionRowWithOptions
                        key={JSON.stringify(path)}
                        path={path}
                        field={item.field}
                        value={String(item.value ?? '')}
                        onUpdate={onUpdateRuleItem}
                        onRemove={onRemoveRuleItem}
                        canRemove={ruleItems.length > 1}
                      />
                    );
                  }
                  return (
                    <RuleGroupEditor
                      key={JSON.stringify(path)}
                      path={path}
                      ruleOperator={item.rule_operator}
                      items={item.items}
                      onUpdateOperator={handleUpdateOperator}
                      onAddCondition={onAddCondition}
                      onAddGroup={onAddGroup}
                      onRemove={onRemoveRuleItem}
                      onUpdateItem={onUpdateRuleItem}
                      onRemoveItem={onRemoveRuleItem}
                      depth={0}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
