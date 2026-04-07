import type { ListingSection, ListingStatus } from '@/models/listingProduct';
import { POT_TYPES_WITH_PRICING } from '@/shared/constants/pots';
import { computeProductDisplayName } from '@/lib/productListingDisplayName';

/** Whether the user is listing a parent product (single) or a child product (can be multi-parent). */
export type ListingType = 'parent' | 'child';

export type ListingStepId = 'listing-type' | 'parent-selection' | 'product-details' | 'pricing-inventory' | 'categories-images' | 'review';

export interface ListingFormData {
  /** First step: list a parent (single) or a child (multi-parent). */
  listingType: ListingType;
  // Parent selection
  parentSkus: string[];
  section: ListingSection;
  
  // Product details
  plant: string;
  otherNames: string;
  variety: string;
  colour: string;
  height: number | '';
  mossStick: string;
  size: number | '';
  type: string;
  description: string;
  
  // Pricing and inventory
  /** Number of units per set (for classic form this is the main quantity). */
  quantity: number | '';
  price: number; // Calculated automatically
  inventory_quantity: number; // Calculated automatically
  /** Tax rate derived from parent(s): max of parent tax values ('5' or '18'). */
  tax: string;
  
  // Categories and images
  categories: string[]; // Auto-populated + manual
  collectionIds: string[]; // Auto-populated from parents
  images: string[];
  
  // SEO fields (auto-generated from plant name; editable on review)
  seoTitle: string;
  seoDescription: string;

  // Redirect: combined unique redirects from parents; only one allowed per product (editable on review)
  redirect: string;

  // Features: combined unique features from plant parents (pot features ignored); editable on review
  features: string[];

  // Other fields
  seller: string;
  hub: string;
  status: ListingStatus;
}

export const LISTING_STEPS: { id: ListingStepId; label: string; title: string }[] = [
  { id: 'listing-type', label: 'Listing Type', title: 'List a parent or child product' },
  { id: 'parent-selection', label: 'Parent Selection', title: 'Select parent product(s)' },
  { id: 'product-details', label: 'Product Details', title: 'Product information & attributes' },
  { id: 'pricing-inventory', label: 'Pricing & Inventory', title: 'Quantity and calculated pricing' },
  { id: 'categories-images', label: 'Categories & Images', title: 'Categories and product images' },
  { id: 'review', label: 'Review', title: 'Review and create listing product' },
];

export const initialListingFormData: ListingFormData = {
  listingType: 'child',
  parentSkus: [],
  section: 'listing',
  plant: '',
  otherNames: '',
  variety: '',
  colour: '',
  height: '',
  mossStick: '',
  size: '',
  type: '',
  description: '',
  quantity: '',
  price: 0,
  inventory_quantity: 0,
  tax: '',
  categories: [],
  collectionIds: [],
  images: [],
  seoTitle: '',
  seoDescription: '',
  redirect: '',
  features: [],
  seller: '',
  hub: '',
  status: 'draft',
};

export function buildDefaultSeoTitle(displayName: string): string {
  const n = displayName.trim() || 'plant';
  return `Free Next Day Delivery | ${n}`;
}

export function buildDefaultSeoDescription(displayName: string): string {
  const n = displayName.trim() || 'plant';
  return `Buy ${n} at Urvann. Choose from 10000+ plants, gardening products and essentials. Order now to get free next day home delivery.`;
}

/** Same building blocks as Product Master final name (plant + attributes). */
export function computeListingDisplayName(data: ListingFormData): string {
  return computeProductDisplayName({
    plant: data.plant,
    otherNames: data.otherNames,
    variety: data.variety,
    colour: data.colour,
    height: data.height,
    size: data.size,
    type: data.type,
    mossStick: data.mossStick,
  });
}

export function applyListingSeoDefaultsIfStillAuto(
  prev: ListingFormData,
  next: ListingFormData
): ListingFormData {
  const oldFn = computeListingDisplayName(prev).trim() || prev.plant.trim() || 'plant';
  const newFn = computeListingDisplayName(next).trim() || next.plant.trim() || 'plant';
  if (oldFn === newFn) return next;
  const out = { ...next };
  const oldT = buildDefaultSeoTitle(oldFn);
  const oldD = buildDefaultSeoDescription(oldFn);
  if (!prev.seoTitle.trim() || prev.seoTitle === oldT) {
    out.seoTitle = buildDefaultSeoTitle(newFn);
  }
  if (!prev.seoDescription.trim() || prev.seoDescription === oldD) {
    out.seoDescription = buildDefaultSeoDescription(newFn);
  }
  return out;
}

export const MOSS_STICK_OPTIONS = [
  { value: '', label: 'Select Moss Stick' },
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
  { value: 'Optional', label: 'Optional' },
];

export const PLANT_TYPES = [
  { value: '', label: 'Select Type' },
  ...POT_TYPES_WITH_PRICING.map((cfg) => ({
    value: cfg.value,
    label: cfg.value,
  })),
];

export const LISTING_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'listed', label: 'Listed' },
  { value: 'published', label: 'Published' },
];