'use client';

import { useMemo, useState } from 'react';
import { Save, RotateCcw, Plus, Loader2, Box, GitBranch, Layers, MapPin, Search } from 'lucide-react';
import type { ListingScreenProps } from './types';
import { useListingState } from './useListingState';
import { ProductTable } from './ProductTable';
import { CustomSelect } from '@/app/dashboard/listing/components/CustomSelect';
import { HUB_MAPPINGS } from '@/shared/constants/hubs';

export function ListingScreen({ section, onSuccess }: ListingScreenProps) {
  const { state, allImages, actions } = useListingState(section);
  const [savingAll, setSavingAll] = useState(false);

  const hubOptions = useMemo(
    () => HUB_MAPPINGS.map((m) => ({ value: m.hub, label: m.hub })),
    []
  );

  const childHubReady = state.listingMode !== 'child' || Boolean(state.childContextHub?.trim());

  const initialTableLoading = useMemo(
    () =>
      state.isLoading ||
      (state.listingMode === 'parent' && state.parentListLoading && state.productRows.length === 0),
    [state.isLoading, state.listingMode, state.parentListLoading, state.productRows.length]
  );

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
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex flex-col gap-3 shrink-0 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Box className="w-5 h-5 text-[#E6007A] shrink-0" />
          <h2 className="text-sm font-semibold text-slate-800">Products</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {state.productRows.length} {state.productRows.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 sm:ml-4">
          <button
            type="button"
            onClick={() => actions.setListingMode('parent')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              state.listingMode === 'parent'
                ? 'bg-white text-[#E6007A] shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            Parent listing
          </button>
          <button
            type="button"
            onClick={() => actions.setListingMode('child')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              state.listingMode === 'child'
                ? 'bg-white text-[#E6007A] shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Child listing
          </button>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
          {state.listingMode === 'child' && (
            <button
              onClick={actions.addEmptyProductRow}
              disabled={!state.childContextHub?.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-colors text-[#E6007A] bg-pink-50 border-pink-200 hover:bg-pink-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Row
            </button>
          )}
          <button
            onClick={actions.clearAll}
            disabled={state.listingMode === 'parent' ? state.parentListLoading : state.productRows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            Clear
          </button>
          <button
            onClick={handleSaveAll}
            disabled={
              savingAll ||
              state.isSaving ||
              state.productRows.length === 0 ||
              !childHubReady
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            style={{ backgroundColor: '#E6007A' }}
          >
            {savingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All
          </button>
        </div>
      </div>

      {state.listingMode === 'parent' && (
        <div className="shrink-0 px-6 py-3 bg-white border-b border-slate-200 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
          <div className="min-w-[160px] max-w-xs flex-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">Base parent SKU</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={state.parentSkuFilter}
                onChange={(e) => actions.setParentListingSkuFilter(e.target.value)}
                placeholder="e.g. TES000701"
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="min-w-[180px] max-w-md flex-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={state.parentNameFilter}
                onChange={(e) => actions.setParentListingNameFilter(e.target.value)}
                placeholder="Plant, final name, variety…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
                autoComplete="off"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 pb-0.5 max-w-xl sm:pb-2">
            Filters apply to Parent Master results (partial match). Both filters combine with AND.
          </p>
        </div>
      )}

      {state.listingMode === 'child' && (
        <div className="shrink-0 px-6 py-3 bg-white border-b border-slate-200 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
          <div className="min-w-[200px] max-w-xs flex-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Listing hub <span className="text-red-500">*</span>
            </label>
            <CustomSelect
              value={state.childContextHub}
              onChange={(value) => actions.setChildContextHub(value)}
              options={hubOptions}
              placeholder="Select hub first…"
              searchable={true}
            />
          </div>
          <p className="text-xs text-slate-500 pb-0.5 max-w-2xl">
            Photo rows load after you choose a hub. Parent options are limited to listing products for that hub.
            Changing the hub clears parent selections on all rows.
          </p>
        </div>
      )}

      {/* Scrollable card list */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        {state.listingMode === 'child' && !state.childContextHub?.trim() ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-pink-50 flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-pink-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">Choose a listing hub</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md">
              Use the hub selector above to load unlisted photos and start composing child listings for that hub.
            </p>
          </div>
        ) : (
          <ProductTable
            productRows={state.productRows}
            availableParents={state.availableParents}
            onUpdateRow={actions.updateProductRow}
            onRemoveRow={actions.removeProductRow}
            isLoading={initialTableLoading}
            isSaving={state.isSaving}
            allImages={allImages}
            onAssignImage={(rowId, image) => actions.updateProductRow(rowId, { taggedImages: [image] })}
            onSaveRow={handleSaveRow}
            listingMode={state.listingMode}
            parentListPage={state.parentListPage}
            parentListTotalPages={state.parentListTotalPages}
            parentListLoading={state.parentListLoading}
            onLoadMoreParents={actions.loadMoreParentListingPage}
            onUploadParentPhoto={actions.uploadParentPhotoAndRefresh}
            childContextHub={state.childContextHub}
          />
        )}
      </div>
    </div>
  );
}
