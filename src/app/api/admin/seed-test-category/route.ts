/**
 * Admin endpoint to seed a test category with a nested rule structure.
 * POST /api/admin/seed-test-category
 */

import { NextResponse } from 'next/server';
import { CategoryModel } from '@/models/category';
import type { Rule } from '@/models/category';
import { getAllSubstores } from '@/shared/constants/hubs';

export const dynamic = 'force-dynamic';

const TEST_CATEGORY_ALIAS = 'test-nested-rule';

export async function POST() {
  try {
    // Check if test category already exists
    const existing = await CategoryModel.findByAlias(TEST_CATEGORY_ALIAS);
    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Test category already exists',
        data: existing,
      });
    }

    // Nested rule: Plant = Rose AND (Colour = Red OR Colour = White)
    const nestedRule: Rule = {
      rule_operator: 'AND',
      items: [
        { field: 'Plant', value: 'Rose' },
        {
          rule_operator: 'OR',
          items: [
            { field: 'Colour', value: 'Red' },
            { field: 'Colour', value: 'White' },
          ],
        },
      ],
    };

    const substores = getAllSubstores();
    const testCategory = await CategoryModel.create({
      category: 'Test Nested Rule Category',
      alias: TEST_CATEGORY_ALIAS,
      typeOfCategory: 'L1',
      l1Parent: '',
      l2Parent: '',
      l3Parent: '',
      type: 'Automatic',
      description: '<p>Test category with nested rule: Plant = Rose AND (Colour = Red OR Colour = White)</p>',
      rule: nestedRule,
      publish: true,
      priorityOrder: 9999,
      substores: substores.slice(0, 3), // Use first 3 substores for test
    });

    return NextResponse.json({
      success: true,
      message: 'Test category with nested rule created successfully',
      data: testCategory,
    });
  } catch (error) {
    console.error('Error seeding test category:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to seed test category' },
      { status: 500 }
    );
  }
}
