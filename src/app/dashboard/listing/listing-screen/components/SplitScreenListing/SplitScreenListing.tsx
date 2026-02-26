'use client';

import { useState, useRef, useCallback } from 'react';
import { Save, RotateCcw, Plus, Loader2, Image as ImageIcon, Box } from 'lucide-react';
import type { SplitScreenListingProps } from './types';
import { useSplitScreenState } from './useSplitScreenState';
import { ImagePanel } from './ImagePanel';
import { ProductTable } from './ProductTable';

const SIDEBAR_WIDTH_OPEN = 240;   // w-60
const SIDEBAR_WIDTH_COLLAPSED = 72; // w-[72px]
const FAB_OFFSET = 24;

export function SplitScreenListing({ section, onSuccess, sidebarCollapsed = false }: SplitScreenListingProps) {
  const { state, allImages, imageCollections, actions } = useSplitScreenState(section);
  const [leftPanelWidth, setLeftPanelWidth] = useState(38);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      setLeftPanelWidth(Math.max(20, Math.min(65, newWidth)));
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

  const unsavedCount = state.productRows.filter((row) => !row.isSaved).length;

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Main content */}
      <div
        ref={containerRef}
        className="flex-1 flex min-h-0"
        style={{ cursor: isResizing ? 'col-resize' : 'default' }}
      >
        {/* Left Panel - Images */}
        <div className="bg-white flex flex-col" style={{ width: `${leftPanelWidth}%` }}>
          <div className="h-16 px-4 border-b border-slate-200 flex items-center gap-2 shrink-0">
            <ImageIcon className="w-4 h-4 text-[#E6007A] shrink-0" />
            <h2 className="text-sm font-medium text-slate-700">Images</h2>
            <span className="text-xs text-slate-400 ml-auto">
              {state.selectedImages.length} selected
            </span>
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
          className="w-[3px] bg-slate-200 hover:bg-pink-400 cursor-col-resize shrink-0 relative transition-colors group"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-8 rounded-full bg-slate-300 group-hover:bg-pink-400 transition-colors opacity-0 group-hover:opacity-100" />
        </div>

        {/* Right Panel - Products */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="h-16 px-4 border-b border-slate-200 flex items-center gap-2 bg-white shrink-0">
            <Box className="w-4 h-4 text-[#E6007A] shrink-0" />
            <h2 className="text-sm font-medium text-slate-700">Products</h2>
            <span className="text-xs text-slate-400">
              {state.productRows.length} {state.productRows.length === 1 ? 'item' : 'items'}
            </span>
            <div className="flex items-center gap-2 ml-auto shrink-0">
              <button
                onClick={actions.addEmptyProductRow}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-colors text-[#E6007A] bg-pink-50 border-pink-200 hover:bg-pink-100"
              >
                <Plus className="w-4 h-4" />
                Add Row
              </button>
              <button
                onClick={actions.clearAll}
                disabled={state.productRows.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" />
                Clear
              </button>
            </div>
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

      {/* Floating Save All - right of sidebar */}
      <button
        onClick={handleSaveAll}
        disabled={state.productRows.length === 0 || state.isSaving}
        className="fixed bottom-6 z-20 inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
        style={{
          backgroundColor: '#E6007A',
          left: `${(sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_OPEN) + FAB_OFFSET}px`,
        }}
      >
        {state.isSaving ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            Save All ({unsavedCount})
          </>
        )}
      </button>
    </div>
  );
}
