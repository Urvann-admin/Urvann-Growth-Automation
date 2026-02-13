import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { CategoryModel } from '@/models/category';
import type { Rule, RuleCondition, RuleConditionField, RuleItem } from '@/models/category';
import { updateCategoryInStoreHippo, deleteCategoryFromStoreHippo } from '@/lib/storeHippoCategories';

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

function normalizeRule(rule: Rule): Rule {
  if (Array.isArray((rule as any).items)) return rule;
  const conds = (rule as any).conditions;
  if (Array.isArray(conds)) return { rule_operator: rule.rule_operator, items: conds as RuleItem[] };
  return rule;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const category = await CategoryModel.findById(id);
    if (!category) {
      return NextResponse.json({ success: false, message: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch category' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'Invalid category ID' }, { status: 400 });
    }

    const existing = await CategoryModel.findById(id);
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Category not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      category: categoryName,
      alias,
      typeOfCategory,
      l1Parent,
      l2Parent,
      l3Parent,
      publish,
      priorityOrder,
      type,
      description,
      rule,
      substores,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (categoryName != null && typeof categoryName === 'string') updateData.category = categoryName.trim();
    if (alias != null && typeof alias === 'string') {
      const trimmed = alias.trim();
      if (trimmed !== (existing as any).alias) {
        const existingByAlias = await CategoryModel.findByAlias(trimmed);
        if (existingByAlias && String((existingByAlias as any)._id) !== id) {
          return NextResponse.json(
            { success: false, message: 'A category with this alias already exists.' },
            { status: 400 }
          );
        }
        updateData.alias = trimmed;
      }
    }
    if (typeOfCategory != null && typeof typeOfCategory === 'string') updateData.typeOfCategory = typeOfCategory.trim();
    if (l1Parent !== undefined) updateData.l1Parent = String(l1Parent ?? '').trim();
    if (l2Parent !== undefined) updateData.l2Parent = String(l2Parent ?? '').trim();
    if (l3Parent !== undefined) updateData.l3Parent = String(l3Parent ?? '').trim();
    if (typeof publish === 'boolean') updateData.publish = publish;
    if (priorityOrder !== undefined) {
      const order = Number(priorityOrder);
      if (!Number.isNaN(order) && order >= 0) updateData.priorityOrder = order;
    }
    if (type != null && (type === 'Automatic' || type === 'Manual')) updateData.type = type;
    if (description !== undefined) updateData.description = String(description ?? '').trim();
    if (rule !== undefined) {
      if (rule == null) updateData.rule = undefined;
      else if (validateRule(rule)) updateData.rule = normalizeRule(rule as Rule);
    }
    if (Array.isArray(substores)) updateData.substores = substores.map((s: unknown) => String(s).trim()).filter(Boolean);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, data: existing });
    }

    await CategoryModel.update(id, updateData as any);
    const updated = { ...existing, ...updateData };

    // Sync to StoreHippo (use existing categoryId = StoreHippo _id)
    const payloadForStoreHippo = {
      ...existing,
      ...updateData,
      categoryId: (existing as any).categoryId,
    };
    const storeHippoResult = await updateCategoryInStoreHippo(payloadForStoreHippo);

    if (!storeHippoResult.success) {
      console.error('StoreHippo update failed for category:', id, storeHippoResult.error);
      return NextResponse.json({
        success: true,
        data: updated,
        warning: `Category updated in DB but StoreHippo sync failed: ${storeHippoResult.error}`,
      });
    }

    return NextResponse.json({ success: true, data: updated, storeHippoSync: true });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid category ID' },
        { status: 400 }
      );
    }

    const category = await CategoryModel.findById(id);
    
    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
        { status: 404 }
      );
    }

    const errors: string[] = [];

    if ((category as any).categoryId) {
      console.log(`[Delete] Deleting category from StoreHippo: ${(category as any).categoryId}`);
      const storeHippoResult = await deleteCategoryFromStoreHippo((category as any).categoryId);
      if (!storeHippoResult.success) {
        console.warn(`[Delete] StoreHippo deletion failed: ${storeHippoResult.error}`);
        errors.push(`StoreHippo: ${storeHippoResult.error}`);
      }
    }

    const result = await CategoryModel.delete(id);
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Category not found in database' },
        { status: 404 }
      );
    }

    console.log(`[Delete] Category deleted from database: ${id}`);

    return NextResponse.json({ 
      success: true, 
      message: errors.length > 0 
        ? `Category deleted with warnings: ${errors.join('; ')}` 
        : 'Category deleted successfully from all systems',
      warnings: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
