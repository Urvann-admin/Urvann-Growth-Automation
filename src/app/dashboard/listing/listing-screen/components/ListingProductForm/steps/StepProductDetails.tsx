'use client';

import type { ListingFormData } from '../types';
import { MOSS_STICK_OPTIONS, PLANT_TYPES } from '../types';
import type { ListingSection } from '@/models/listingProduct';
import type { ParentMaster } from '@/models/parentMaster';

export interface StepProductDetailsProps {
  formData: ListingFormData;
  updateFormData: (updates: Partial<ListingFormData>) => void;
  validationErrors: Record<string, string>;
  selectedParents: ParentMaster[];
  section: ListingSection;
}

export function StepProductDetails({
  formData,
  updateFormData,
  validationErrors,
  selectedParents,
}: StepProductDetailsProps) {
  const handleInputChange = (field: keyof ListingFormData, value: any) => {
    updateFormData({ [field]: value });
  };

  const isParentListing = formData.listingType === 'parent';

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-base font-medium text-gray-900 mb-2">
          Product Information
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          {isParentListing
            ? 'Details are pre-filled from the selected parent. You can edit any field and add the rest as needed.'
            : 'Enter the details for your listing product. This will be a child product created from the selected parent products.'}
        </p>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Plant Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.plant}
            onChange={(e) => handleInputChange('plant', e.target.value)}
            placeholder="Enter plant name"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
              validationErrors.plant ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {validationErrors.plant && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.plant}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Other Names
          </label>
          <input
            type="text"
            value={formData.otherNames}
            onChange={(e) => handleInputChange('otherNames', e.target.value)}
            placeholder="Alternative names"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Variety
          </label>
          <input
            type="text"
            value={formData.variety}
            onChange={(e) => handleInputChange('variety', e.target.value)}
            placeholder="Plant variety"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Colour
          </label>
          <input
            type="text"
            value={formData.colour}
            onChange={(e) => handleInputChange('colour', e.target.value)}
            placeholder="Plant color"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Height (feet)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={formData.height}
            onChange={(e) => handleInputChange('height', e.target.value ? Number(e.target.value) : '')}
            placeholder="Height in feet"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Size (inches)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={formData.size}
            onChange={(e) => handleInputChange('size', e.target.value ? Number(e.target.value) : '')}
            placeholder="Size in inches"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Moss Stick
          </label>
          <select
            value={formData.mossStick}
            onChange={(e) => handleInputChange('mossStick', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            {MOSS_STICK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            {PLANT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Enter product description..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        <p className="mt-1 text-sm text-gray-500">
          Provide a detailed description of the listing product
        </p>
      </div>

      {/* Parent Products Reference */}
      {selectedParents.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-800 mb-2">
            Based on Parent Products
          </h5>
          <div className="space-y-2 text-sm">
            {selectedParents.map(parent => (
              <div key={parent.sku} className="flex justify-between items-center">
                <span className="text-gray-700">
                  {parent.plant}
                  {parent.variety && ` (${parent.variety})`}
                  {parent.colour && ` - ${parent.colour}`}
                </span>
                <span className="text-gray-500 text-xs">{parent.sku}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            The child product can have different attributes than its parents
          </p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-800 mb-2">Product Details Tips</h5>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Plant name is required and will be used for SKU generation</li>
          <li>• Fill in as many details as possible for better categorization</li>
          <li>• The final product name will be auto-generated from these details</li>
          <li>• These attributes will be used for automatic category assignment</li>
        </ul>
      </div>
    </div>
  );
}