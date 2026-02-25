'use client';

import { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import type { ListingFormData } from '../types';
import type { ListingSection } from '@/models/listingProduct';
import type { ParentMaster } from '@/models/parentMaster';
import { ParentSelector } from '../../ParentSelector';

export interface StepParentSelectionProps {
  formData: ListingFormData;
  updateFormData: (updates: Partial<ListingFormData>) => void;
  validationErrors: Record<string, string>;
  selectedParents: ParentMaster[];
  section: ListingSection;
}

export function StepParentSelection({
  formData,
  updateFormData,
  validationErrors,
  selectedParents,
  section,
}: StepParentSelectionProps) {
  const isParentListing = formData.listingType === 'parent';

  const handleParentSelectionChange = (parentSkus: string[]) => {
    // When listing a parent, only allow one; take first if multiple
    const skus = isParentListing ? (parentSkus.length ? [parentSkus[0]] : []) : parentSkus;
    updateFormData({ parentSkus: skus });
  };

  if (isParentListing) {
    return (
      <SingleParentSelection
        section={section}
        selectedSku={formData.parentSkus[0] || ''}
        onSelect={(sku) => updateFormData({ parentSkus: sku ? [sku] : [] })}
        validationError={validationErrors.parentSkus}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-base font-medium text-gray-900 mb-2">
          Select Parent Products
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Choose one or more parent products that have available quantities in the{' '}
          <span className="font-medium text-emerald-600">{section}</span>{' '}
          section. These will be used to create your child listing product.
        </p>
      </div>

      <ParentSelector
        section={section}
        selectedParentSkus={formData.parentSkus}
        onSelectionChange={handleParentSelectionChange}
        quantity={1}
      />

      {validationErrors.parentSkus && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {validationErrors.parentSkus}
        </div>
      )}

      {selectedParents.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <h5 className="font-medium text-emerald-800 mb-2">Selected Parents Summary</h5>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-emerald-700">Total Parents:</span>
                <span className="ml-2 font-medium">{selectedParents.length}</span>
              </div>
              <div>
                <span className="text-emerald-700">Total Base Price:</span>
                <span className="ml-2 font-medium">
                  ₹{selectedParents.reduce((sum, parent) => sum + (parent.price || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-emerald-700">Available {section} quantities:</span>
              <ul className="mt-1 space-y-1">
                {selectedParents.map(parent => (
                  <li key={parent.sku} className="flex justify-between">
                    <span className="text-emerald-600">{parent.plant} ({parent.sku})</span>
                    <span className="font-medium">{parent.typeBreakdown?.[section] || 0}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-800 mb-2">How it works (child)</h5>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Select parent products that have quantities available in the {section} section</li>
          <li>• The child product will inherit categories and collections from all selected parents</li>
          <li>• Final price will be calculated based on selected parents and quantity</li>
          <li>• Inventory will be limited by the parent with the lowest available quantity</li>
        </ul>
      </div>
    </div>
  );
}

/** Single-parent dropdown for "list a parent" flow. */
function SingleParentSelection({
  section,
  selectedSku,
  onSelect,
  validationError,
}: {
  section: ListingSection;
  selectedSku: string;
  onSelect: (sku: string) => void;
  validationError?: string;
}) {
  const [parents, setParents] = useState<ParentMaster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParents = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          section,
          minQuantity: '0',
          limit: '200',
          sortField: 'plant',
          sortOrder: 'asc',
        });
        const response = await fetch(`/api/parent-master?${params}`);
        const result = await response.json();
        if (result.success) setParents(result.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchParents();
  }, [section]);

  const selectedParent = parents.find(p => p.sku === selectedSku);

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-base font-medium text-gray-900 mb-2">
          Select parent product
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Choose the one parent product you want to list in the{' '}
          <span className="font-medium text-emerald-600">{section}</span> section.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Parent product
        </label>
        <select
          value={selectedSku}
          onChange={(e) => onSelect(e.target.value)}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
        >
          <option value="">Select a parent...</option>
          {parents.map((parent) => {
            const available = parent.typeBreakdown?.[section] ?? 0;
            return (
              <option key={parent.sku} value={parent.sku || ''}>
                {parent.plant}
                {parent.variety ? ` (${parent.variety})` : ''} – {parent.sku} (available: {available})
              </option>
            );
          })}
        </select>
        {loading && <p className="mt-1 text-sm text-gray-500">Loading parents...</p>}
      </div>

      {validationError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {validationError}
        </div>
      )}

      {selectedParent && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <h5 className="font-medium text-emerald-800 mb-2">Selected parent</h5>
          <div className="flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">{selectedParent.plant}</span>
            {selectedParent.variety && <span className="text-emerald-700">({selectedParent.variety})</span>}
            <span className="text-emerald-600">SKU: {selectedParent.sku}</span>
          </div>
          <div className="mt-2 text-sm text-emerald-700">
            Price: ₹{selectedParent.price} · Available in {section}: {selectedParent.typeBreakdown?.[section] ?? 0}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-800 mb-2">List a parent</h5>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• You are listing this parent product in the {section} section</li>
          <li>• In the next steps you will set quantity, details, categories, and images</li>
          <li>• Price and inventory will be based on this single parent</li>
        </ul>
      </div>
    </div>
  );
}
