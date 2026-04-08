import type { SelectOption } from '@/app/dashboard/listing/components/CustomSelect';

/** Applied to every first-time listing created from the child listing split screen. */
export const CHILD_LISTING_NEW_IN_TAG = 'new-in';

/** Ensures child listing saves always include `new-in` (deduped). */
export function tagsWithChildListingNewIn(tags: string[] | undefined): string[] {
  return [...new Set([...(tags ?? []), CHILD_LISTING_NEW_IN_TAG])];
}

/** Fixed merchandising tags for parent master and listing products (multi-select). */
export const PRODUCT_TAG_OPTIONS: SelectOption[] = [
  { value: 'Bestseller', label: 'Bestseller' },
  { value: CHILD_LISTING_NEW_IN_TAG, label: 'New In' },
  { value: 'New Arrival', label: 'New Arrival' },
  { value: 'Sale', label: 'Sale' },
  { value: 'Featured', label: 'Featured' },
  { value: 'Trending', label: 'Trending' },
  { value: 'Clearance', label: 'Clearance' },
  { value: 'Limited Stock', label: 'Limited Stock' },
];

/** Parse comma-separated tags from form fields (same pattern as Features). */
export function parseTagsCsv(csv: string): string[] {
  return String(csv ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
