'use client';

import { useMemo } from 'react';
import { Package, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { ParentMaster } from '@/models/parentMaster';
import type { ListingSection } from '@/models/listingProduct';

export interface ParentQuantityDisplayProps {
  parents: ParentMaster[];
  section: ListingSection;
  requiredQuantity: number;
  className?: string;
}

export function ParentQuantityDisplay({
  parents,
  section,
  requiredQuantity,
  className = '',
}: ParentQuantityDisplayProps) {
  const quantityAnalysis = useMemo(() => {
    const analysis = parents.map(parent => {
      const availableQuantity = parent.typeBreakdown?.[section] || 0;
      const isValid = availableQuantity >= requiredQuantity;
      const maxPossible = Math.floor(availableQuantity / requiredQuantity);
      
      return {
        parent,
        availableQuantity,
        isValid,
        maxPossible,
        shortfall: isValid ? 0 : requiredQuantity - availableQuantity,
      };
    });

    const totalAvailable = analysis.reduce((sum, item) => sum + item.availableQuantity, 0);
    const allValid = analysis.every(item => item.isValid);
    const minPossible = analysis.length > 0 ? Math.min(...analysis.map(item => item.maxPossible)) : 0;

    return {
      analysis,
      totalAvailable,
      allValid,
      minPossible,
      hasParents: parents.length > 0,
    };
  }, [parents, section, requiredQuantity]);

  if (!quantityAnalysis.hasParents) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <Info className="h-5 w-5" />
          <span className="font-medium">No parent products selected</span>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Select parent products to see quantity analysis
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall Status */}
      <div className={`border rounded-lg p-4 ${
        quantityAnalysis.allValid 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {quantityAnalysis.allValid ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-600" />
          )}
          <span className={`font-medium ${
            quantityAnalysis.allValid ? 'text-green-800' : 'text-red-800'
          }`}>
            {quantityAnalysis.allValid 
              ? 'All parents have sufficient quantities' 
              : 'Some parents have insufficient quantities'
            }
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Required per parent:</span>
            <span className="ml-2 font-medium">{requiredQuantity}</span>
          </div>
          <div>
            <span className="text-gray-600">Max possible quantity:</span>
            <span className={`ml-2 font-medium ${
              quantityAnalysis.minPossible >= requiredQuantity ? 'text-green-600' : 'text-red-600'
            }`}>
              {quantityAnalysis.minPossible}
            </span>
          </div>
        </div>
      </div>

      {/* Individual Parent Analysis */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">
          Individual Parent Quantities ({section} section)
        </h4>
        
        {quantityAnalysis.analysis.map(({ parent, availableQuantity, isValid, maxPossible, shortfall }) => (
          <div
            key={parent.sku}
            className={`border rounded-lg p-3 ${
              isValid ? 'bg-white border-gray-200' : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-gray-900">{parent.plant}</span>
                {parent.variety && (
                  <span className="text-gray-500 text-sm">({parent.variety})</span>
                )}
                <span className="text-gray-400 text-sm">• {parent.sku}</span>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="text-right">
                  <div className={`font-medium ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                    Available: {availableQuantity}
                  </div>
                  <div className="text-gray-500">
                    Max possible: {maxPossible}
                  </div>
                </div>
                
                {!isValid && (
                  <div className="text-right">
                    <div className="text-red-600 font-medium">
                      Short: {shortfall}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quantity breakdown for all sections */}
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="grid grid-cols-4 gap-2 text-xs text-gray-500">
                <div>
                  <span className="block">Listing</span>
                  <span className={`font-medium ${section === 'listing' ? 'text-emerald-600' : ''}`}>
                    {parent.typeBreakdown?.listing || 0}
                  </span>
                </div>
                <div>
                  <span className="block">Revival</span>
                  <span className={`font-medium ${section === 'revival' ? 'text-emerald-600' : ''}`}>
                    {parent.typeBreakdown?.revival || 0}
                  </span>
                </div>
                <div>
                  <span className="block">Growth</span>
                  <span className={`font-medium ${section === 'growth' ? 'text-emerald-600' : ''}`}>
                    {parent.typeBreakdown?.growth || 0}
                  </span>
                </div>
                <div>
                  <span className="block">Consumer</span>
                  <span className={`font-medium ${section === 'consumer' ? 'text-emerald-600' : ''}`}>
                    {parent.typeBreakdown?.consumers || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {!quantityAnalysis.allValid && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800 mb-1">Recommendations</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Reduce the required quantity to {quantityAnalysis.minPossible} or less</li>
                <li>• Remove parents with insufficient quantities</li>
                <li>• Add more parent products with available {section} quantities</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}