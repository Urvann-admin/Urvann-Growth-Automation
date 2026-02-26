import type { ListingFormData } from '@/app/dashboard/listing/listing-screen/components/ListingProductForm/types';
import type { ParentMaster } from '@/models/parentMaster';
import type { ListingSection } from '@/models/listingProduct';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Comprehensive validation for listing product form data
 */
export function validateListingProductForm(
  formData: ListingFormData,
  selectedParents: ParentMaster[],
  section: ListingSection
): ValidationResult {
  const errors: Record<string, string> = {};

  // Parent selection validation
  const isParentListing = formData.listingType === 'parent';
  if (!formData.parentSkus || formData.parentSkus.length === 0) {
    errors.parentSkus = isParentListing ? 'Please select one parent product' : 'At least one parent product must be selected';
  } else if (isParentListing && formData.parentSkus.length > 1) {
    errors.parentSkus = 'When listing a parent, only one product can be selected';
  } else {
    const missingParents = formData.parentSkus.filter(
      sku => !selectedParents.some(parent => parent.sku === sku)
    );
    if (missingParents.length > 0) {
      errors.parentSkus = `Parent data missing for SKUs: ${missingParents.join(', ')}`;
    }
  }

  // Product details validation
  if (!formData.plant || !formData.plant.trim()) {
    errors.plant = 'Plant name is required';
  } else if (formData.plant.trim().length < 2) {
    errors.plant = 'Plant name must be at least 2 characters';
  }

  // Numeric field validation
  if (formData.height !== '' && formData.height !== undefined) {
    const height = Number(formData.height);
    if (isNaN(height) || height < 0) {
      errors.height = 'Height must be a positive number';
    } else if (height > 100) {
      errors.height = 'Height seems unrealistic (max 100 feet)';
    }
  }

  if (formData.size !== '' && formData.size !== undefined) {
    const size = Number(formData.size);
    if (isNaN(size) || size < 0) {
      errors.size = 'Size must be a positive number';
    } else if (size > 1000) {
      errors.size = 'Size seems unrealistic (max 1000 inches)';
    }
  }

  // Quantity validation (parent listing always uses quantity 1)
  const quantity = isParentListing ? 1 : Number(formData.quantity);

  if (!isParentListing) {
    if (!formData.quantity || formData.quantity === '') {
      errors.quantity = 'Quantity is required';
    } else if (isNaN(quantity) || quantity <= 0) {
      errors.quantity = 'Quantity must be a positive number';
    } else if (!Number.isInteger(quantity)) {
      errors.quantity = 'Quantity must be a whole number';
    } else if (quantity > 10000) {
      errors.quantity = 'Quantity seems unrealistic (max 10,000)';
    }
  }

  // Check if quantity is available from all parents (for child listing)
  if (!errors.quantity && selectedParents.length > 0 && !isParentListing) {
    const insufficientParents = selectedParents.filter(parent => {
      const availableQuantity = parent.inventory_quantity ?? 0;
      return availableQuantity < quantity;
    });

    if (insufficientParents.length > 0) {
      const parentNames = insufficientParents.map(p => `${p.plant} (${p.sku})`).join(', ');
      errors.quantity = `Insufficient quantity available from: ${parentNames}`;
    }
  }

  // Hub validation
  if (!formData.hub || !formData.hub.trim()) {
    errors.hub = 'Hub is required';
  }

  // Categories validation
  if (!formData.categories || formData.categories.length === 0) {
    errors.categories = 'At least one category is required';
  } else {
    // Check for valid category format
    const invalidCategories = formData.categories.filter(cat => 
      !cat || typeof cat !== 'string' || cat.trim().length === 0
    );
    if (invalidCategories.length > 0) {
      errors.categories = 'All categories must be valid non-empty strings';
    }
  }

  // Images validation
  if (!formData.images || formData.images.length === 0) {
    errors.images = 'At least one image is required';
  } else {
    // Check for valid image URLs
    const invalidImages = formData.images.filter(img => 
      !img || typeof img !== 'string' || !isValidImageUrl(img)
    );
    if (invalidImages.length > 0) {
      errors.images = 'All images must be valid URLs';
    }
  }

  // Business logic validation
  if (formData.price < 0) {
    errors.price = 'Calculated price cannot be negative';
  } else if (formData.price === 0 && selectedParents.length > 0) {
    errors.price = 'Price calculation resulted in zero - check parent prices';
  }

  if (formData.inventory_quantity < 0) {
    errors.inventory_quantity = 'Inventory quantity cannot be negative';
  }

  // Section-specific validation
  if (!['listing', 'revival', 'growth', 'consumer'].includes(formData.section)) {
    errors.section = 'Invalid section specified';
  }

  // Status validation
  if (!['draft', 'listed', 'published'].includes(formData.status)) {
    errors.status = 'Invalid status specified';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate parent selection specifically
 */
export function validateParentSelection(
  parentSkus: string[],
  selectedParents: ParentMaster[],
  section: ListingSection,
  requiredQuantity: number
): ValidationResult {
  const errors: Record<string, string> = {};

  if (parentSkus.length === 0) {
    errors.parentSkus = 'At least one parent product must be selected';
    return { isValid: false, errors };
  }

  // Check if all SKUs have corresponding parent data
  const missingParents = parentSkus.filter(
    sku => !selectedParents.some(parent => parent.sku === sku)
  );
  if (missingParents.length > 0) {
    errors.parentSkus = `Parent data not found for: ${missingParents.join(', ')}`;
  }

  // Check quantity availability
  const insufficientParents = selectedParents.filter(parent => {
    const availableQuantity = parent.inventory_quantity ?? 0;
    return availableQuantity < requiredQuantity;
  });

  if (insufficientParents.length > 0) {
    const details = insufficientParents.map(parent => {
      const available = parent.inventory_quantity ?? 0;
      return `${parent.plant} (${parent.sku}): ${available} available, ${requiredQuantity} required`;
    }).join('; ');
    errors.quantity = `Insufficient quantities: ${details}`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate step-specific data
 */
export function validateStep(
  stepId: string,
  formData: ListingFormData,
  selectedParents: ParentMaster[],
  section: ListingSection
): ValidationResult {
  const errors: Record<string, string> = {};

  switch (stepId) {
    case 'listing-type':
      if (!formData.listingType || !['parent', 'child'].includes(formData.listingType)) {
        errors.listingType = 'Please choose whether you are listing a parent or a child product';
      }
      break;

    case 'parent-selection':
      if (formData.listingType === 'parent') {
        if (!formData.parentSkus || formData.parentSkus.length === 0) {
          errors.parentSkus = 'Please select one parent product';
        } else if (formData.parentSkus.length > 1) {
          errors.parentSkus = 'When listing a parent, select only one product';
        } else {
          const missing = formData.parentSkus.filter(sku => !selectedParents.some(p => p.sku === sku));
          if (missing.length > 0) {
            errors.parentSkus = 'Selected parent not found';
          }
        }
      } else {
        return validateParentSelection(formData.parentSkus, selectedParents, section, Number(formData.quantity) || 1);
      }
      break;

    case 'product-details':
      if (!formData.plant || !formData.plant.trim()) {
        errors.plant = 'Plant name is required';
      }
      break;

    case 'pricing-inventory':
      if (formData.listingType !== 'parent') {
        if (!formData.quantity || Number(formData.quantity) <= 0) {
          errors.quantity = 'Valid quantity is required';
        }
      }
      if (!formData.hub || !formData.hub.trim()) {
        errors.hub = 'Hub is required';
      }
      break;

    case 'categories-images':
      if (!formData.categories || formData.categories.length === 0) {
        errors.categories = 'At least one category is required';
      }
      if (!formData.images || formData.images.length === 0) {
        errors.images = 'At least one image is required';
      }
      break;

    case 'review':
      // Comprehensive validation for final step
      return validateListingProductForm(formData, selectedParents, section);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Simple URL validation for images
 */
function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Calculate maximum possible quantity based on parent availability
 */
export function calculateMaxQuantity(
  selectedParents: ParentMaster[],
  section: ListingSection
): number {
  if (selectedParents.length === 0) return 0;

  return Math.min(
    ...selectedParents.map(parent => parent.inventory_quantity ?? 0)
  );
}

/**
 * Calculate total price for given quantity and parents
 */
export function calculateTotalPrice(
  selectedParents: ParentMaster[],
  quantity: number
): number {
  return selectedParents.reduce((total, parent) => {
    return total + (parent.price || 0) * quantity;
  }, 0);
}

/**
 * Generate suggested product name
 */
export function generateProductName(formData: ListingFormData): string {
  const parts = [formData.plant];
  
  if (formData.otherNames) parts.push(formData.otherNames);
  if (formData.variety) parts.push(formData.variety);
  if (formData.colour) parts.push(formData.colour);
  if (formData.size) parts.push('in', String(formData.size), 'inch');
  if (formData.type) parts.push(formData.type);
  
  return parts.filter(Boolean).join(' ');
}