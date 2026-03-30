'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Save, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { ListingStepId, ListingFormData } from './types';
import { LISTING_STEPS, initialListingFormData, buildDefaultSeoTitle, buildDefaultSeoDescription } from './types';
import type { ListingSection } from '@/models/listingProduct';
import type { ParentMaster } from '@/models/parentMaster';
import { StepListingType } from './steps/StepListingType';
import { StepParentSelection } from './steps/StepParentSelection';
import { StepProductDetails } from './steps/StepProductDetails';
import { StepPricingInventory } from './steps/StepPricingInventory';
import { StepCategoriesImages } from './steps/StepCategoriesImages';
import { StepReview } from './steps/StepReview';
import { useListingFormPersistence, useListingFormState } from '../../hooks/useListingFormPersistence';
import { validateStep } from '@/lib/listingProductValidation';

export interface ListingProductFormProps {
  section: ListingSection;
  onSuccess?: (listingProduct: any) => void;
  onCancel?: () => void;
}

export function ListingProductForm({
  section,
  onSuccess,
  onCancel,
}: ListingProductFormProps) {
  // Get initial state from persistence
  const { initialFormData, initialStepIndex, clearPersistedState } = useListingFormState(
    section,
    { ...initialListingFormData, section }
  );

  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const [formData, setFormData] = useState<ListingFormData>(initialFormData);
  const [selectedParents, setSelectedParents] = useState<ParentMaster[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  /** When listing a parent, track which parent we last synced from so we only overwrite when selection changes. */
  const lastSyncedParentSkuRef = useRef<string | null>(null);

  // Set up form persistence
  useListingFormPersistence(section, formData, stepIndex);

  // When listing a parent: populate product-detail fields from the selected parent (all fields remain editable)
  useEffect(() => {
    if (formData.listingType !== 'parent' || selectedParents.length !== 1) {
      lastSyncedParentSkuRef.current = null;
      return;
    }
    const parent = selectedParents[0];
    const parentSku = parent.sku ?? '';
    if (parentSku === lastSyncedParentSkuRef.current) return;
    lastSyncedParentSkuRef.current = parentSku;
    setFormData(prev => ({
      ...prev,
      quantity: 1,
      plant: parent.plant ?? prev.plant,
      otherNames: parent.otherNames ?? prev.otherNames,
      variety: parent.variety ?? prev.variety,
      colour: parent.colour ?? prev.colour,
      height: parent.height ?? prev.height,
      size: parent.size ?? prev.size,
      mossStick: parent.mossStick ?? prev.mossStick,
      type: parent.type ?? prev.type,
      description: parent.description ?? prev.description,
      categories: parent.categories ? [...parent.categories] : prev.categories,
      collectionIds: parent.collectionIds ? parent.collectionIds.map(id => String(id)) : prev.collectionIds,
      images: parent.images ? [...parent.images] : prev.images,
      seller: parent.seller ?? prev.seller,
      hub: parent.hub ?? prev.hub,
    }));
  }, [formData.listingType, selectedParents]);

  const currentStep = LISTING_STEPS[stepIndex];

  // Fetch parent details when parentSkus change
  useEffect(() => {
    const fetchParentDetails = async () => {
      if (formData.parentSkus.length === 0) {
        setSelectedParents([]);
        return;
      }

      try {
        const parents: ParentMaster[] = [];
        for (const sku of formData.parentSkus) {
          const response = await fetch(
            `/api/parent-master?search=${encodeURIComponent(sku)}&limit=1&baseParentsOnly=true`
          );
          const result = await response.json();
          if (result.success && result.data.length > 0) {
            const parent = result.data.find((p: ParentMaster) => p.sku === sku);
            if (parent) {
              parents.push(parent);
            }
          }
        }
        setSelectedParents(parents);
      } catch (error) {
        console.error('Error fetching parent details:', error);
      }
    };

    fetchParentDetails();
  }, [formData.parentSkus]);

  // Auto-calculate price, inventory, tax, redirect, features, and SEO when parents or quantity change
  useEffect(() => {
    if (selectedParents.length > 0 && formData.quantity) {
      const quantity = Number(formData.quantity);
      if (quantity > 0) {
        // Calculate total price
        const totalPrice = selectedParents.reduce((sum, parent) => {
          return sum + (parent.price || 0) * quantity;
        }, 0);

        // Calculate minimum inventory quantity
        let minInventoryQuantity = Infinity;
        for (const parent of selectedParents) {
          const breakdownKey = section === 'consumer' ? 'consumers' : section;
          const availableQuantity = parent.typeBreakdown?.[breakdownKey] || 0;
          const inventoryForThisParent = Math.floor(availableQuantity / quantity);
          minInventoryQuantity = Math.min(minInventoryQuantity, inventoryForThisParent);
        }

        // Auto-populate categories and collections from parents
        const combinedCategories = new Set<string>();
        const combinedCollectionIds = new Set<string>();

        selectedParents.forEach(parent => {
          if (parent.categories) {
            parent.categories.forEach(cat => combinedCategories.add(cat));
          }
          if (parent.collectionIds) {
            parent.collectionIds.forEach(id => combinedCollectionIds.add(String(id)));
          }
        });

        // Tax: take the maximum tax value across all parents
        const taxValues = selectedParents
          .map(p => p.tax ? Number(p.tax) : 0)
          .filter(v => v > 0);
        const maxTax = taxValues.length > 0 ? Math.max(...taxValues) : 0;
        const derivedTax = maxTax > 0 ? String(maxTax) : '';

        // Redirects: combine unique redirects from all parents
        const combinedRedirects = new Set<string>();
        selectedParents.forEach(parent => {
          const r = (parent as any).redirects;
          if (r && typeof r === 'string') {
            r.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((v: string) => combinedRedirects.add(v));
          }
        });
        // Only pre-fill redirect if not already set by user
        const derivedRedirect = Array.from(combinedRedirects).join(', ');

        // Features: combine unique features, but only from plant parents (ignore pot parents)
        // If all parents are pots, use all; if mix, use only plant parents' features
        const plantParents = selectedParents.filter(p => (p as any).parentKind !== 'pot');
        const featureSourceParents = plantParents.length > 0 ? plantParents : selectedParents;
        const combinedFeatures = new Set<string>();
        featureSourceParents.forEach(parent => {
          const f = (parent as any).features;
          if (f && typeof f === 'string') {
            f.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((v: string) => combinedFeatures.add(v));
          }
        });

        setFormData(prev => ({
          ...prev,
          price: totalPrice,
          inventory_quantity: minInventoryQuantity === Infinity ? 0 : minInventoryQuantity,
          categories: Array.from(combinedCategories),
          collectionIds: Array.from(combinedCollectionIds),
          tax: derivedTax || prev.tax,
          redirect: prev.redirect || derivedRedirect,
          features: combinedFeatures.size > 0 ? Array.from(combinedFeatures) : prev.features,
        }));
      }
    }
  }, [selectedParents, formData.quantity, section]);

  // Auto-generate SEO fields when plant name changes (only if not manually edited)
  useEffect(() => {
    if (!formData.plant) return;
    setFormData(prev => ({
      ...prev,
      seoTitle: prev.seoTitle || buildDefaultSeoTitle(formData.plant),
      seoDescription: prev.seoDescription || buildDefaultSeoDescription(formData.plant),
    }));
  }, [formData.plant]);

  const updateFormData = useCallback((updates: Partial<ListingFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    // Clear validation errors for updated fields
    const updatedFields = Object.keys(updates);
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      updatedFields.forEach(field => delete newErrors[field]);
      return newErrors;
    });
  }, []);

  const validateCurrentStep = (stepId: ListingStepId): boolean => {
    const validation = validateStep(stepId, formData, selectedParents, section);
    setValidationErrors(validation.errors);
    return validation.isValid;
  };

  const handleNext = () => {
    if (validateCurrentStep(currentStep.id)) {
      setStepIndex(prev => Math.min(prev + 1, LISTING_STEPS.length - 1));
    }
  };

  const handlePrevious = () => {
    setStepIndex(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep('review')) {
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        quantity: formData.listingType === 'parent' ? 1 : Number(formData.quantity),
        height: formData.height ? Number(formData.height) : undefined,
        size: formData.size ? Number(formData.size) : undefined,
        SEO: (formData.seoTitle || formData.seoDescription)
          ? { title: formData.seoTitle, description: formData.seoDescription }
          : undefined,
        redirects: formData.redirect
          ? formData.redirect.split(',').map((s: string) => s.trim()).filter(Boolean)
          : undefined,
        features: formData.features.length > 0 ? formData.features : undefined,
        tax: formData.tax || undefined,
      };

      const response = await fetch('/api/listing-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Listing product created successfully!');
        
        // Clear persisted state
        clearPersistedState();
        
        // Reset form (keep listingType default)
        setFormData({ ...initialListingFormData, section, listingType: initialListingFormData.listingType });
        setStepIndex(0);
        setSelectedParents([]);
        
        onSuccess?.(result.data);
      } else {
        toast.error(result.message || 'Failed to create listing product');
      }
    } catch (error) {
      console.error('Error creating listing product:', error);
      toast.error('Failed to create listing product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canGoNext = stepIndex < LISTING_STEPS.length - 1;
  const canGoPrevious = stepIndex > 0;
  const isLastStep = stepIndex === LISTING_STEPS.length - 1;

  const renderStep = () => {
    const stepProps = {
      formData,
      updateFormData,
      validationErrors,
      selectedParents,
      section,
    };

    switch (currentStep.id) {
      case 'listing-type':
        return <StepListingType {...stepProps} />;
      case 'parent-selection':
        return <StepParentSelection {...stepProps} />;
      case 'product-details':
        return <StepProductDetails {...stepProps} />;
      case 'pricing-inventory':
        return <StepPricingInventory {...stepProps} />;
      case 'categories-images':
        return <StepCategoriesImages {...stepProps} />;
      case 'review':
        return <StepReview {...stepProps} />;
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Create Listing Product
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Section: {section.charAt(0).toUpperCase() + section.slice(1)}
            </p>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="px-6 py-4 border-b border-gray-200">
        <nav className="flex space-x-8">
          {LISTING_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${
                index <= stepIndex ? 'text-emerald-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium ${
                  index < stepIndex
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : index === stepIndex
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-gray-300 text-gray-400'
                }`}
              >
                {index + 1}
              </div>
              <span className="ml-2 text-sm font-medium">{step.label}</span>
            </div>
          ))}
        </nav>
      </div>

      {/* Step Content */}
      <div className="px-6 py-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {currentStep.title}
          </h3>
        </div>

        {/* Validation Errors Summary */}
        {Object.keys(validationErrors).length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-2">
                  Please fix the following errors:
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {Object.entries(validationErrors).map(([field, error]) => (
                    <li key={field}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {renderStep()}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={!canGoPrevious}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <div className="text-sm text-gray-500">
          Step {stepIndex + 1} of {LISTING_STEPS.length}
        </div>

        {isLastStep ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? 'Creating...' : 'Create Listing Product'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}