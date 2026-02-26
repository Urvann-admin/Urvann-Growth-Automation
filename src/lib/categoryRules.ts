import type { Rule, RuleCondition, RuleItem, Category } from '@/models/category';
import { CategoryModel } from '@/models/category';

/**
 * Product data structure for rule evaluation
 */
export interface ProductForRuleEvaluation {
  plant: string;
  variety?: string;
  colour?: string;
  height?: number;
  size?: number;
  type?: string;
  categories?: string[]; // Existing categories (for Category field evaluation)
}

/**
 * Evaluate a complete rule against a product
 */
export function evaluateRule(rule: Rule, product: ProductForRuleEvaluation): boolean {
  if (!rule || !rule.items || !Array.isArray(rule.items) || rule.items.length === 0) {
    return false;
  }

  const results = rule.items.map((item: RuleItem) => {
    if (isRuleCondition(item)) {
      return evaluateCondition(item, product);
    } else if (isRule(item)) {
      return evaluateRule(item, product);
    }
    return false;
  });

  if (rule.rule_operator === 'AND') {
    return results.every(Boolean);
  } else if (rule.rule_operator === 'OR') {
    return results.some(Boolean);
  }

  return false;
}

/**
 * Evaluate a single condition against a product
 */
export function evaluateCondition(condition: RuleCondition, product: ProductForRuleEvaluation): boolean {
  const field = condition.field;
  const expectedValue = condition.value;

  let actualValue: any;

  switch (field) {
    case 'Plant':
      actualValue = product.plant;
      break;
    case 'variety':
      actualValue = product.variety;
      break;
    case 'Colour':
      actualValue = product.colour;
      break;
    case 'Height':
      actualValue = product.height;
      break;
    case 'Size':
      actualValue = product.size;
      break;
    case 'Type':
      actualValue = product.type;
      break;
    case 'Category':
      // For category field, check if the product already has this category
      actualValue = product.categories;
      break;
    default:
      return false;
  }

  if (actualValue === undefined || actualValue === null) {
    return false;
  }

  // Special handling for Category field (array check)
  if (field === 'Category' && Array.isArray(actualValue)) {
    return actualValue.some(cat => 
      String(cat).toLowerCase().includes(String(expectedValue).toLowerCase())
    );
  }

  // For string fields, do case-insensitive partial match
  if (typeof expectedValue === 'string' && typeof actualValue === 'string') {
    return actualValue.toLowerCase().includes(expectedValue.toLowerCase());
  }

  // For numeric fields, do exact comparison
  if (typeof expectedValue === 'number' && typeof actualValue === 'number') {
    return actualValue === expectedValue;
  }

  // Fallback: convert both to strings and do case-insensitive comparison
  return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
}

/**
 * Get all categories that match the given product based on their rules
 */
export async function getAutoCategoriesForProduct(product: ProductForRuleEvaluation): Promise<string[]> {
  try {
    const categories = await CategoryModel.findAll();
    const matchingCategories: string[] = [];

    for (const category of categories) {
      if (category.rule && evaluateRule(category.rule, product)) {
        matchingCategories.push(category.alias);
      }
    }

    return matchingCategories;
  } catch (error) {
    console.error('Error evaluating category rules:', error);
    return [];
  }
}

/**
 * Get categories that match a specific rule (for testing/preview purposes)
 */
export async function getCategoriesMatchingRule(rule: Rule, product: ProductForRuleEvaluation): Promise<Category[]> {
  try {
    const categories = await CategoryModel.findAll() as Category[];
    return categories.filter(category => 
      category.rule && JSON.stringify(category.rule) === JSON.stringify(rule)
    );
  } catch (error) {
    console.error('Error finding categories with matching rule:', error);
    return [];
  }
}

/**
 * Test a rule against a product (for rule builder/testing)
 */
export function testRule(rule: Rule, product: ProductForRuleEvaluation): {
  matches: boolean;
  evaluation: RuleEvaluationResult;
} {
  const evaluation = evaluateRuleWithDetails(rule, product);
  return {
    matches: evaluation.result,
    evaluation,
  };
}

/**
 * Detailed rule evaluation with step-by-step results (for debugging)
 */
export interface RuleEvaluationResult {
  result: boolean;
  operator: 'AND' | 'OR';
  items: (ConditionEvaluationResult | RuleEvaluationResult)[];
}

export interface ConditionEvaluationResult {
  result: boolean;
  field: string;
  expectedValue: string | number;
  actualValue: any;
  type: 'condition';
}

