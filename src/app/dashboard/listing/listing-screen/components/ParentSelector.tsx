'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, X, AlertCircle, Package } from 'lucide-react';
import type { ParentMaster } from '@/models/parentMaster';
import type { ListingSection } from '@/models/listingProduct';

export interface ParentSelectorProps {
  section: ListingSection;
  selectedParentSkus: string[];
  onSelectionChange: (parentSkus: string[]) => void;
  quantity?: number;
  disabled?: boolean;
}

export function ParentSelector({
  section,
  selectedParentSkus,
  onSelectionChange,
  quantity = 1,
  disabled = false,
}: ParentSelectorProps) {
  const [parents, setParents] = useState<ParentMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch parents based on section
  useEffect(() => {
    const fetchParents = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams({
          section,
          minQuantity: '0',
          limit: '100',
          sortField: 'plant',
          sortOrder: 'asc',
        });

        if (searchTerm) {
          params.set('search', searchTerm);
        }

        const response = await fetch(`/api/parent-master?${params}`);
        const result = await response.json();

        if (result.success) {
          setParents(result.data || []);
        } else {
          setError(result.message || 'Failed to fetch parents');
        }
      } catch (err) {
        setError('Failed to fetch parent products');
        console.error('Error fetching parents:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchParents();
  }, [section, searchTerm]);

  // Filter available parents (those with sufficient quantity)
  const availableParents = useMemo(() => {
    return parents.filter(parent => {
      const availableQuantity = parent.typeBreakdown?.[section === 'consumer' ? 'consumers' : section] || 0;
      return availableQuantity >= quantity;
    });
  }, [parents, section, quantity]);

  // Get selected parent objects
  const selectedParents = useMemo(() => {
    return parents.filter(parent => selectedParentSkus.includes(parent.sku || ''));
  }, [parents, selectedParentSkus]);

  const handleParentToggle = (parent: ParentMaster) => {
    if (disabled) return;

    const sku = parent.sku || '';
    if (selectedParentSkus.includes(sku)) {
      // Remove from selection
      onSelectionChange(selectedParentSkus.filter(s => s !== sku));
    } else {
      // Add to selection
      onSelectionChange([...selectedParentSkus, sku]);
    }
  };

  const handleRemoveSelected = (sku: string) => {
    if (disabled) return;
    onSelectionChange(selectedParentSkus.filter(s => s !== sku));
  };

  const clearSelection = () => {
    if (disabled) return;
    onSelectionChange([]);
  };

  return (
    <div className="space-y-4">
      {/* Selected Parents Display */}
      {selectedParents.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Selected Parents ({selectedParents.length})
            </label>
            <button
              type="button"
              onClick={clearSelection}
              disabled={disabled}
              className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedParents.map((parent) => (
              <div
                key={parent.sku}
                className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-sm"
              >
                <Package className="h-3 w-3 text-emerald-600" />
                <span className="text-emerald-800 font-medium">{parent.plant}</span>
                <span className="text-emerald-600">({parent.sku})</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSelected(parent.sku || '')}
                  disabled={disabled}
                  className="text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parent Search and Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Select Parent Products
          <span className="text-gray-500 ml-1">
            (showing products with {section} quantities ≥ {quantity})
          </span>
        </label>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search parent products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsDropdownOpen(true)}
            disabled={disabled}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Dropdown */}
        {isDropdownOpen && (
          <div className="relative">
            <div className="absolute top-0 left-0 right-0 z-10 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {loading && (
                <div className="p-4 text-center text-gray-500">
                  Loading parent products...
                </div>
              )}
              
              {error && (
                <div className="p-4 text-center text-red-600 flex items-center justify-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
              
              {!loading && !error && availableParents.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No parent products found with sufficient {section} quantities
                </div>
              )}
              
              {!loading && !error && availableParents.length > 0 && (
                <div className="py-2">
                  {availableParents.map((parent) => {
                    const isSelected = selectedParentSkus.includes(parent.sku || '');
                    const availableQuantity = parent.typeBreakdown?.[section === 'consumer' ? 'consumers' : section] || 0;
                    
                    return (
                      <button
                        key={parent.sku}
                        type="button"
                        onClick={() => handleParentToggle(parent)}
                        disabled={disabled}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed ${
                          isSelected ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-gray-900 truncate">
                              {parent.plant}
                            </span>
                            {parent.variety && (
                              <span className="text-gray-500 text-sm">
                                ({parent.variety})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            <span>SKU: {parent.sku}</span>
                            <span>Price: ₹{parent.price}</span>
                            <span className="font-medium text-emerald-600">
                              Available: {availableQuantity}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="flex-shrink-0 ml-2">
                            <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              
              <div className="p-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(false)}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
}