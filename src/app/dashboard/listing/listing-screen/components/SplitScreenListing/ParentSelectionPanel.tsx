'use client';

import { useState, useMemo } from 'react';
import { Search, Check } from 'lucide-react';
import type { ParentMaster } from '@/models/parentMaster';
import type { ListingSection } from '@/models/listingProduct';

interface ParentSelectionPanelProps {
  availableParents: ParentMaster[];
  selectedParent: ParentMaster | null;
  onSelectParent: (parent: ParentMaster) => void;
  section: ListingSection;
  isLoading?: boolean;
}

export function ParentSelectionPanel({ 
  availableParents, 
  selectedParent,
  onSelectParent, 
  section,
  isLoading = false
}: ParentSelectionPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter parents based on search and availability
  const filteredParents = useMemo(() => {
    let filtered = availableParents.filter(parent => {
      const availableQuantity = parent.typeBreakdown?.[section] || 0;
      return availableQuantity > 0;
    });

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(parent =>
        parent.plant.toLowerCase().includes(query) ||
        (parent.sku && parent.sku.toLowerCase().includes(query)) ||
        (parent.variety && parent.variety.toLowerCase().includes(query)) ||
        (parent.colour && parent.colour.toLowerCase().includes(query))
      );
    }

    return filtered.slice(0, 50); // Limit to 50 for performance
  }, [availableParents, searchQuery, section]);

  const handleSelectParent = (parent: ParentMaster) => {
    onSelectParent(parent);
  };

  const formatPrice = (price?: number) => {
    return price ? `₹${price.toLocaleString()}` : '—';
  };

  const getAvailableQuantity = (parent: ParentMaster) => {
    return parent.typeBreakdown?.[section] || 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-3 border-b border-slate-200">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredParents.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">
            {searchQuery ? 'No match' : 'No parents'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredParents.map(parent => {
              const isSelected = selectedParent?.sku === parent.sku;
              return (
                <button
                  key={parent.sku}
                  onClick={() => handleSelectParent(parent)}
                  className={`w-full p-2.5 text-left rounded-lg transition-colors flex items-center gap-2 ${
                    isSelected
                      ? 'bg-emerald-100 border border-emerald-300'
                      : 'border border-transparent hover:bg-slate-50'
                  }`}
                >
                  {isSelected && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-slate-900 truncate">{parent.plant}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono">{parent.sku}</span>
                      <span>{formatPrice(parent.price)}</span>
                      <span>·</span>
                      <span className="text-emerald-600">{getAvailableQuantity(parent)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}