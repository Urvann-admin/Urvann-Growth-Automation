import type { ProductType } from '@/models/parentMaster';
import type { ListingSection } from '@/models/listingProduct';
import { computeProductDisplayName } from '@/lib/productListingDisplayName';

export type StepId = 'product-info' | 'details' | 'pricing' | 'categories-images' | 'review';

export type NonParentStepId = 'non-parent-info' | 'non-parent-review';

/** Flow after user picks a product type on the add form */
export type ProductFlowType = ProductType;

export interface NonParentFormData {
  plant: string;
  vendorMasterId: string;
  /** Consumable: user-entered. Growing product: generated on the server (field unused for submit). */
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
  { id: 'non-parent-info', label: 'Product details', title: 'Name, vendor, product code, and link' },
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
  /** Comma-separated tag labels (same option set as listing tags). */
  tags: string;
  redirects: string;
  /** Hubs where a parent-type listing row is created (same flow as former Listing → Parent listing). */
  listingHubs: string[];
  /** Inventory / listing section for those rows (default main Listing). */
  listingSection: ListingSection;
  /**
   * When non-empty, used as the product final/display name instead of the auto-built string.
   * Empty string means "use auto" from plant + attributes.
   */
  finalNameOverride: string;
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
  tags: '',
  redirects: '',
  listingHubs: [],
  listingSection: 'listing',
  finalNameOverride: '',
};

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

/** Pot type options for parent product master */
export const POT_TYPE_OPTIONS = [
  { value: '', label: 'Select Pot Type' },
  { value: 'bag', label: 'Bag' },
  { value: 'pot', label: 'Pot' },
  { value: 'hanging', label: 'Hanging' },
  { value: 'terracota', label: 'Terracota' },
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

export function buildDefaultSeoTitle(displayName: string): string {
  const n = displayName.trim() || 'plant';
  return `Free Next Day Delivery | ${n}`;
}

export function buildDefaultSeoDescription(displayName: string): string {
  const n = displayName.trim() || 'plant';
  return `Buy ${n} at Urvann. Choose from 10000+ plants, gardening products and essentials. Order now to get free next day home delivery.`;
}

/** Full product label (plant + variety, size, pot, etc.) — auto-generated final name when override is empty. */
export function computeProductFinalName(data: ProductFormData): string {
  return computeProductDisplayName({
    plant: data.plant,
    otherNames: data.otherNames,
    variety: data.variety,
    colour: data.colour,
    height: data.height,
    size: data.size,
    potType: data.potType,
    mossStick: data.mossStick,
  });
}

/** Resolved label for API, SEO, and previews (override wins when set). */
export function getEffectiveFinalName(data: ProductFormData): string {
  const o = data.finalNameOverride.trim();
  if (o) return o;
  const c = computeProductFinalName(data).trim();
  return c || data.plant.trim() || 'plant';
}

/** After an attribute change, drop override if user was on auto or matched the previous auto string. */
export function syncFinalNameOverrideAfterAttributeChange(
  prev: ProductFormData,
  next: ProductFormData
): ProductFormData {
  const oldComputed = computeProductFinalName(prev).trim() || prev.plant.trim();
  const override = prev.finalNameOverride.trim();
  if (override === '' || override === oldComputed) {
    return { ...next, finalNameOverride: '' };
  }
  return { ...next, finalNameOverride: prev.finalNameOverride };
}

/** When plant/attributes change, refresh SEO if the user still has the auto-generated text. */
export function applySeoDefaultsIfStillAuto(prev: ProductFormData, next: ProductFormData): ProductFormData {
  const oldFn = getEffectiveFinalName(prev);
  const newFn = getEffectiveFinalName(next);
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
