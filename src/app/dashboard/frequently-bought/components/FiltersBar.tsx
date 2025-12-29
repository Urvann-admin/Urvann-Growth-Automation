import React from 'react';
import { Search, X, RefreshCw, Download } from 'lucide-react';
import Select, { MultiValue } from 'react-select';
import { SubstoreOption } from '@/types/frequentlyBought';
import { HUB_MAPPINGS } from '@/shared/constants/hubs';
import FiltersBarSkeleton from './FiltersBarSkeleton';

interface FiltersBarProps {
  substores: SubstoreOption[];
  selectedSubstores: SubstoreOption[];
  searchTerm: string;
  activeSearch: string;
  loading: boolean;
  loadingAnalysis: boolean;
  analysisDataLength: number;
  onSubstoreChange: (selected: MultiValue<SubstoreOption>) => void;
  onSearchTermChange: (value: string) => void;
  onSearch: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onClearSearch: () => void;
  onRefresh: () => void;
  onExport: () => void;
  onClearAllFilters: () => void;
  showSkeleton?: boolean;
}

const selectStyles = {
  control: (base: object, state: { isFocused: boolean }) => ({
    ...base,
    borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
    boxShadow: state.isFocused ? '0 0 0 1px #6366f1' : 'none',
    '&:hover': { borderColor: '#6366f1' },
    minHeight: '40px',
    borderRadius: '8px',
  }),
  multiValue: (base: object) => ({
    ...base,
    backgroundColor: '#eef2ff',
    borderRadius: '4px',
  }),
  multiValueLabel: (base: object) => ({
    ...base,
    color: '#4338ca',
    fontWeight: 500,
    fontSize: '12px',
  }),
  multiValueRemove: (base: object) => ({
    ...base,
    color: '#6366f1',
    '&:hover': { backgroundColor: '#c7d2fe', color: '#4338ca' },
  }),
  option: (base: object, state: { isSelected: boolean; isFocused: boolean }) => ({
    ...base,
    backgroundColor: state.isSelected ? '#6366f1' : state.isFocused ? '#eef2ff' : 'white',
    color: state.isSelected ? 'white' : '#334155',
    fontSize: '14px',
  }),
  placeholder: (base: object) => ({
    ...base,
    color: '#94a3b8',
    fontSize: '14px',
  }),
  menu: (base: object) => ({
    ...base,
    zIndex: 50,
    borderRadius: '8px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
  }),
};

export default function FiltersBar({
  substores,
  selectedSubstores,
  searchTerm,
  activeSearch,
  loading,
  loadingAnalysis,
  analysisDataLength,
  onSubstoreChange,
  onSearchTermChange,
  onSearch,
  onKeyPress,
  onClearSearch,
  onRefresh,
  onExport,
  onClearAllFilters,
  showSkeleton = false,
}: FiltersBarProps) {
  if (showSkeleton) {
    return <FiltersBarSkeleton />;
  }

  // Convert hubs to options for the dropdown
  const hubOptions: SubstoreOption[] = HUB_MAPPINGS.map(mapping => ({
    value: mapping.hub,
    label: mapping.hub,
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
      <div className="flex items-center gap-4">
        <div className="w-72">
          <Select
            isMulti
            value={selectedSubstores}
            onChange={onSubstoreChange}
            options={hubOptions}
            placeholder="Filter by hub..."
            className="text-sm"
            classNamePrefix="select"
            isClearable
            isSearchable
            styles={selectStyles}
          />
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder="Search by SKU or product name..."
            className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={onClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={onSearch}
          disabled={loadingAnalysis}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Search
        </button>

        <div className="h-8 w-px bg-slate-200" />

        <button
          onClick={onRefresh}
          disabled={loading || loadingAnalysis}
          className="p-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading || loadingAnalysis ? 'animate-spin' : ''}`} />
        </button>

        <button
          onClick={onExport}
          disabled={loading || loadingAnalysis}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 rounded-lg transition-colors border border-emerald-200"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {(selectedSubstores.length > 0 || activeSearch) && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Active Filters:</span>
          {selectedSubstores.map((s) => (
            <span key={s.value} className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
              {s.label}
            </span>
          ))}
          {activeSearch && (
            <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-700 rounded-md border border-amber-100">
              &quot;{activeSearch}&quot;
            </span>
          )}
          <button
            onClick={onClearAllFilters}
            className="text-xs text-slate-500 hover:text-slate-700 font-medium ml-2"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

