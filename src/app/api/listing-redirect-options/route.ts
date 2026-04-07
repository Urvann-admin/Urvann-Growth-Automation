import { NextResponse } from 'next/server';
import { CategoryModel } from '@/models/category';
import { CollectionMasterModel } from '@/models/collectionMaster';
import { buildBrowseRedirectUrl } from '@/lib/browseRedirectUrl';
import { makeRedirectOptionValue } from '@/lib/redirectOptionTokens';

export interface ListingRedirectOption {
  value: string;
  label: string;
}

/**
 * Dropdown options for parent `redirects`: full URLs built from category/collection aliases
 * using REDIRECT_URL (and optional REDIRECT_URL_COLLECTION for collections).
 */
export async function GET() {
  try {
    const [categories, collections] = await Promise.all([
      CategoryModel.findAll(),
      CollectionMasterModel.findAll({}),
    ]);

    /** One row per category/collection so the dropdown lists like other selects (no merge-by-URL). */
    const data: ListingRedirectOption[] = [];

    for (const c of categories as { _id?: unknown; alias?: string; category?: string }[]) {
      const alias = String(c.alias ?? '').trim();
      if (!alias) continue;
      const url = buildBrowseRedirectUrl(alias, 'category');
      if (!url) continue;
      const id = c._id != null ? String(c._id) : '';
      const title = String(c.category ?? alias).trim() || alias;
      data.push({
        value: makeRedirectOptionValue('c', id, url),
        label: `Category · ${title}`,
      });
    }

    for (const col of collections as { _id?: unknown; alias?: string; name?: string }[]) {
      const alias = String(col.alias ?? '').trim();
      if (!alias) continue;
      const url = buildBrowseRedirectUrl(alias, 'collection');
      if (!url) continue;
      const id = col._id != null ? String(col._id) : '';
      const title = String(col.name ?? alias).trim() || alias;
      data.push({
        value: makeRedirectOptionValue('k', id, url),
        label: `Collection · ${title}`,
      });
    }

    data.sort((a, b) => a.label.localeCompare(b.label));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[listing-redirect-options] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to build redirect options',
      },
      { status: 500 }
    );
  }
}
