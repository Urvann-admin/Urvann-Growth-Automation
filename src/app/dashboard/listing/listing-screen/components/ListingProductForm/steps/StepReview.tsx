'use client';

import { Package, Tag, Image as ImageIcon, DollarSign, Hash, MapPin, Search, RotateCcw, X, Plus } from 'lucide-react';
import type { ListingFormData } from '../types';
import { buildDefaultSeoTitle, buildDefaultSeoDescription, computeListingDisplayName } from '../types';
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
  updateFormData,
  selectedParents,
  section,
}: StepReviewProps) {
  const finalName =
    computeListingDisplayName(formData).trim() || formData.plant.trim() || 'Product';
  const seoSeed = finalName;

  const handleFeatureRemove = (feature: string) => {
    updateFormData({ features: formData.features.filter(f => f !== feature) });
  };

  const handleFeatureAdd = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !formData.features.includes(trimmed)) {
      updateFormData({ features: [...formData.features, trimmed] });
    }
  };

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

      {/* SEO Fields */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Search className="h-4 w-4" />
          SEO
        </h5>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">SEO Title</label>
            <input
              type="text"
              value={formData.seoTitle}
              onChange={(e) => updateFormData({ seoTitle: e.target.value })}
              placeholder={buildDefaultSeoTitle(seoSeed)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {!formData.seoTitle && (
              <p className="mt-1 text-xs text-gray-400">Will use: {buildDefaultSeoTitle(seoSeed)}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">SEO Description</label>
            <textarea
              value={formData.seoDescription}
              onChange={(e) => updateFormData({ seoDescription: e.target.value })}
              placeholder={buildDefaultSeoDescription(seoSeed)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-y"
            />
            {!formData.seoDescription && (
              <p className="mt-1 text-xs text-gray-400">Will use: {buildDefaultSeoDescription(seoSeed)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              updateFormData({
                seoTitle: buildDefaultSeoTitle(seoSeed),
                seoDescription: buildDefaultSeoDescription(seoSeed),
              })
            }
            className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to defaults
          </button>
        </div>
      </div>

      {/* Tax */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Tax
        </h5>
        <div className="flex items-center gap-4">
          <select
            value={formData.tax}
            onChange={(e) => updateFormData({ tax: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">No tax</option>
            <option value="5">5%</option>
            <option value="18">18%</option>
          </select>
          <p className="text-xs text-gray-500">
            {selectedParents.length > 0
              ? `Derived from parent(s): max tax = ${
                  Math.max(0, ...selectedParents.map(p => p.tax ? Number(p.tax) : 0))
                }%`
              : 'Set tax rate for this product'}
          </p>
        </div>
      </div>

      {/* Redirect */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Hash className="h-4 w-4" />
          Redirect
        </h5>
        <div className="space-y-2">
          <input
            type="text"
            value={formData.redirect}
            onChange={(e) => updateFormData({ redirect: e.target.value })}
            placeholder="Enter redirect URL or slug"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <p className="text-xs text-gray-500">
            Only one redirect per product. Combined unique redirects from parents are shown above — edit to keep just one.
          </p>
          {selectedParents.some(p => (p as any).redirects) && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-600 mb-1">Parent redirects (for reference):</p>
              <div className="flex flex-wrap gap-1">
                {Array.from(new Set(
                  selectedParents.flatMap(p => {
                    const r = (p as any).redirects;
                    return r ? r.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                  })
                )).map((r: string) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => updateFormData({ redirect: r })}
                    className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">Click a redirect to use it</p>
            </div>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Features ({formData.features.length})
        </h5>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {formData.features.map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full"
              >
                {feature}
                <button
                  type="button"
                  onClick={() => handleFeatureRemove(feature)}
                  className="ml-0.5 hover:text-emerald-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {formData.features.length === 0 && (
              <p className="text-xs text-gray-400">No features added yet</p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a feature and press Enter"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleFeatureAdd((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
            <button
              type="button"
              onClick={(e) => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                handleFeatureAdd(input.value);
                input.value = '';
              }}
              className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {selectedParents.length > 0 && (
            <p className="text-xs text-gray-500">
              {selectedParents.some(p => (p as any).parentKind === 'pot') && selectedParents.some(p => (p as any).parentKind !== 'pot')
                ? 'Features are from plant parents only (pot parent features are excluded).'
                : 'Combined unique features from all parents.'}
            </p>
          )}
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