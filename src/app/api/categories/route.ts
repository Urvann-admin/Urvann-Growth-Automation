import { NextRequest, NextResponse } from 'next/server';
import { CategoryModel } from '@/models/category';
import type { Rule, RuleCondition, RuleConditionField, RuleItem } from '@/models/category';
import { syncCategoryToStoreHippo } from '@/lib/storeHippoCategories';

export async function GET() {
  try {
    // Get all categories (including unpublished) sorted by priorityOrder
    const allCategories = await CategoryModel.findAll();
    const categories = allCategories.sort((a: any, b: any) => (a.priorityOrder || 0) - (b.priorityOrder || 0));
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

const RULE_CONDITION_FIELDS: RuleConditionField[] = ['Plant', 'variety', 'Colour', 'Height', 'Size', 'Type', 'Category'];

function isRuleCondition(item: unknown): item is RuleCondition {
  if (!item || typeof item !== 'object') return false;
  const c = item as Record<string, unknown>;
  return typeof c.field === 'string' && RULE_CONDITION_FIELDS.includes(c.field as RuleConditionField) && (typeof c.value === 'string' || typeof c.value === 'number');
}

function validateRuleItem(item: unknown): boolean {
  if (isRuleCondition(item)) return true;
  if (!item || typeof item !== 'object') return false;
  const r = item as Record<string, unknown>;
  if (r.rule_operator !== 'AND' && r.rule_operator !== 'OR') return false;
  const arr = (r.items ?? r.conditions) as unknown[];
  if (!Array.isArray(arr) || arr.length === 0) return false;
  return arr.every((i) => validateRuleItem(i));
}

function validateRule(rule: unknown): rule is Rule {
  if (!rule || typeof rule !== 'object') return false;
  const r = rule as Record<string, unknown>;
  if (r.rule_operator !== 'AND' && r.rule_operator !== 'OR') return false;
  const arr = (r.items ?? r.conditions) as unknown[];
  if (!Array.isArray(arr) || arr.length === 0) return false;
  return arr.every((i) => validateRuleItem(i));
}

/** Normalize rule: convert legacy `conditions` to `items` */
function normalizeRule(rule: Rule): Rule {
  if (Array.isArray((rule as any).items)) return rule;
  const conds = (rule as any).conditions;
  if (Array.isArray(conds)) return { rule_operator: rule.rule_operator, items: conds as RuleItem[] };
  return rule;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      categoryId,
      category,
      alias,
      typeOfCategory,
      l1Parent = '',
      l2Parent = '',
      l3Parent = '',
      publish,
      priorityOrder,
      type,
      description,
      rule,
      substores,
    } = body;

    if (!category || typeof category !== 'string' || !alias || typeof alias !== 'string' || !typeOfCategory || typeof typeOfCategory !== 'string') {
      return NextResponse.json(
        { success: false, message: 'category, alias, and typeOfCategory are required' },
        { status: 400 }
      );
    }
    if (description == null || typeof description !== 'string' || !String(description).trim()) {
      return NextResponse.json(
        { success: false, message: 'description is required' },
        { status: 400 }
      );
    }
    if (!type || (type !== 'Automatic' && type !== 'Manual')) {
      return NextResponse.json(
        { success: false, message: 'type is required (Automatic or Manual)' },
        { status: 400 }
      );
    }
    const ruleItems = rule && typeof rule === 'object' ? ((rule as any).items ?? (rule as any).conditions) : [];
    if (type === 'Automatic' && (!rule || !validateRule(rule) || !Array.isArray(ruleItems) || ruleItems.length === 0)) {
      return NextResponse.json(
        { success: false, message: 'rule with at least one condition is required when type is Automatic' },
        { status: 400 }
      );
    }
    if (!Array.isArray(substores)) {
      return NextResponse.json(
        { success: false, message: 'substores must be an array' },
        { status: 400 }
      );
    }
    if (typeof publish !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'publish must be a boolean' },
        { status: 400 }
      );
    }
    const order = Number(priorityOrder);
    if (Number.isNaN(order) || order < 0) {
      return NextResponse.json(
        { success: false, message: 'priorityOrder must be a non-negative number' },
        { status: 400 }
      );
    }

    const categoryData: Parameters<typeof CategoryModel.create>[0] = {
      category: String(category).trim(),
      alias: String(alias).trim(),
      typeOfCategory: String(typeOfCategory).trim(),
      l1Parent: String(l1Parent ?? '').trim(),
      l2Parent: String(l2Parent ?? '').trim(),
      l3Parent: String(l3Parent ?? '').trim(),
      publish: Boolean(publish),
      priorityOrder: order,
    };

    // Only set categoryId if explicitly provided; will be set to StoreHippo _id after sync
    if (categoryId != null && String(categoryId).trim()) {
      categoryData.categoryId = String(categoryId).trim();
    }
    categoryData.type = String(type).trim();
    categoryData.description = String(description).trim();
    if (rule != null && validateRule(rule)) categoryData.rule = normalizeRule(rule as Rule);
    if (Array.isArray(substores)) {
      categoryData.substores = substores.map((s: unknown) => String(s).trim()).filter(Boolean);
    }

    // Alias must be unique in our database
    const existingByAlias = await CategoryModel.findByAlias(categoryData.alias);
    if (existingByAlias) {
      return NextResponse.json(
        { success: false, message: 'A category with this alias already exists.' },
        { status: 400 }
      );
    }

    let created = await CategoryModel.create(categoryData);
    
    // Sync to StoreHippo after successful MongoDB save
    const storeHippoResult = await syncCategoryToStoreHippo(categoryData);
    
    if (!storeHippoResult.success) {
      // Log StoreHippo sync failure but don't fail the entire request
      console.error('StoreHippo sync failed for category:', categoryData.categoryId, storeHippoResult.error);
      
      return NextResponse.json({ 
        success: true, 
        data: created,
        warning: `Category created locally but StoreHippo sync failed: ${storeHippoResult.error}`
      });
    }

    // Save StoreHippo _id to our database (fetched via GET with alias filter)
    if (storeHippoResult.storeHippoId && created._id) {
      console.log(`[API] Updating category ${created._id} with StoreHippo _id: ${storeHippoResult.storeHippoId}`);
      await CategoryModel.update(created._id, { categoryId: storeHippoResult.storeHippoId });
      created = { ...created, categoryId: storeHippoResult.storeHippoId } as typeof created;
      console.log(`[API] ✅ Category updated with StoreHippo id: ${storeHippoResult.storeHippoId}`);
    } else {
      // Fallback: use alias as categoryId if we couldn't get StoreHippo _id
      const fallbackId = String(alias).trim();
      console.warn(`[API] ⚠️ Could not get StoreHippo _id, using alias as fallback categoryId: ${fallbackId}`);
      await CategoryModel.update(created._id, { categoryId: fallbackId });
      created = { ...created, categoryId: fallbackId } as typeof created;
    }

    console.log('Category successfully synced to StoreHippo:', storeHippoResult.storeHippoId ?? categoryData.categoryId);
    return NextResponse.json({ 
      success: true, 
      data: created,
      storeHippoSync: true
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create category' },
      { status: 500 }
    );
  }
}










