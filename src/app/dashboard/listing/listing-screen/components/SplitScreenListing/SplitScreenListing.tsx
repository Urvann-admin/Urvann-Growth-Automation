'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Save, RotateCcw, Plus, Loader2, Image as ImageIcon, Box } from 'lucide-react';
import type { SplitScreenListingProps } from './types';
import { useSplitScreenState } from './useSplitScreenState';
import { ImagePanel } from './ImagePanel';
import { ProductTable } from './ProductTable';

const SIDEBAR_WIDTH_OPEN = 240;
const SIDEBAR_WIDTH_COLLAPSED = 72;
const FAB_OFFSET = 24;
const LEFT_PANEL_WIDTH_PERCENT = 28;

export function SplitScreenListing({ section, onSuccess, sidebarCollapsed = false }: SplitScreenListingProps) {
  const { state, allImages, imageCollections, actions } = useSplitScreenState(section);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(LEFT_PANEL_WIDTH_PERCENT);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeRow = state.productRows.find((r) => r.id === activeRowId) ?? null;

  useEffect(() => {
    if (state.productRows.length > 0) {
      if (!activeRowId || !state.productRows.some((r) => r.id === activeRowId)) {
        setActiveRowId(state.productRows[0].id);
      }
    } else {
      setActiveRowId(null);
    }
  }, [state.productRows, activeRowId]);

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

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Main content */}
      <div
        ref={containerRef}
        className="flex-1 flex min-h-0"
        style={{ cursor: isResizing ? 'col-resize' : 'default' }}
      >
        {/* Left Panel - Single photo for current product */}
        <div className="bg-white flex flex-col border-r border-slate-200" style={{ width: `${leftPanelWidth}%` }}>
          <div className="h-14 px-4 border-b border-slate-200 flex items-center gap-2 shrink-0">
            <ImageIcon className="w-4 h-4 text-[#E6007A] shrink-0" />
            <h2 className="text-sm font-medium text-slate-700">Photo</h2>
            {activeRow && (
              <span className="text-xs text-slate-400 ml-auto truncate max-w-[120px]">
                Product {state.productRows.findIndex((r) => r.id === activeRow.id) + 1}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <ImagePanel
              activeRow={activeRow}
              productRows={state.productRows}
              collections={imageCollections}
              allImages={allImages}
              onAssignImage={(rowId, image) => actions.updateProductRow(rowId, { taggedImages: [image] })}
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
              activeRowId={activeRowId}
              onActiveRowChange={setActiveRowId}
            />
          </div>
        </div>
      </div>

      {/* Save & Next: save current product then switch to next */}
      <button
        onClick={async () => {
          const saved = await actions.saveCurrentProduct(activeRowId);
          if (saved && state.productRows.length > 1) {
            const idx = state.productRows.findIndex((r) => r.id === activeRowId);
            const nextIdx = idx < 0 ? 0 : (idx + 1) % state.productRows.length;
            setActiveRowId(state.productRows[nextIdx].id);
          }
          if (saved && state.productRows.length === 1 && onSuccess) {
            onSuccess(state.productRows);
          }
        }}
        disabled={state.productRows.length === 0 || state.isSaving || !activeRowId}
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
            Save & Next
          </>
        )}
      </button>
    </div>
  );
}
