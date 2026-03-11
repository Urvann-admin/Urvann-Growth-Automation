import type { ParentMaster } from '@/models/parentMaster';
import type { ListingSection } from '@/models/listingProduct';

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

export interface ProductRow {
  /** Temporary ID for unsaved rows */
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
  hub: string;
  seller: string;
  categories: string[];
  collectionIds: string[];
  /** Generated listing name (computed from plant, variety, etc.); set after save */
  finalName?: string;
  /** Generated SKU (set after save) */
  sku?: string;
  /** Product tag (e.g. Bestseller, New Arrival) */
  tag?: string;
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
  hub: string;
  seller: string;
  categories: string[];
  collectionIds: string[];
  // Status
  isValid: boolean;
  validationErrors: Record<string, string>;
}

export interface SplitScreenState {
  selectedImages: SelectedImage[];
  productRows: ProductRow[];
  availableParents: ParentMaster[];
  selectedParent: ParentMaster | null;
  viewMode: ViewMode;
  validationErrors: Record<string, string>;
  isSaving: boolean;
  isLoading: boolean;
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

export interface SplitScreenListingProps {
  section: ListingSection;
  onSuccess?: (products: any[]) => void;
  /** When true, sidebar is collapsed (72px); when false, open (240px). Used to position floating Save button. */
  sidebarCollapsed?: boolean;
}