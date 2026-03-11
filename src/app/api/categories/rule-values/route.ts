import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import type { RuleConditionField } from '@/models/category';
import { CategoryModel } from '@/models/category';

const RULE_FIELDS: RuleConditionField[] = ['Plant', 'variety', 'Colour', 'Height', 'Size', 'Type', 'Category'];

/** Map rule condition field to parentMaster field name for aggregation */
const FIELD_TO_PARENT_MASTER: Partial<Record<RuleConditionField, string>> = {
  Plant: 'plant',
  variety: 'variety',
  Colour: 'colour',
  Height: 'height',
  Size: 'size',
  Type: 'potType', // or 'type' for legacy
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const field = searchParams.get('field')?.trim() as RuleConditionField | null;
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);

    if (!field || !RULE_FIELDS.includes(field)) {
      return NextResponse.json(
        { success: false, message: `field is required and must be one of: ${RULE_FIELDS.join(', ')}` },
        { status: 400 }
      );
    }

    if (field === 'Category') {
      const categories = await CategoryModel.findAll();
      const values = (categories as { category?: string }[])
        .map((c) => (c.category || '').trim())
        .filter(Boolean);
      let unique = [...new Set(values)];
      if (search) {
        unique = unique.filter((v) => v.toLowerCase().includes(search));
      }
      unique.sort();
      return NextResponse.json({
        success: true,
        data: unique.slice(0, limit).map((v) => ({ value: v, label: v })),
      });
    }

    const parentField = FIELD_TO_PARENT_MASTER[field];
    if (!parentField) {
      return NextResponse.json({ success: true, data: [] });
    }

    const collection = await getCollection('parentMaster');
    const pipeline: object[] = [
      { $match: { [parentField]: { $exists: true, $ne: null } } },
      { $group: { _id: `$${parentField}` } },
      { $match: { _id: { $ne: null } } },
      { $sort: { _id: 1 } },
      { $limit: limit + 500 },
    ];

    const raw = await collection.aggregate(pipeline).toArray();
    let values: string[] = raw.map((r: { _id?: unknown }) => String(r._id ?? '').trim()).filter(Boolean);
    values = [...new Set(values)];

    if (search) {
      values = values.filter((v) => v.toLowerCase().includes(search));
    }
    values = values.slice(0, limit).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      success: true,
      data: values.map((v) => ({ value: v, label: v })),
    });
  } catch (error) {
    console.error('Error fetching rule values:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch rule values' },
      { status: 500 }
    );
  }
}
