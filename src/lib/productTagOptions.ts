import type { SelectOption } from '@/app/dashboard/listing/components/CustomSelect';

/** Fixed merchandising tags for parent master and listing products (multi-select). */
export const PRODUCT_TAG_OPTIONS: SelectOption[] = [
  { value: 'Bestseller', label: 'Bestseller' },
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
