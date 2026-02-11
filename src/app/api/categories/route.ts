import { NextRequest, NextResponse } from 'next/server';
import { CategoryModel } from '@/models/category';
import type { Rule, RuleConditionField } from '@/models/category';
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

function validateRule(rule: unknown): rule is Rule {
  if (!rule || typeof rule !== 'object') return false;
  const r = rule as Record<string, unknown>;
  if (r.rule_operator !== 'AND' && r.rule_operator !== 'OR') return false;
  if (!Array.isArray(r.conditions)) return false;
  return (r.conditions as unknown[]).every((c) => {
    if (!c || typeof c !== 'object') return false;
    const cond = c as Record<string, unknown>;
    return typeof cond.field === 'string' && RULE_CONDITION_FIELDS.includes(cond.field as RuleConditionField) && (typeof cond.value === 'string' || typeof cond.value === 'number');
  });
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
    if (type === 'Automatic' && (!rule || !validateRule(rule) || !(rule as Rule).conditions?.length)) {
      return NextResponse.json(
        { success: false, message: 'rule with at least one condition is required when type is Automatic' },
        { status: 400 }
      );
    }
    if (!Array.isArray(substores) || substores.length === 0 || !substores.some((s: unknown) => String(s).trim())) {
      return NextResponse.json(
        { success: false, message: 'at least one substore is required' },
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

    // Use provided categoryId or fall back to alias for internal ID
    categoryData.categoryId = (categoryId != null && String(categoryId).trim()) ? String(categoryId).trim() : String(alias).trim();
    categoryData.type = String(type).trim();
    categoryData.description = String(description).trim();
    if (rule != null && validateRule(rule)) categoryData.rule = rule as Rule;
    if (Array.isArray(substores)) {
      categoryData.substores = substores.map((s: unknown) => String(s).trim()).filter(Boolean);
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
      await CategoryModel.update(created._id, { categoryId: storeHippoResult.storeHippoId });
      created = { ...created, categoryId: storeHippoResult.storeHippoId } as typeof created;
      console.log('Category updated with StoreHippo id:', storeHippoResult.storeHippoId);
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










