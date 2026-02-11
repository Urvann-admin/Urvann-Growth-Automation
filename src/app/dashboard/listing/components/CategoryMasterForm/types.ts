import type { Rule, RuleCondition, RuleConditionField } from '@/models/category';

export type StepId = 'basics' | 'hierarchy' | 'type-rule' | 'publish-substores' | 'review';

export interface CategoryFormData {
  category: string;
  alias: string;
  typeOfCategory: string;
  description: string;
  l1Parent: string;
  l2Parent: string;
  l3Parent: string;
  publish: boolean;
  type: 'Automatic' | 'Manual';
  ruleOperator: 'AND' | 'OR';
  conditions: RuleCondition[];
  priorityOrder: string;
  substores: string[];
}

export const RULE_FIELDS: RuleConditionField[] = [
  'Plant',
  'variety',
  'Colour',
  'Height',
  'Size',
  'Type',
  'Category',
];

export const TYPE_OPTIONS = [
  { value: 'Manual' as const, label: 'Manual' },
  { value: 'Automatic' as const, label: 'Automatic' },
];

export const STEPS: { id: StepId; label: string; title: string }[] = [
  { id: 'basics', label: 'Basics', title: 'Required fields' },
  { id: 'hierarchy', label: 'Hierarchy', title: 'Hierarchy (optional)' },
  { id: 'type-rule', label: 'Type & rule', title: 'Type & rule' },
  { id: 'publish-substores', label: 'Publish & substores', title: 'Publish, order & substores' },
  { id: 'review', label: 'Review', title: 'Review' },
];

export const initialFormData: CategoryFormData = {
  category: '',
  alias: '',
  typeOfCategory: '',
  description: '',
  l1Parent: '',
  l2Parent: '',
  l3Parent: '',
  publish: true,
  type: 'Manual',
  ruleOperator: 'AND',
  conditions: [{ field: 'Plant', value: '' }],
  priorityOrder: '0',
  substores: [],
};

export type { Rule, RuleCondition, RuleConditionField };
