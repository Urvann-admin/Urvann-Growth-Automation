import { FolderTree, Package, List, Plus, ListIcon, type LucideIcon } from 'lucide-react';

export type ListingTab =
  | 'category-add'
  | 'category-view'
  | 'product-add'
  | 'product-view-parent'
  | 'listing';

export const CATEGORY_SUB_TABS: { id: ListingTab; label: string }[] = [
  { id: 'category-add', label: 'Add Category' },
  { id: 'category-view', label: 'View Category' },
];

export const PRODUCT_SUB_TABS: { id: ListingTab; label: string }[] = [
  { id: 'product-add', label: 'Add Product' },
  { id: 'product-view-parent', label: 'View Parent' },
];

export interface ListingTabConfig {
  id: ListingTab;
  label: string;
  subtitle: string;
  icon: LucideIcon;
}

export const TAB_CONFIG: ListingTabConfig[] = [
  { id: 'category-add', label: 'Add Category', subtitle: 'Create a new category', icon: Plus },
  { id: 'category-view', label: 'View Category', subtitle: 'View and edit categories', icon: ListIcon },
  { id: 'product-add', label: 'Add Product', subtitle: 'Create a new product', icon: Plus },
  { id: 'product-view-parent', label: 'View Parent', subtitle: 'View parent products', icon: ListIcon },
  { id: 'listing', label: 'Listing', subtitle: 'Listing rules and status', icon: List },
];

export const LISTING_TOP_LEVEL_TABS: ListingTab[] = ['listing'];
