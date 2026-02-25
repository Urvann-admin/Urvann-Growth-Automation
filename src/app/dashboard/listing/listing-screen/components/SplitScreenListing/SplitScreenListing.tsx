'use client';

import { useState, useRef, useCallback } from 'react';
import { Save, RotateCcw, Plus, Loader2 } from 'lucide-react';
import type { SplitScreenListingProps } from './types';
import { useSplitScreenState } from './useSplitScreenState';
import { ImagePanel } from './ImagePanel';
import { ProductTable } from './ProductTable';

export function SplitScreenListing({ section, onSuccess }: SplitScreenListingProps) {
  const { state, allImages, imageCollections, actions } = useSplitScreenState(section);
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // Percentage - 50/50 split for new layout
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle panel resizing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      // Constrain between 20% and 80%
      const constrainedWidth = Math.max(20, Math.min(80, newWidth));
      setLeftPanelWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleSaveAll = async () => {
    const savedRows = await actions.saveAllProducts();
    if (onSuccess && savedRows && savedRows.length > 0) {
      onSuccess(savedRows);
    }
  };

  const unsavedCount = state.productRows.filter(row => !row.isSaved).length;
  const validCount = state.productRows.filter(row => row.isValid && !row.isSaved).length;
  const selectedImageCount = state.selectedImages.length;

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900 capitalize">{section} Listing</h1>
          
          <div className="flex items-center gap-4">
            {/* Status indicators */}
            <div className="hidden sm:flex items-center gap-4 text-sm">
              {unsavedCount > 0 && (
                <span className="text-amber-600 font-medium">
                  {validCount} ready to save
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={actions.addEmptyProductRow}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                <Plus className="w-4 h-4" />
                Add Row
              </button>
              
              <button
                onClick={actions.clearAll}
                disabled={state.productRows.length === 0}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" />
                Clear All
              </button>
              
              <button
                onClick={handleSaveAll}
                disabled={state.productRows.length === 0 || state.isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save All ({state.productRows.filter(r => !r.isSaved).length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div 
        ref={containerRef}
        className="flex-1 flex min-h-0"
        style={{ cursor: isResizing ? 'col-resize' : 'default' }}
      >
        {/* Left Panel - Images */}
        <div 
          className="bg-white border-r border-slate-200 flex flex-col"
          style={{ width: `${leftPanelWidth}%` }}
        >
          <div className="px-3 py-2 border-b border-slate-200">
            <h2 className="text-sm font-medium text-slate-700">Images</h2>
          </div>
          
          <div className="flex-1 min-h-0">
            <ImagePanel
              collections={imageCollections}
              allImages={allImages}
              selectedImages={state.selectedImages}
              onToggleImage={actions.toggleImageSelection}
              onClearSelection={actions.clearImageSelection}
              isLoading={state.isLoading}
            />
          </div>
        </div>

        {/* Resizer */}
        <div
          className="w-1 bg-slate-200 hover:bg-slate-300 cursor-col-resize shrink-0"
          onMouseDown={handleMouseDown}
        />

        {/* Right Panel - Product Table */}
        <div 
          className="bg-white flex flex-col"
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-700">Products</h2>
            <span className="text-xs text-slate-500">
              Rows: {state.productRows.length}
            </span>
          </div>
          
          <div className="flex-1 min-h-0">
            <ProductTable
              productRows={state.productRows}
              availableParents={state.availableParents}
              onUpdateRow={actions.updateProductRow}
              onRemoveRow={actions.removeProductRow}
              section={section}
              isLoading={state.isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}