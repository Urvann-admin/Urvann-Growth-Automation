'use client';

import { Package, Layers } from 'lucide-react';
import type { ListingFormData } from '../types';
import type { ListingType } from '../types';
import type { ListingSection } from '@/models/listingProduct';
import type { ParentMaster } from '@/models/parentMaster';

export interface StepListingTypeProps {
  formData: ListingFormData;
  updateFormData: (updates: Partial<ListingFormData>) => void;
  validationErrors: Record<string, string>;
  selectedParents: ParentMaster[];
  section: ListingSection;
}

export function StepListingType({
  formData,
  updateFormData,
  validationErrors,
  section,
}: StepListingTypeProps) {
  const setListingType = (type: ListingType) => {
    updateFormData({
      listingType: type,
      // When switching to parent, allow only one parent; clear extra when switching to parent
      ...(type === 'parent' && formData.parentSkus.length > 1 ? { parentSkus: formData.parentSkus.slice(0, 1) } : {}),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-base font-medium text-gray-900 mb-2">
          What are you listing?
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Choose whether you want to list an existing <strong>parent</strong> product (one product from parent master) or create a <strong>child</strong> product (which can be made from one or more parents).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setListingType('parent')}
          className={`flex flex-col items-start gap-3 p-6 rounded-xl border-2 text-left transition-all ${
            formData.listingType === 'parent'
              ? 'border-emerald-500 bg-emerald-50 shadow-md'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className={`p-3 rounded-lg ${formData.listingType === 'parent' ? 'bg-emerald-100' : 'bg-gray-100'}`}>
            <Package className={`w-8 h-8 ${formData.listingType === 'parent' ? 'text-emerald-600' : 'text-gray-500'}`} strokeWidth={2} />
          </div>
          <div>
            <h5 className="font-semibold text-gray-900">List a parent</h5>
            <p className="text-sm text-gray-600 mt-1">
              Select one parent product from the dropdown. You will set quantity and other details for listing that parent in the {section} section.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setListingType('child')}
          className={`flex flex-col items-start gap-3 p-6 rounded-xl border-2 text-left transition-all ${
            formData.listingType === 'child'
              ? 'border-emerald-500 bg-emerald-50 shadow-md'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className={`p-3 rounded-lg ${formData.listingType === 'child' ? 'bg-emerald-100' : 'bg-gray-100'}`}>
            <Layers className={`w-8 h-8 ${formData.listingType === 'child' ? 'text-emerald-600' : 'text-gray-500'}`} strokeWidth={2} />
          </div>
          <div>
            <h5 className="font-semibold text-gray-900">List a child</h5>
            <p className="text-sm text-gray-600 mt-1">
              Create a child product from one or more parent products. Price and inventory are calculated from the selected parents.
            </p>
          </div>
        </button>
      </div>

      {validationErrors.listingType && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {validationErrors.listingType}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-800 mb-2">Quick guide</h5>
        <ul className="text-sm text-blue-700 space-y-1">
          <li><strong>Parent:</strong> One parent from dropdown → set quantity, details, categories, images.</li>
          <li><strong>Child:</strong> One or more parents → child inherits/combines data; price = sum of parent prices × quantity.</li>
        </ul>
      </div>
    </div>
  );
}
