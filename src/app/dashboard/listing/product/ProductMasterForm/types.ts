export type StepId = 'basics' | 'pricing' | 'categories-images' | 'review';

export interface ProductFormData {
  plant: string;
  otherNames: string;
  variety: string;
  colour: string;
  height: number | '';
  mossStick: string;
  size: number | '';
  type: string;
  seller: string;
  sort_order: number | '';
  categories: string[];
  price: number | '';
  compare_price: number | '';
  publish: string;
  inventoryQuantity: number | '';
  inventory_management: string;
  inventory_management_level: string;
  inventory_allow_out_of_stock: number | '';
  images: string[];
  hub: string;
}

export const STEPS: { id: StepId; label: string; title: string }[] = [
  { id: 'basics', label: 'Basics', title: 'Product identity & details' },
  { id: 'pricing', label: 'Pricing', title: 'Price, inventory & publish' },
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
  type: '',
  seller: '',
  sort_order: '',
  categories: [],
  price: '',
  compare_price: '',
  publish: 'draft',
  inventoryQuantity: '',
  inventory_management: 'none',
  inventory_management_level: '',
  inventory_allow_out_of_stock: '',
  images: [],
  hub: '',
};

export const INVENTORY_MANAGEMENT_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'automatic', label: 'Automatic' },
  { value: 'none', label: 'None' },
];

export const INVENTORY_MANAGEMENT_LEVEL_OPTIONS = [
  { value: '', label: 'Leave empty' },
  { value: 'product', label: 'Product' },
];

export const MOSS_STICK_OPTIONS = [
  { value: '', label: 'Select Moss Stick' },
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
  { value: 'Optional', label: 'Optional' },
];

export const PLANT_TYPES = [
  { value: '', label: 'Select Type' },
  { value: 'Black Nursery Pot', label: 'Black Nursery Pot' },
  { value: 'Black Square Nursery Pot', label: 'Black Square Nursery Pot' },
  { value: 'Black Super Nursery Pot', label: 'Black Super Nursery Pot' },
  { value: 'Glass Bowl', label: 'Glass Bowl' },
  { value: 'Hanging Basket', label: 'Hanging Basket' },
  { value: 'Hanging Pot', label: 'Hanging Pot' },
  { value: 'Nursery Bag', label: 'Nursery Bag' },
  { value: 'Nursery Pot', label: 'Nursery Pot' },
  { value: 'White Nursery Pot', label: 'White Nursery Pot' },
];
