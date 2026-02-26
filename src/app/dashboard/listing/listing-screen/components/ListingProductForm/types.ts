import type { ListingSection, ListingStatus } from '@/models/listingProduct';
import { POT_TYPES_WITH_PRICING } from '@/shared/constants/pots';

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
  
  // Categories and images
  categories: string[]; // Auto-populated + manual
  collectionIds: string[]; // Auto-populated from parents
  images: string[];
  
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
  categories: [],
  collectionIds: [],
  images: [],
  seller: '',
  hub: '',
  status: 'draft',
};

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