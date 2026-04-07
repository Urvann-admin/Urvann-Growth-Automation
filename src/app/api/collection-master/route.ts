import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { CollectionMasterModel } from '@/models/collectionMaster';
import { slug } from '@/lib/utils';
import {
  pushCollectionToStoreHippo,
  type StoreHippoFilterItem,
} from '@/lib/storeHippoCollections';

// ─── Operator mapping: our UI labels → StoreHippo values ─────────────────────
const OPERATOR_MAP: Record<string, string> = {
  'Equals': 'eq',
  'Not Equals': 'neq',
  'greater than': 'greater_than',
  'less than': 'less_than',
  'Has': 'has',
  'Have not': 'have_not',
};

// ─── Field mapping: our UI labels → StoreHippo field names ────────────────────
// Only fields listed here are sent to StoreHippo on create. Add a key when SH supports
// that rule field; UI-only fields (e.g. Plant, Color) stay in MongoDB only (collectionMaster.filters).
const FIELD_MAP: Record<string, string> = {
  Price: 'price',
  Categories: 'categories',
  Collections: 'collections',
};

// Fields whose value is sent as an array to StoreHippo
const MULTI_VALUE_FIELDS = new Set(['Categories', 'Collections']);

function isStoreHippoMappedRuleField(field: string): boolean {
  return Object.prototype.hasOwnProperty.call(FIELD_MAP, field);
}

/**
 * Convert our internal filter structure into StoreHippo-ready filter items.
 * Drops rule rows whose `field` is not in FIELD_MAP (full rules remain in MongoDB only).
 * Input filters: [{ rule_operator, items: [{field, operator, value?, values?}] }]
 */
function toStoreHippoFilters(rawFilters: unknown[]): StoreHippoFilterItem[] {
  if (!Array.isArray(rawFilters) || rawFilters.length === 0) return [];
  const group = rawFilters[0] as {
    rule_operator?: string;
    items?: { field: string; operator: string; value?: string; values?: string[] }[];
  };
  if (!Array.isArray(group?.items)) return [];

  const withOp = group.items.filter((item) => item.field && item.operator);
  const mappable = withOp.filter((item) => isStoreHippoMappedRuleField(item.field));
  if (withOp.length > mappable.length) {
    console.log(
      `[collection-master] StoreHippo: omitting ${withOp.length - mappable.length} dynamic rule(s) (field not mapped for SH); saving all ${withOp.length} in DB`
    );
  }

  return mappable.map((item) => {
    const shField = FIELD_MAP[item.field];
    const shOperator = OPERATOR_MAP[item.operator] ?? item.operator.toLowerCase();
    const isMulti = MULTI_VALUE_FIELDS.has(item.field);
    const shValue: string | string[] = isMulti
      ? Array.isArray(item.values) && item.values.length > 0
        ? item.values
        : []
      : item.value ?? '';
    return { field: shField, operator: shOperator, value: shValue };
  });
}

/**
 * GET /api/collection-master
 * List collections from our collectionMaster DB (after sync).
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search')?.trim() || '';

    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { alias: new RegExp(search, 'i') },
      ];
    }

    const result = await CollectionMasterModel.findWithPagination(
      query,
      page,
      limit,
      'sort_order',
      1
    );

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error('[collection-master] GET error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to list collections' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/collection-master
 * Create a new collection in MongoDB then push it to StoreHippo.
 * If StoreHippo push fails, the MongoDB document is deleted (rollback).
 */
export async function POST(request: NextRequest) {
  let mongoId: string | undefined;

  try {
    await connectDB();

    const body = await request.json();

    // ── Validate / parse fields ─────────────────────────────────────────────
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'name is required' },
        { status: 400 }
      );
    }

    const type: 'manual' | 'dynamic' = body.type === 'dynamic' ? 'dynamic' : 'manual';
    const publish = body.publish !== undefined && body.publish !== null ? Number(body.publish) : 0;
    const description =
      typeof body.description === 'string' ? body.description.trim() || undefined : undefined;
    const default_sort_order =
      typeof body.default_sort_order === 'string' && body.default_sort_order.trim()
        ? body.default_sort_order.trim()
        : undefined;
    const substore =
      Array.isArray(body.substore) && body.substore.length > 0
        ? body.substore.map((s: unknown) => String(s).trim()).filter(Boolean)
        : undefined;

    // Raw filters from the frontend (our internal format)
    const rawFilters: unknown[] =
      type === 'dynamic' && Array.isArray(body.filters) && body.filters.length > 0
        ? body.filters
        : [];

    const aliasInput =
      typeof body.alias === 'string' ? body.alias.trim() : '';
    const alias = aliasInput ? slug(aliasInput) : slug(name);

    // ── Save to MongoDB first (with a placeholder storeHippoId) ────────────
    const mongoDoc: Record<string, unknown> = {
      storeHippoId: `pending-${crypto.randomUUID()}`,
      name,
      type,
      alias,
      publish: Number.isFinite(publish) ? publish : 0,
      ...(description !== undefined && { description }),
      ...(default_sort_order !== undefined && { default_sort_order }),
      ...(substore !== undefined && { substore }),
      ...(rawFilters.length > 0 && { filters: rawFilters }),
    };

    const created = await CollectionMasterModel.create(mongoDoc as Parameters<typeof CollectionMasterModel.create>[0]);
    mongoId = String(created._id);

    // ── Push to StoreHippo ─────────────────────────────────────────────────
    const shFilters = type === 'dynamic' ? toStoreHippoFilters(rawFilters) : [];

    const shPayload = {
      name,
      alias,
      publish: Number.isFinite(publish) ? publish : 0,
      type,
      ...(description !== undefined && { description }),
      ...(default_sort_order !== undefined && { default_sort_order }),
      ...(substore !== undefined && { substore }),
      ...(shFilters.length > 0 && { filters: shFilters }),
    };

    let storeHippoId: string;
    try {
      storeHippoId = await pushCollectionToStoreHippo(shPayload);
    } catch (shError) {
      // ── Rollback: delete the MongoDB document ───────────────────────────
      console.error('[collection-master] StoreHippo push failed – rolling back MongoDB doc:', shError);
      try {
        await CollectionMasterModel.delete(mongoId);
      } catch (deleteErr) {
        console.error('[collection-master] Rollback delete failed:', deleteErr);
      }
      return NextResponse.json(
        {
          success: false,
          message: `Saved to MongoDB but StoreHippo push failed and was rolled back. Error: ${shError instanceof Error ? shError.message : String(shError)}`,
        },
        { status: 502 }
      );
    }

    // ── Update MongoDB with the real StoreHippo _id ────────────────────────
    await CollectionMasterModel.update(mongoId, { storeHippoId });
    const final = await CollectionMasterModel.findById(mongoId);

    return NextResponse.json({ success: true, data: final });
  } catch (error) {
    console.error('[collection-master] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create collection',
      },
      { status: 500 }
    );
  }
}
