import { List, Plus, ListIcon, Upload, Image as ImageIcon, ScrollText, FileText, type LucideIcon } from 'lucide-react';

export type ListingTab =
  | 'category-add'
  | 'category-view'
  | 'product-add'
  | 'product-view-parent'
  | 'seller-add'
  | 'seller-view'
  | 'invoice-add'
  | 'invoice-view'
  | 'listing'
  | 'image-upload'
  | 'image-view'
  | 'upload-logs';

export const CATEGORY_SUB_TABS: { id: ListingTab; label: string }[] = [
  { id: 'category-add', label: 'Add Category' },
  { id: 'category-view', label: 'View Category' },
];

export const PRODUCT_SUB_TABS: { id: ListingTab; label: string }[] = [
  { id: 'product-add', label: 'Add Product' },
  { id: 'product-view-parent', label: 'View Parent' },
];

/** Image section: Add Image, View Image, Logs */
export const IMAGE_SUB_TABS: { id: ListingTab; label: string }[] = [
  { id: 'image-upload', label: 'Add Image' },
  { id: 'image-view', label: 'View Image' },
  { id: 'upload-logs', label: 'Logs' },
];

export const SELLER_SUB_TABS: { id: ListingTab; label: string }[] = [
  { id: 'seller-add', label: 'Add Seller' },
  { id: 'seller-view', label: 'View Seller' },
];

export const INVOICE_SUB_TABS: { id: ListingTab; label: string }[] = [
  { id: 'invoice-view', label: 'Purchase Master' },
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
  { id: 'seller-add', label: 'Add Seller', subtitle: 'Create a new seller', icon: Plus },
  { id: 'seller-view', label: 'View Seller', subtitle: 'View and edit sellers', icon: ListIcon },
  { id: 'invoice-view', label: 'Purchase Master', subtitle: 'View and edit purchase records', icon: ListIcon },
  { id: 'listing', label: 'Listing', subtitle: 'Listing rules and status', icon: List },
  { id: 'image-upload', label: 'Add Image', subtitle: 'Bulk upload images', icon: Upload },
  { id: 'image-view', label: 'View Image', subtitle: 'View image collections', icon: ListIcon },
  { id: 'upload-logs', label: 'Logs', subtitle: 'View image upload logs', icon: ScrollText },
];

/** No standalone top-level "Listing" tab; sections are under the Listing nav section */
export const LISTING_TOP_LEVEL_TABS: ListingTab[] = [];

/** Section tabs shown in main content when sidebar "Listing" is active */
export type ListingSectionTab = 'listing' | 'revival' | 'growth' | 'consumer';

export interface ListingSectionTabConfig {
  id: ListingSectionTab;
  label: string;
}

export const LISTING_SECTION_TABS: ListingSectionTabConfig[] = [
  { id: 'listing', label: 'Listing' },
  { id: 'revival', label: 'Revival' },
  { id: 'growth', label: 'Growth' },
  { id: 'consumer', label: 'Consumer' },
];
