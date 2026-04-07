import {
  COLLECTION_RULE_FIELDS,
  COLLECTION_RULE_OPERATORS,
  MULTI_VALUE_FIELDS,
  type CollectionRuleCondition,
} from '../CollectionMasterForm/CollectionRuleSection';

const initialCondition = (): CollectionRuleCondition => ({
  field: COLLECTION_RULE_FIELDS[0],
  operator: COLLECTION_RULE_OPERATORS[0],
  value: '',
  values: undefined,
});

export function defaultRuleState(): {
  ruleOperator: 'AND' | 'OR';
  ruleItems: CollectionRuleCondition[];
} {
  return { ruleOperator: 'AND', ruleItems: [initialCondition()] };
}

/** Restore UI state from collectionMaster `filters` JSON. */
export function parseFiltersToRuleState(filters: unknown[] | undefined | null): {
  ruleOperator: 'AND' | 'OR';
  ruleItems: CollectionRuleCondition[];
} {
  if (!Array.isArray(filters) || filters.length === 0) {
    return defaultRuleState();
  }
  const g = filters[0] as {
    rule_operator?: string;
    items?: {
      field?: string;
      operator?: string;
      value?: string;
      values?: string[];
    }[];
  };
  const ruleOperator = g.rule_operator === 'OR' ? 'OR' : 'AND';
  if (!Array.isArray(g.items) || g.items.length === 0) {
    return { ruleOperator, ruleItems: [initialCondition()] };
  }
  const ruleItems: CollectionRuleCondition[] = g.items.map((it) => ({
    field: typeof it.field === 'string' && it.field ? it.field : COLLECTION_RULE_FIELDS[0],
    operator:
      typeof it.operator === 'string' && it.operator
        ? it.operator
        : COLLECTION_RULE_OPERATORS[0],
    value: typeof it.value === 'string' ? it.value : '',
    values: Array.isArray(it.values) ? it.values : undefined,
  }));
  return { ruleOperator, ruleItems };
}

function isMultiField(field: string): boolean {
  return MULTI_VALUE_FIELDS.includes(field as (typeof MULTI_VALUE_FIELDS)[number]);
}

/** Build `filters` array for PATCH/POST (dynamic type only). */
export function serializeDynamicFilters(
  ruleOperator: 'AND' | 'OR',
  ruleItems: CollectionRuleCondition[]
): unknown[] {
  const validItems = ruleItems
    .filter((c) => {
      if (!c.field || !c.operator) return false;
      if (isMultiField(c.field)) return Array.isArray(c.values) && c.values.length > 0;
      return Boolean(String(c.value).trim());
    })
    .map((c) => {
      if (isMultiField(c.field)) {
        return { field: c.field, operator: c.operator, values: c.values! };
      }
      return { field: c.field, operator: c.operator, value: String(c.value).trim() };
    });
  return [{ rule_operator: ruleOperator, items: validItems }];
}

export function validateDynamicRules(ruleItems: CollectionRuleCondition[]): boolean {
  return ruleItems.some((c) => {
    if (!c.field || !c.operator) return false;
    if (isMultiField(c.field)) return Array.isArray(c.values) && c.values.length > 0;
    return Boolean(String(c.value).trim());
  });
}
