import type { ProductType } from '@/models/parentMaster';
import type { ListingSection } from '@/models/listingProduct';

export type StepId = 'product-info' | 'details' | 'pricing' | 'categories-images' | 'review';

export type NonParentStepId = 'non-parent-info' | 'non-parent-review';

/** Flow after user picks a product type on the add form */
export type ProductFlowType = ProductType;

export interface NonParentFormData {
  plant: string;
  vendorMasterId: string;
  /** User-facing product code (API field `productCode`) */
  productCode: string;
  /** Base parent listing SKU to link to (API field `sku`) */
  parentSku: string;
  images: string[];
}

export const initialNonParentFormData: NonParentFormData = {
  plant: '',
  vendorMasterId: '',
  productCode: '',
  parentSku: '',
  images: [],
};

export const SHORT_STEPS: { id: NonParentStepId; label: string; title: string }[] = [
  { id: 'non-parent-info', label: 'Product details', title: 'Name, vendor, code, and link' },
  { id: 'non-parent-review', label: 'Review', title: 'Review and create' },
];

export interface ProductFormData {
  plant: string;
  otherNames: string;
  variety: string;
  colour: string;
  height: number | '';
  mossStick: string;
  size: number | '';
  potType: string;
  seller: string;
  description: string;
  categories: string[];
  collectionIds: string[];
  sellingPrice: number | '';
  /** Compare-at price (optional; stored as `compare_at` on parent master) */
  compare_at: number | '';
  /** Tax rate: `5` or `18` (labels 5% / 18%); empty = not set */
  tax: string;
  /** Parent type: plant or pot (optional) */
  parentKind: string;
  /** SEO title (defaults from plant name; editable on review) */
  seoTitle: string;
  /** SEO description (defaults from plant name; editable on review) */
  seoDescription: string;
  inventory_quantity: number | '';
  images: string[];
  features: string;
  redirects: string;
  /** Hubs where a parent-type listing row is created (same flow as former Listing → Parent listing). */
  listingHubs: string[];
  /** Inventory / listing section for those rows (default main Listing). */
  listingSection: ListingSection;
}

export const STEPS: { id: StepId; label: string; title: string }[] = [
  { id: 'product-info', label: 'Product Info', title: 'Basic product information' },
  { id: 'details', label: 'Details', title: 'Attributes & description' },
  { id: 'pricing', label: 'Pricing', title: 'Selling & compare-at price' },
  { id: 'categories-images', label: 'Categories & images', title: 'Categories and product images' },
  { id: 'review', label: 'Review', title: 'Review and create' },
];

export const initialFormData: ProductFormData = {
  plant: '',
  otherNames: '',
  variety: '',
  colour: '',
  height: '',
  mossStick: '',
  size: '',
  potType: '',
  seller: '',
  description: '',
  categories: [],
  collectionIds: [],
  sellingPrice: '',
  compare_at: '',
  tax: '',
  parentKind: '',
  seoTitle: '',
  seoDescription: '',
  inventory_quantity: '',
  images: [],
  features: '',
  redirects: '',
  listingHubs: [],
  listingSection: 'listing',
};

/** Placeholder options – define exact values later */
export const FEATURES_OPTIONS = [
  { value: '', label: 'Select Features' },
  { value: 'option-a', label: 'Option A' },
  { value: 'option-b', label: 'Option B' },
  { value: 'option-c', label: 'Option C' },
];

/** Placeholder options – define exact values later */
export const REDIRECTS_OPTIONS = [
  { value: '', label: 'Select Redirects' },
  { value: 'redirect-1', label: 'Redirect 1' },
  { value: 'redirect-2', label: 'Redirect 2' },
  { value: 'redirect-3', label: 'Redirect 3' },
];

export const COLOUR_OPTIONS = [
  { value: '', label: 'Select Colour' },
  { value: 'Red', label: 'Red' },
  { value: 'Blue', label: 'Blue' },
  { value: 'Yellow', label: 'Yellow' },
  { value: 'Pink', label: 'Pink' },
];

export const MOSS_STICK_OPTIONS = [
  { value: '', label: 'Select Moss Stick' },
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
  { value: 'Optional', label: 'Optional' },
];

/** Pot type: bag or pot only */
export const POT_TYPE_OPTIONS = [
  { value: '', label: 'Select Pot Type' },
  { value: 'bag', label: 'Bag' },
  { value: 'pot', label: 'Pot' },
];

export const TAX_OPTIONS = [
  { value: '', label: 'Select tax (optional)' },
  { value: '5', label: '5%' },
  { value: '18', label: '18%' },
];

export const PARENT_KIND_OPTIONS = [
  { value: '', label: 'Select parent type (optional)' },
  { value: 'plant', label: 'Plant' },
  { value: 'pot', label: 'Pot' },
];

export function buildDefaultSeoTitle(plantName: string): string {
  const n = plantName.trim() || 'plant';
  return `Free Next Day Delivery | ${n}`;
}

export function buildDefaultSeoDescription(plantName: string): string {
  const n = plantName.trim() || 'plant';
  return `Buy ${n} at Urvann. Choose from 10000+ plants, gardening products and essentials. Order now to get free next day home delivery.`;
}
