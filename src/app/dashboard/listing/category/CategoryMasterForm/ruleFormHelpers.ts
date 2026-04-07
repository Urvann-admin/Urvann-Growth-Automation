import type { Rule, RuleItem, RuleConditionField } from '@/models/category';
import type { FormRuleItem } from './types';

export function hasConditionWithValue(items: FormRuleItem[]): boolean {
  for (const item of items) {
    if ('field' in item) {
      if (String((item as { value: string }).value).trim() !== '') return true;
    } else {
      if (hasConditionWithValue(item.items)) return true;
    }
  }
  return false;
}

export function formRuleItemsToRuleItems(items: FormRuleItem[]): Rule['items'] {
  return items
    .map((item): Rule['items'][number] => {
      if ('field' in item) {
        const cond = item as { field: string; value: string };
        const v = cond.value?.trim();
        const num = Number(v);
        const value = v !== '' && !Number.isNaN(num) ? num : (v as string | number);
        return { field: cond.field as RuleConditionField, value };
      }
      return {
        rule_operator: item.rule_operator,
        items: formRuleItemsToRuleItems(item.items),
      };
    })
    .filter((i) => {
      if ('field' in i) return i.value !== '' && i.value !== undefined;
      return (i as Rule).items.length > 0;
    });
}

function convertRuleItemToForm(item: RuleItem): FormRuleItem {
  if (item && typeof item === 'object' && 'field' in item && (item as { field?: unknown }).field != null) {
    const c = item as { field: RuleConditionField; value: string | number };
    return { field: c.field, value: String(c.value ?? '') };
  }
  const r = item as Rule;
  return {
    rule_operator: r.rule_operator,
    items: Array.isArray(r.items) ? r.items.map(convertRuleItemToForm) : [],
  };
}

/** Default single empty row when there is no rule yet */
export function ruleToFormRuleItems(rule: Rule | undefined | null): FormRuleItem[] {
  if (!rule || !Array.isArray(rule.items) || rule.items.length === 0) {
    return [{ field: 'Plant', value: '' }];
  }
  return rule.items.map(convertRuleItemToForm);
}

export function getListAtPath(items: FormRuleItem[], path: number[]): FormRuleItem[] {
  if (path.length === 0) return items;
  const [i, ...rest] = path;
  const parent = items[i];
  if (!parent || !('items' in parent)) return items;
  return getListAtPath(parent.items, rest);
}

export function setListAtPath(
  items: FormRuleItem[],
  path: number[],
  newList: FormRuleItem[]
): FormRuleItem[] {
  if (path.length === 0) return newList;
  const [i, ...rest] = path;
  const parent = { ...items[i] } as { rule_operator: 'AND' | 'OR'; items: FormRuleItem[] };
  parent.items = setListAtPath(parent.items, rest, newList);
  const next = [...items];
  next[i] = parent;
  return next;
}

export function removeAtPath(items: FormRuleItem[], path: number[]): FormRuleItem[] {
  if (path.length === 1) {
    return items.filter((_, idx) => idx !== path[0]);
  }
  const [i, ...rest] = path;
  const parent = items[i] as { rule_operator: 'AND' | 'OR'; items: FormRuleItem[] } | undefined;
  if (!parent || !('items' in parent)) return items;
  return items.map((it, idx) =>
    idx === i ? { ...parent, items: removeAtPath(parent.items, rest) } : it
  ) as FormRuleItem[];
}

export function appendToPath(
  items: FormRuleItem[],
  path: number[],
  item: FormRuleItem
): FormRuleItem[] {
  const list = getListAtPath(items, path);
  const newList = [...list, item];
  return setListAtPath(items, path, newList);
}

export function getItemAtPath(items: FormRuleItem[], path: number[]): FormRuleItem | null {
  if (path.length === 0) return null;
  if (path.length === 1) return items[path[0]] ?? null;
  const [i, ...rest] = path;
  const parent = items[i];
  if (!parent || !('items' in parent)) return null;
  return getItemAtPath(parent.items, rest);
}

export function setItemAtPath(
  items: FormRuleItem[],
  path: number[],
  newItem: FormRuleItem
): FormRuleItem[] {
  if (path.length === 1) {
    const next = [...items];
    next[path[0]] = newItem;
    return next;
  }
  const [i, ...rest] = path;
  const parent = items[i] as { rule_operator: 'AND' | 'OR'; items: FormRuleItem[] } | undefined;
  if (!parent || !('items' in parent)) return items;
  return items.map((it, idx) =>
    idx === i ? { ...parent, items: setItemAtPath(parent.items, rest, newItem) } : it
  ) as FormRuleItem[];
}
