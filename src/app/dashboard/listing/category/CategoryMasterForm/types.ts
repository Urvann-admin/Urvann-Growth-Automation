import type { Rule, RuleCondition, RuleConditionField } from '@/models/category';

export type StepId = 'basics' | 'hierarchy' | 'type-rule' | 'publish-substores' | 'review';

/** Form representation: either a leaf condition or a nested group */
export type FormRuleItem =
  | { field: RuleConditionField; value: string }
  | { rule_operator: 'AND' | 'OR'; items: FormRuleItem[] };

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
  /** Top-level rule items (conditions or nested groups) */
  ruleItems: FormRuleItem[];
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
  ruleItems: [{ field: 'Plant', value: '' }],
  priorityOrder: '10', // Default applied in backend; not shown in form
  substores: [],
};

export type { Rule, RuleCondition, RuleConditionField };
