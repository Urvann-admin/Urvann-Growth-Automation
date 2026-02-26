'use client';

import { Package, Tag, Image as ImageIcon, DollarSign, Hash, MapPin } from 'lucide-react';
import type { ListingFormData } from '../types';
import type { ListingSection } from '@/models/listingProduct';
import type { ParentMaster } from '@/models/parentMaster';

export interface StepReviewProps {
  formData: ListingFormData;
  updateFormData: (updates: Partial<ListingFormData>) => void;
  validationErrors: Record<string, string>;
  selectedParents: ParentMaster[];
  section: ListingSection;
}

export function StepReview({
  formData,
  selectedParents,
  section,
}: StepReviewProps) {
  const generateFinalName = () => {
    const parts = [formData.plant];
    
    if (formData.otherNames) parts.push(formData.otherNames);
    if (formData.variety) parts.push(formData.variety);
    if (formData.colour) parts.push(formData.colour);
    if (formData.size) parts.push('in', String(formData.size), 'inch');
    if (formData.type) parts.push(formData.type);
    
    return parts.filter(Boolean).join(' ');
  };

  const finalName = generateFinalName();

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-base font-medium text-gray-900 mb-2">
          Review Listing Product
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Please review all the details before creating your listing product.
        </p>
      </div>

      {/* Product Summary */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
        <h5 className="text-lg font-semibold text-emerald-900 mb-4">
          {finalName}
        </h5>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-emerald-600" />
            <span className="text-emerald-700">Section:</span>
            <span className="font-medium text-emerald-900 capitalize">{section}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-emerald-600" />
            <span className="text-emerald-700">Quantity:</span>
            <span className="font-medium text-emerald-900">{formData.quantity}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            <span className="text-emerald-700">Total Price:</span>
            <span className="font-medium text-emerald-900">₹{formData.price.toFixed(2)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-emerald-600" />
            <span className="text-emerald-700">Max Inventory:</span>
            <span className="font-medium text-emerald-900">{formData.inventory_quantity}</span>
          </div>
          
          {formData.hub && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <span className="text-emerald-700">Hub:</span>
              <span className="font-medium text-emerald-900">{formData.hub}</span>
            </div>
          )}
        </div>
      </div>

      {/* Parent Products */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Package className="h-4 w-4" />
          Parent Products ({selectedParents.length})
        </h5>
        
        <div className="space-y-3">
          {selectedParents.map((parent) => (
            <div key={parent.sku} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">{parent.plant}</div>
                <div className="text-sm text-gray-600">
                  {parent.variety && `${parent.variety} • `}
                  {parent.colour && `${parent.colour} • `}
                  SKU: {parent.sku}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">₹{parent.price}</div>
                <div className="text-sm text-gray-600">
                  Available: {parent.typeBreakdown?.[section === 'consumer' ? 'consumers' : section] || 0}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total parent price per unit:</span>
            <span className="font-medium">
              ₹{selectedParents.reduce((sum, parent) => sum + (parent.price || 0), 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Quantity multiplier:</span>
            <span className="font-medium">× {formData.quantity}</span>
          </div>
          <div className="flex justify-between text-sm font-medium text-emerald-600 pt-1 border-t border-gray-100 mt-1">
            <span>Final calculated price:</span>
            <span>₹{formData.price.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Product Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-3">Product Details</h5>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Plant Name:</span>
            <span className="ml-2 font-medium">{formData.plant}</span>
          </div>
          
          {formData.otherNames && (
            <div>
              <span className="text-gray-600">Other Names:</span>
              <span className="ml-2 font-medium">{formData.otherNames}</span>
            </div>
          )}
          
          {formData.variety && (
            <div>
              <span className="text-gray-600">Variety:</span>
              <span className="ml-2 font-medium">{formData.variety}</span>
            </div>
          )}
          
          {formData.colour && (
            <div>
              <span className="text-gray-600">Colour:</span>
              <span className="ml-2 font-medium">{formData.colour}</span>
            </div>
          )}
          
          {formData.height && (
            <div>
              <span className="text-gray-600">Height:</span>
              <span className="ml-2 font-medium">{formData.height} feet</span>
            </div>
          )}
          
          {formData.size && (
            <div>
              <span className="text-gray-600">Size:</span>
              <span className="ml-2 font-medium">{formData.size} inches</span>
            </div>
          )}
          
          {formData.mossStick && (
            <div>
              <span className="text-gray-600">Moss Stick:</span>
              <span className="ml-2 font-medium">{formData.mossStick}</span>
            </div>
          )}
          
          {formData.type && (
            <div>
              <span className="text-gray-600">Type:</span>
              <span className="ml-2 font-medium">{formData.type}</span>
            </div>
          )}
        </div>
        
        {formData.description && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <span className="text-gray-600 block mb-2">Description:</span>
            <p className="text-gray-900 text-sm">{formData.description}</p>
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Categories ({formData.categories.length})
        </h5>
        
        <div className="flex flex-wrap gap-2">
          {formData.categories.map((category) => (
            <span
              key={category}
              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full"
            >
              <Tag className="h-3 w-3" />
              {category}
            </span>
          ))}
        </div>
      </div>

      {/* Images */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Images ({formData.images.length})
        </h5>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {formData.images.map((imageUrl, index) => (
            <div key={imageUrl} className="aspect-square rounded-lg overflow-hidden border border-gray-200">
              <img
                src={imageUrl}
                alt={`Product image ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Final Confirmation */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h5 className="font-medium text-yellow-800 mb-2">Before You Continue</h5>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• The listing product will be created with the above details</li>
          <li>• Parent product quantities will be reduced by the specified amount</li>
          <li>• A unique SKU will be generated for this listing product</li>
          <li>• The product will be created with "{formData.status}" status</li>
        </ul>
      </div>
    </div>
  );
}