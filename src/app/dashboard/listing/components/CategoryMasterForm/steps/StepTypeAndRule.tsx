'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Field, CustomSelect } from '../shared';
import type { RuleConditionField } from '../types';
import { RULE_FIELDS, TYPE_OPTIONS } from '../types';

export interface StepTypeAndRuleProps {
  type: 'Automatic' | 'Manual';
  ruleOperator: 'AND' | 'OR';
  conditions: { field: RuleConditionField; value: string }[];
  errors: Record<string, string>;
  onTypeChange: (v: 'Automatic' | 'Manual') => void;
  onRuleOperatorChange: (v: 'AND' | 'OR') => void;
  onAddCondition: () => void;
  onRemoveCondition: (index: number) => void;
  onUpdateCondition: (index: number, updates: Partial<{ field: RuleConditionField; value: string }>) => void;
  onClearError: (key: string) => void;
}

export function StepTypeAndRule({
  type,
  ruleOperator,
  conditions,
  errors,
  onTypeChange,
  onRuleOperatorChange,
  onAddCondition,
  onRemoveCondition,
  onUpdateCondition,
  onClearError,
}: StepTypeAndRuleProps) {
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Rule operator</label>
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
                <button
                  type="button"
                  onClick={onAddCondition}
                  className="inline-flex items-center gap-1 text-sm font-medium text-pink-600 hover:text-pink-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add condition
                </button>
              </div>
              {errors.rule && <p className="text-xs text-red-600 mb-1.5">{errors.rule}</p>}
              <div className="space-y-2">
                {conditions.map((cond, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg border border-slate-100"
                  >
                    <CustomSelect<RuleConditionField>
                      value={cond.field}
                      options={RULE_FIELDS.map((f) => ({ value: f, label: f }))}
                      onChange={(v) => onUpdateCondition(index, { field: v })}
                      className="min-w-[120px]"
                      size="sm"
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={cond.value}
                      onChange={(e) => onUpdateCondition(index, { value: e.target.value })}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => onRemoveCondition(index)}
                      disabled={conditions.length <= 1}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                      aria-label="Remove condition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
