'use client';

import { useState } from 'react';
import { Save, RotateCcw, Plus, Loader2, Box } from 'lucide-react';
import type { ListingScreenProps } from './types';
import { useListingState } from './useListingState';
import { ProductTable } from './ProductTable';

export function ListingScreen({ section, onSuccess }: ListingScreenProps) {
  const { state, allImages, actions } = useListingState(section);
  const [savingAll, setSavingAll] = useState(false);

  const handleSaveAll = async () => {
    setSavingAll(true);
    const savedRows = await actions.saveAllProducts();
    if (savedRows && savedRows.length > 0) {
      for (const row of savedRows) {
        actions.removeProductRow(row.id);
      }
      if (onSuccess) onSuccess(savedRows);
    }
    setSavingAll(false);
  };

  const handleSaveRow = async (rowId: string) => {
    const success = await actions.saveCurrentProduct(rowId);
    if (success) {
      actions.removeProductRow(rowId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center gap-3 shrink-0">
        <Box className="w-5 h-5 text-[#E6007A]" />
        <h2 className="text-sm font-semibold text-slate-800">Products</h2>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          {state.productRows.length} {state.productRows.length === 1 ? 'item' : 'items'}
        </span>
        <div className="flex items-center gap-2 ml-auto">
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
          <button
            onClick={handleSaveAll}
            disabled={savingAll || state.isSaving || state.productRows.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            style={{ backgroundColor: '#E6007A' }}
          >
            {savingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All
          </button>
        </div>
      </div>

      {/* Scrollable card list */}
      <div className="flex-1 overflow-y-auto p-6">
        <ProductTable
          productRows={state.productRows}
          availableParents={state.availableParents}
          onUpdateRow={actions.updateProductRow}
          onRemoveRow={actions.removeProductRow}
          section={section}
          isLoading={state.isLoading}
          isSaving={state.isSaving}
          allImages={allImages}
          onAssignImage={(rowId, image) => actions.updateProductRow(rowId, { taggedImages: [image] })}
          onSaveRow={handleSaveRow}
        />
      </div>
    </div>
  );
}