function evaluateRuleWithDetails(rule: Rule, product: ProductForRuleEvaluation): RuleEvaluationResult {
  const items = rule.items.map((item: RuleItem) => {
    if (isRuleCondition(item)) {
      return evaluateConditionWithDetails(item, product);
    } else if (isRule(item)) {
      return evaluateRuleWithDetails(item, product);
    }
    return {
      result: false,
      field: 'unknown',
      expectedValue: '',
      actualValue: null,
      type: 'condition' as const,
    };
  });

  const result = rule.rule_operator === 'AND' 
    ? items.every(item => item.result)
    : items.some(item => item.result);

  return {
    result,
    operator: rule.rule_operator,
    items,
  };
}

function evaluateConditionWithDetails(condition: RuleCondition, product: ProductForRuleEvaluation): ConditionEvaluationResult {
  const field = condition.field;
  const expectedValue = condition.value;

  let actualValue: any;

  switch (field) {
    case 'Plant':
      actualValue = product.plant;
      break;
    case 'variety':
      actualValue = product.variety;
      break;
    case 'Colour':
      actualValue = product.colour;
      break;
    case 'Height':
      actualValue = product.height;
      break;
    case 'Size':
      actualValue = product.size;
      break;
    case 'Type':
      actualValue = product.type;
      break;
    case 'Category':
      actualValue = product.categories;
      break;
    default:
      actualValue = null;
  }

  let result = false;

  if (actualValue !== undefined && actualValue !== null) {
    if (field === 'Category' && Array.isArray(actualValue)) {
      result = actualValue.some(cat => 
        String(cat).toLowerCase().includes(String(expectedValue).toLowerCase())
      );
    } else if (typeof expectedValue === 'string' && typeof actualValue === 'string') {
      result = actualValue.toLowerCase().includes(expectedValue.toLowerCase());
    } else if (typeof expectedValue === 'number' && typeof actualValue === 'number') {
      result = actualValue === expectedValue;
    } else {
      result = String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
    }
  }

  return {
    result,
    field,
    expectedValue,
    actualValue,
    type: 'condition',
  };
}

/**
 * Validate that a rule structure is valid
 */
export function validateRule(rule: unknown): rule is Rule {
  if (!rule || typeof rule !== 'object') return false;
  
  const r = rule as Record<string, unknown>;
  
  if (r.rule_operator !== 'AND' && r.rule_operator !== 'OR') return false;
  
  const items = r.items;
  if (!Array.isArray(items) || items.length === 0) return false;
  
  return items.every((item) => validateRuleItem(item));
}

/**
 * Validate that a rule item is valid (condition or nested rule)
 */
export function validateRuleItem(item: unknown): item is RuleItem {
  if (!item || typeof item !== 'object') return false;
  
  const i = item as Record<string, unknown>;
  
  // Check if it's a condition
  if (i.field && i.value !== undefined) {
    return validateRuleCondition(item);
  }
  
  // Check if it's a nested rule
  if (i.rule_operator && i.items) {
    return validateRule(item);
  }
  
  return false;
}

/**
 * Validate that a rule condition is valid
 */
export function validateRuleCondition(condition: unknown): condition is RuleCondition {
  if (!condition || typeof condition !== 'object') return false;
  
  const c = condition as Record<string, unknown>;
  
  const validFields = ['Plant', 'variety', 'Colour', 'Height', 'Size', 'Type', 'Category'];
  if (!validFields.includes(c.field as string)) return false;
  
  if (c.value === undefined || c.value === null) return false;
  
  return true;
}

/**
 * Type guards
 */
function isRule(item: RuleItem): item is Rule {
  return typeof item === 'object' && 'rule_operator' in item && 'items' in item;
}

function isRuleCondition(item: RuleItem): item is RuleCondition {
  return typeof item === 'object' && 'field' in item && 'value' in item;
}

/**
 * Merge categories from multiple sources, removing duplicates
 */
export function mergeCategoryArrays(...categoryArrays: (string[] | undefined)[]): string[] {
  const allCategories = new Set<string>();
  
  categoryArrays.forEach(array => {
    if (Array.isArray(array)) {
      array.forEach(category => {
        if (category && typeof category === 'string') {
          allCategories.add(category.trim());
        }
      });
    }
  });
  
  return Array.from(allCategories).filter(Boolean);
}

/**
 * Get rule summary for display purposes
 */
export function getRuleSummary(rule: Rule): string {
  if (!rule || !rule.items || rule.items.length === 0) {
    return 'No conditions';
  }

  const conditions = rule.items.map(item => {
    if (isRuleCondition(item)) {
      return `${item.field} contains "${item.value}"`;
    } else if (isRule(item)) {
      return `(${getRuleSummary(item)})`;
    }
    return 'Unknown condition';
  });

  return conditions.join(` ${rule.rule_operator} `);
}