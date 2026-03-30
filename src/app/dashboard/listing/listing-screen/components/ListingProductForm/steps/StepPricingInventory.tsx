'use client';

import { useState, useEffect } from 'react';
import type { ListingFormData } from '../types';
import type { ListingSection } from '@/models/listingProduct';
import type { ParentMaster } from '@/models/parentMaster';
import { ParentQuantityDisplay } from '../../ParentQuantityDisplay';
import { HUB_MAPPINGS } from '@/shared/constants/hubs';

export interface StepPricingInventoryProps {
  formData: ListingFormData;
  updateFormData: (updates: Partial<ListingFormData>) => void;
  validationErrors: Record<string, string>;
  selectedParents: ParentMaster[];
  section: ListingSection;
}

export function StepPricingInventory({
  formData,
  updateFormData,
  validationErrors,
  selectedParents,
  section,
}: StepPricingInventoryProps) {
  const isParentListing = formData.listingType === 'parent';
  const [sellers, setSellers] = useState<any[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(false);

  // Fetch selling sellers from sellerMaster (not procurement sellers)
  useEffect(() => {
    const fetchSellers = async () => {
      setLoadingSellers(true);
      try {
        const response = await fetch('/api/sellers');
        const result = await response.json();
        if (result.success) {
          setSellers(result.data || []);
        }
      } catch (error) {
        console.error('Error fetching sellers:', error);
      } finally {
        setLoadingSellers(false);
      }
    };

    fetchSellers();
  }, []);

  const handleInputChange = (field: keyof ListingFormData, value: any) => {
    updateFormData({ [field]: value });
  };

  const hubOptions = HUB_MAPPINGS.map(hub => ({
    value: hub.hub,
    label: hub.hub,
  }));

  const sellerOptions = sellers.map((seller: { seller_id?: string; seller_name?: string }) => ({
    value: String(seller.seller_id ?? '').trim(),
    label: seller.seller_name || String(seller.seller_id ?? ''),
  })).filter((o) => o.value);

  const quantity = isParentListing ? 1 : (Number(formData.quantity) || 0);
  const hasValidQuantity = quantity > 0;

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-base font-medium text-gray-900 mb-2">
          Pricing & Inventory
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          {isParentListing
            ? 'For parent listing, quantity is always 1. Set hub and seller as needed.'
            : 'Set the quantity and other details. Price and inventory will be calculated automatically based on selected parents.'}
        </p>
      </div>

      {/* Quantity: only for child listing; parent is always 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!isParentListing && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value ? Number(e.target.value) : '')}
              placeholder="Enter quantity"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                validationErrors.quantity ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {validationErrors.quantity && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.quantity}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Number of units to create for this listing product
            </p>
          </div>
        )}
        {isParentListing && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Quantity:</span>
            <span>1 (fixed for parent listing)</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hub <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.hub}
            onChange={(e) => handleInputChange('hub', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
              validationErrors.hub ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select Hub</option>
            {hubOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {validationErrors.hub && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.hub}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seller
          </label>
          <select
            value={formData.seller}
            onChange={(e) => handleInputChange('seller', e.target.value)}
            disabled={loadingSellers}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
          >
            <option value="">Select Seller</option>
            {sellerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calculated Values Display */}
      {hasValidQuantity && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <h5 className="font-medium text-emerald-800 mb-2">Calculated Price</h5>
            <div className="text-2xl font-bold text-emerald-900">
              ₹{formData.price.toFixed(2)}
            </div>
            <p className="text-sm text-emerald-700 mt-1">
              Based on {selectedParents.length} parent product(s) × {quantity} quantity
            </p>
            {selectedParents.length > 0 && (
              <div className="mt-2 text-xs text-emerald-600">
                <div>Base price per unit: ₹{(formData.price / quantity).toFixed(2)}</div>
                <div>Parent prices: {selectedParents.map(p => `₹${p.price}`).join(' + ')}</div>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-medium text-blue-800 mb-2">Available Inventory</h5>
            <div className="text-2xl font-bold text-blue-900">
              {formData.inventory_quantity}
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Maximum units that can be created
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Limited by parent with lowest available quantity
            </p>
          </div>
        </div>
      )}

      {/* Parent Quantity Analysis */}
      {selectedParents.length > 0 && hasValidQuantity && (
        <ParentQuantityDisplay
          parents={selectedParents}
          section={section}
          requiredQuantity={quantity}
        />
      )}

      {/* Information Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h5 className="font-medium text-yellow-800 mb-2">Pricing & Inventory Calculation</h5>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• <strong>Price:</strong> Sum of all parent prices multiplied by quantity</li>
          <li>• <strong>Inventory:</strong> Minimum available quantity across all parents divided by required quantity</li>
          <li>• <strong>Hub:</strong> Required for SKU generation and inventory management</li>
          <li>• <strong>Seller:</strong> Optional, inherited from parent if not specified</li>
        </ul>
      </div>

      {/* Validation Warnings */}
      {hasValidQuantity && formData.inventory_quantity === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h5 className="font-medium text-red-800 mb-2">Insufficient Inventory</h5>
          <p className="text-sm text-red-700">
            The selected quantity ({quantity}) exceeds the available inventory from one or more parent products.
            Please reduce the quantity or select different parent products.
          </p>
        </div>
      )}
    </div>
  );
}