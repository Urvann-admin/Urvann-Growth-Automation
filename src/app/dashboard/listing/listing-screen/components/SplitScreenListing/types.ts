import type { ParentMaster } from '@/models/parentMaster';
import type { ListingSection } from '@/models/listingProduct';
import type { HubParentCheckResult } from '@/lib/childListingHubSku';

/** Child listing parent dropdown: sourced from `listingProduct` (merged with Parent Master for row state). */
export interface ListingSourcedParentOption {
  listingId: string;
  listingSku: string;
  /** Hub on the source listing document (filter parent picker by context hub). */
  listingHub: string;
  parent: ParentMaster;
}

export interface SelectedImage {
  url: string;
  filename: string;
  collectionId: string;
  collectionName?: string;
  isTagged: boolean; // Already associated with a product
  size: number;
  uploadedAt: Date;
  /** Global serial number shown in the left image panel */
  serial: number;
}

export interface ParentItemRow {
  id: string;
  /** SKU of the parent in parentMaster */
  parentSku: string;
  /** Units of this parent used per ONE set */
  quantity: number;
  /** Snapshot of parent price at listing time */
  unitPrice: number;
  /** Full parent object when available (used for inventory/metadata) */
  parent?: ParentMaster;
}

/** Split-screen listing: queue base parents vs compose child products */
export type ListingScreenMode = 'parent' | 'child';

export interface ProductRow {
  /** Temporary ID for unsaved rows; parent mode uses `parent_<MongoId>` */
  id: string;
  /** Line-item serial number shown in the right table */
  serial: number;
  /** Denormalised list of parent SKUs (for filters / API) */
  parentSkus: string[];
  /** Detailed composition for this line item */
  parentItems: ParentItemRow[];
  /** Convenience: last-selected parent while editing */
  selectedParent?: ParentMaster;
  /** Images tagged to this line item */
  taggedImages: SelectedImage[];
  
  // Product details (derived / editable)
  plant: string;
  otherNames: string;
  variety: string;
  colour: string;
  height: number | '';
  /** Pot size in inches */
  size: number | '';
  /** Pot type */
  type: string;
  description: string;
  
  // Pricing and inventory
  /** Number of units in one set for this listing */
  setQuantity: number;
  /** Kept for backward-compatibility; mirrors setQuantity */
  quantity: number;
  /** Number of pots used per set */
  potQuantity: number;
  /** Calculated price per set */
  price: number;
  /** Calculated inventory: how many sets can be made */
  inventory_quantity: number;
  
  // Metadata
  /** Latest hub × parent SKU existence checks (from verify API). */
  hubParentChecks: HubParentCheckResult[];
  /** One or more hubs this product will be listed on. Each hub gets its own document + unique SKU on save. */
  hubs: string[];
  seller: string;
  categories: string[];
  collectionIds: string[];
  /** Generated listing name (computed from plant, variety, etc.); set after save */
  finalName?: string;
  /** Generated SKU (set after save) */
  sku?: string;
  /** Product tags (e.g. Bestseller, New Arrival) - array for multiselect */
  tags?: string[];
  /** Compare-at price shown as original/strikethrough price */
  compare_at_price?: number;
  /** Display sort order; defaults to 3000 */
  sort_order?: number;
  /** Publish status: 1 = published, 0 = unpublished (auto-set from inventory) */
  publish_status?: 0 | 1;

  // Status
  isValid: boolean;
  isSaved: boolean;
  validationErrors: Record<string, string>;
}

export type ViewMode = 'product-table';

export interface TaggedCombination {
  id: string;
  parentSku: string;
  parent: ParentMaster;
  imageUrls: string[];
  images: SelectedImage[];
  createdAt: Date;
}

export interface ExcelRow {
  id: string;
  combinationId: string; // Links to TaggedCombination
  parentSku: string;
  parentName: string;
  imageUrl: string;
  imageName: string;
  // Editable product fields
  plant: string;
  otherNames: string;
  variety: string;
  colour: string;
  height: number | '';
  size: number | '';
  type: string;
  description: string;
  quantity: number;
  price: number;
  inventory_quantity: number;
  hubs: string[];
  seller: string;
  categories: string[];
  collectionIds: string[];
  // Status
  isValid: boolean;
  validationErrors: Record<string, string>;
}

export interface ListingState {
  selectedImages: SelectedImage[];
  productRows: ProductRow[];
  /**
   * Child listing only: global hub filter (must be set before photo rows appear).
   * Parent picker options are limited to listing products for this hub.
   */
  childContextHub: string;
  availableParents: ListingSourcedParentOption[];
  selectedParent: ParentMaster | null;
  viewMode: ViewMode;
  validationErrors: Record<string, string>;
  isSaving: boolean;
  isLoading: boolean;
  listingMode: ListingScreenMode;
  parentListPage: number;
  parentListTotalPages: number;
  parentListTotal: number;
  parentListLimit: number;
  parentListLoading: boolean;
  /** Parent listing tab: filter API results by base parent SKU (partial match). */
  parentSkuFilter: string;
  /** Parent listing tab: filter by display name fields (plant, finalName, etc.). */
  parentNameFilter: string;
}

export interface ImageCollection {
  _id: string;
  name?: string;
  uploadType: string;
  imageCount: number;
  totalSize: number;
  status: string;
  images: {
    url: string;
    filename: string;
    size: number;
    uploadedAt: Date;
  }[];
  createdAt: string;
}

export interface ListingScreenProps {
  section: ListingSection;
  onSuccess?: (products: any[]) => void;
  /** When true, sidebar is collapsed (72px); when false, open (240px). Used to position floating Save button. */
  sidebarCollapsed?: boolean;
}