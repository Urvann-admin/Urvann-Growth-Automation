export type StepId = 'product-info' | 'details' | 'pricing' | 'categories-images' | 'review';

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
  inventory_quantity: number | '';
  images: string[];
}

export const STEPS: { id: StepId; label: string; title: string }[] = [
  { id: 'product-info', label: 'Product Info', title: 'Basic product information' },
  { id: 'details', label: 'Details', title: 'Attributes & description' },
  { id: 'pricing', label: 'Pricing', title: 'Selling price' },
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
  inventory_quantity: '',
  images: [],
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

/** Pot type: bag or pot only */
export const POT_TYPE_OPTIONS = [
  { value: '', label: 'Select Pot Type' },
  { value: 'bag', label: 'Bag' },
  { value: 'pot', label: 'Pot' },
];
