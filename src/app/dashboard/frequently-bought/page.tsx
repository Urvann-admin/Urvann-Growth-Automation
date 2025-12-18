'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { createColumnHelper } from '@tanstack/react-table';
import { DataTable } from '@/components/tables/DataTable';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Search,
  X,
  Package,
  TrendingUp,
  Award,
  Download,
  ChevronLeft,
  ChevronRight,
  Layers,
  BarChart3,
  Upload,
  RotateCw,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Select, { MultiValue } from 'react-select';

// Types
import {
  FrequentlyBoughtItem,
  UniqueSku,
  FrequentlyBoughtPagination,
  SubstoreOption,
  PairedProduct,
} from '@/types/frequentlyBought';

// API utilities
import {
  fetchSubstores as fetchSubstoresApi,
  fetchUniqueSkus as fetchUniqueSkusApi,
  fetchAnalysis,
  fetchAllForExport,
  checkPublishStatus,
} from '@/lib/frequentlyBoughtApi';

// Extended paired product with publish status
interface PairedProductWithStatus extends PairedProduct {
  isPublished?: boolean;
}

// Excel export utility
import { exportFrequentlyBoughtToExcel } from '@/lib/excelExport';

// Column helper
const columnHelper = createColumnHelper<FrequentlyBoughtItem>();

// --- Main Component ---
export default function FrequentlyBoughtPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisData, setAnalysisData] = useState<FrequentlyBoughtItem[]>([]);
  const [uniqueSkus, setUniqueSkus] = useState<UniqueSku[]>([]);
  const [substores, setSubstores] = useState<SubstoreOption[]>([]);
  const [selectedSubstores, setSelectedSubstores] = useState<SubstoreOption[]>([]);
  const [pagination, setPagination] = useState<FrequentlyBoughtPagination>({
    page: 1,
    pageSize: 1,
    totalSkus: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'analysis' | 'skus'>('analysis');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{ 
    sku: string; 
    name: string; 
    topPaired: PairedProductWithStatus[];
    loadingStatus: boolean;
  } | null>(null);
  
  // Push updates state
  const [pushingUpdates, setPushingUpdates] = useState(false);
  const [syncingMapping, setSyncingMapping] = useState(false);

  // Abort controller for cancelling previous requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get selected substore values
  const getSelectedSubstoreValues = useCallback(() => 
    selectedSubstores.map(s => s.value), [selectedSubstores]
  );

  // Fetch substores
  const loadSubstores = useCallback(async () => {
    const data = await fetchSubstoresApi();
    setSubstores(data);
  }, []);

  // Fetch unique SKUs
  const loadUniqueSkus = useCallback(async () => {
    const result = await fetchUniqueSkusApi();
    if (result.success && result.data) {
      setUniqueSkus(result.data);
    }
  }, []);

  // Fetch analysis data with abort support
  const loadAnalysisData = useCallback(async (page = 1, search = '', substoreValues: string[] = []) => {
    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setLoadingAnalysis(true);
      setError(null);

      const result = await fetchAnalysis({
        page,
        search,
        substores: substoreValues,
        signal: abortController.signal,
      });

      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }

      if (result.success && result.data && result.pagination) {
        setAnalysisData(result.data);
        setPagination(result.pagination);
      } else {
        setError(result.message || 'Failed to fetch analysis data');
      }
    } catch (err) {
      // Don't show error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError('Failed to fetch frequently bought together data');
    } finally {
      // Only set loading to false if this is the current request
      if (!abortController.signal.aborted) {
        setLoadingAnalysis(false);
        setLoading(false);
      }
    }
  }, []);

  // Auth check and initial data fetch
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    loadSubstores();
    loadAnalysisData();
    loadUniqueSkus();
  }, [user, authLoading, router, loadSubstores, loadAnalysisData, loadUniqueSkus]);

  // Handlers
  const handleSearch = useCallback(() => {
    setActiveSearch(searchTerm);
    loadAnalysisData(1, searchTerm, getSelectedSubstoreValues());
  }, [searchTerm, getSelectedSubstoreValues, loadAnalysisData]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setActiveSearch('');
    loadAnalysisData(1, '', getSelectedSubstoreValues());
  }, [getSelectedSubstoreValues, loadAnalysisData]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleSubstoreChange = useCallback((selected: MultiValue<SubstoreOption>) => {
    const newSelected = selected as SubstoreOption[];
    setSelectedSubstores(newSelected);
    loadAnalysisData(1, activeSearch, newSelected.map(s => s.value));
  }, [activeSearch, loadAnalysisData]);

  const handleRefresh = useCallback(() => {
    loadAnalysisData(1, activeSearch, getSelectedSubstoreValues());
    loadUniqueSkus();
  }, [activeSearch, getSelectedSubstoreValues, loadAnalysisData, loadUniqueSkus]);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && !loadingAnalysis) {
      loadAnalysisData(newPage, activeSearch, getSelectedSubstoreValues());
    }
  }, [pagination.totalPages, loadingAnalysis, activeSearch, getSelectedSubstoreValues, loadAnalysisData]);

  const handleOpenModal = useCallback(async (sku: string, name: string, topPaired: PairedProduct[]) => {
    // Open modal immediately with loading state
    setModalData({ 
      sku, 
      name, 
      topPaired: topPaired.map(p => ({ ...p, isPublished: undefined })),
      loadingStatus: true,
    });
    setModalOpen(true);

    // Fetch publish status for all paired products
    try {
      const skus = topPaired.map(p => p.sku);
      const result = await checkPublishStatus(skus);
      
      if (result.success && result.data) {
        const statusMap = new Map(result.data.map(r => [r.sku, r.isPublished]));
        const updatedTopPaired = topPaired.map(p => ({
          ...p,
          isPublished: statusMap.get(p.sku) ?? false,
        }));
        
        setModalData({ 
          sku, 
          name, 
          topPaired: updatedTopPaired,
          loadingStatus: false,
        });
      }
    } catch (err) {
      console.error('Failed to check publish status:', err);
      setModalData(prev => prev ? { ...prev, loadingStatus: false } : null);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setModalData(null);
  }, []);

  const handleExportExcel = useCallback(async () => {
    try {
      const result = await fetchAllForExport({
        search: activeSearch,
        substores: getSelectedSubstoreValues(),
      });

      if (!result.success || !result.data) {
        alert('Failed to fetch data for export');
        return;
      }

      exportFrequentlyBoughtToExcel(result.data);
    } catch {
      alert('Failed to export data');
    }
  }, [activeSearch, getSelectedSubstoreValues]);

  const handleClearAllFilters = useCallback(() => {
    setSelectedSubstores([]);
    setActiveSearch('');
    setSearchTerm('');
    loadAnalysisData(1, '', []);
  }, [loadAnalysisData]);

  // Handle sync mapping
  const handleSyncMapping = useCallback(async () => {
    try {
      setSyncingMapping(true);
      const response = await fetch('/api/frequently-bought/sync-mapping', {
        method: 'POST',
      });
      const result = await response.json();
      
      if (result.success) {
        alert(`Successfully synced ${result.totalSynced} SKU mappings!`);
      } else {
        alert(`Failed to sync mappings: ${result.message}`);
      }
    } catch (error) {
      alert('Failed to sync mappings');
      console.error('Sync mapping error:', error);
    } finally {
      setSyncingMapping(false);
    }
  }, []);

  // Handle push all updates
  const handlePushAllUpdates = useCallback(async () => {
    if (!confirm('This will push frequently bought together data for all SKUs to Urvann API. This may take several minutes. Continue?')) {
      return;
    }
    
    try {
      setPushingUpdates(true);
      
      const response = await fetch('/api/frequently-bought/push-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 10 }),
      });
      const result = await response.json();
      
      if (result.success) {
        alert(`Push completed!\n\nSuccessful: ${result.results.successful}\nFailed: ${result.results.failed}\nSkipped: ${result.results.skipped || 0}`);
      } else {
        alert(`Failed to push updates: ${result.message}`);
      }
    } catch (error) {
      alert('Failed to push updates');
      console.error('Push updates error:', error);
    } finally {
      setPushingUpdates(false);
    }
  }, []);

  // Handle push single SKU update
  const handlePushSingleUpdate = useCallback(async (sku: string) => {
    if (!confirm(`Push frequently bought together data for SKU: ${sku}?`)) {
      return;
    }
    
    try {
      const response = await fetch('/api/frequently-bought/push-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, limit: 6 }),
      });
      const result = await response.json();
      
      if (result.success) {
        alert(`Successfully updated SKU: ${sku}`);
      } else {
        alert(`Failed to update SKU: ${result.message}`);
      }
    } catch (error) {
      alert(`Failed to update SKU: ${sku}`);
      console.error('Push single update error:', error);
    }
  }, []);

  // Generate page numbers
  const getPageNumbers = useCallback(() => {
    const pages: (number | string)[] = [];
    const current = pagination.page;
    const total = pagination.totalPages;
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= 3) {
        pages.push(1, 2, 3, 4, '...', total);
      } else if (current >= total - 2) {
        pages.push(1, '...', total - 3, total - 2, total - 1, total);
      } else {
        pages.push(1, '...', current - 1, current, current + 1, '...', total);
      }
    }
    return pages;
  }, [pagination.page, pagination.totalPages]);

  // Table columns
  const columns = useMemo(
    () => [
      columnHelper.accessor('sku', {
        header: 'SKU',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-slate-700 tracking-wide">
              {info.getValue()}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePushSingleUpdate(info.getValue());
              }}
              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
              title="Push updates for this SKU"
            >
              <Upload className="w-3 h-3" />
            </button>
          </div>
        ),
        size: 160,
      }),
      columnHelper.accessor('name', {
        header: 'Product Name',
        cell: (info) => (
          <span className="text-slate-800 line-clamp-2" title={info.getValue()}>
            {info.getValue()}
          </span>
        ),
        size: 300,
      }),
      columnHelper.accessor('totalPairings', {
        header: () => <div className="text-center">Pairings</div>,
        cell: (info) => (
          <div className="flex items-center justify-center">
            <span className="font-semibold text-slate-700 tabular-nums">{info.getValue().toLocaleString()}</span>
          </div>
        ),
        size: 100,
      }),
      columnHelper.accessor('topPaired', {
        header: 'Frequently Paired With',
        cell: (info) => {
          const paired = info.getValue();
          const row = info.row.original;
          if (!paired || paired.length === 0) {
            return <span className="text-slate-400 text-sm italic">No pairings</span>;
          }
          const topThree = paired.slice(0, 3);
          return (
            <div className="flex flex-wrap gap-2 items-center">
              {topThree.map((item, idx) => (
                <span
                  key={item.sku}
                  className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border ${
                    idx === 0
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : idx === 1
                      ? 'bg-slate-50 text-slate-600 border-slate-200'
                      : 'bg-orange-50 text-orange-600 border-orange-200'
                  }`}
                >
                  {idx === 0 && <Award className="w-3 h-3 mr-1" />}
                  {item.sku}
                  <span className="ml-1.5 text-[10px] opacity-70">({item.count})</span>
                </span>
              ))}
              {paired.length > 3 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenModal(row.sku, row.name, paired);
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  +{paired.length - 3} more
                </button>
              )}
            </div>
          );
        },
        enableSorting: false,
        size: 380,
      }),
    ],
    [handleOpenModal]
  );

  // Loading state
  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <Header 
        selectedView={selectedView} 
        onViewChange={setSelectedView} 
        onBack={() => router.push('/dashboard')} 
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Row */}
        <StatsRow 
          uniqueSkusCount={uniqueSkus.length}
          totalSkus={pagination.totalSkus}
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
        />

        {/* Push Updates Bar */}
        <PushUpdatesBar
          syncingMapping={syncingMapping}
          pushingUpdates={pushingUpdates}
          onSyncMapping={handleSyncMapping}
          onPushAllUpdates={handlePushAllUpdates}
        />

        {/* Filters & Actions */}
        <FiltersBar
          substores={substores}
          selectedSubstores={selectedSubstores}
          searchTerm={searchTerm}
          activeSearch={activeSearch}
          loading={loading}
          loadingAnalysis={loadingAnalysis}
          analysisDataLength={analysisData.length}
          onSubstoreChange={handleSubstoreChange}
          onSearchTermChange={setSearchTerm}
          onSearch={handleSearch}
          onKeyPress={handleKeyPress}
          onClearSearch={handleClearSearch}
          onRefresh={handleRefresh}
          onExport={handleExportExcel}
          onClearAllFilters={handleClearAllFilters}
        />

        {/* Info Banner */}
        {!activeSearch && selectedView === 'analysis' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Search className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-sm text-blue-700">
                <span className="font-medium">Showing 1 SKU.</span> Use the search bar above to find frequently bought together products for a specific SKU.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && <ErrorMessage message={error} />}

        {/* Content */}
        {selectedView === 'analysis' ? (
          <AnalysisView
            loading={loading}
            loadingAnalysis={loadingAnalysis}
            analysisData={analysisData}
            columns={columns}
            pagination={pagination}
            onPageChange={handlePageChange}
            getPageNumbers={getPageNumbers}
          />
        ) : (
          <AllSkusView 
            uniqueSkus={uniqueSkus} 
            searchTerm={searchTerm} 
          />
        )}
      </main>

      {/* Modal */}
      {modalOpen && modalData && (
        <PairedProductsModal 
          data={modalData} 
          onClose={handleCloseModal} 
        />
      )}

    </div>
  );
}

// --- Sub-Components ---

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-200 rounded-full"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <div className="text-center">
          <p className="text-slate-700 font-medium">Loading Frequently Bought Together</p>
          <p className="text-slate-400 text-sm mt-1">Analyzing product pairings...</p>
        </div>
      </div>
    </div>
  );
}

function Header({ 
  selectedView, 
  onViewChange, 
  onBack 
}: { 
  selectedView: 'analysis' | 'skus'; 
  onViewChange: (view: 'analysis' | 'skus') => void;
  onBack: () => void;
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="text-lg font-semibold text-slate-800 tracking-tight">
                Frequently Bought Together
              </h1>
              <p className="text-xs text-slate-500">Product co-purchase analysis</p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => onViewChange('analysis')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                selectedView === 'analysis'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analysis
            </button>
            <button
              onClick={() => onViewChange('skus')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                selectedView === 'skus'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              All SKUs
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function StatsRow({ 
  uniqueSkusCount, 
  totalSkus, 
  currentPage, 
  totalPages 
}: { 
  uniqueSkusCount: number; 
  totalSkus: number; 
  currentPage: number; 
  totalPages: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-6 mb-8">
      <StatCard 
        label="Total SKUs" 
        value={uniqueSkusCount.toLocaleString()} 
        icon={Package} 
        iconBg="bg-indigo-50" 
        iconColor="text-indigo-500" 
      />
      <StatCard 
        label="With Pairings" 
        value={totalSkus.toLocaleString()} 
        icon={TrendingUp} 
        iconBg="bg-emerald-50" 
        iconColor="text-emerald-500" 
      />
      <StatCard 
        label="Current Page" 
        value={`${currentPage}`}
        subValue={`/ ${totalPages || 1}`}
        icon={Layers} 
        iconBg="bg-amber-50" 
        iconColor="text-amber-500" 
      />
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  subValue,
  icon: Icon, 
  iconBg, 
  iconColor 
}: { 
  label: string; 
  value: string; 
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>; 
  iconBg: string; 
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-800 tracking-tight">
            {value}
            {subValue && <span className="text-lg font-normal text-slate-400">{subValue}</span>}
          </p>
        </div>
        <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function FiltersBar({
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
}: {
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
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
      <div className="flex items-center gap-4">
        <div className="w-72">
          <Select
            isMulti
            value={selectedSubstores}
            onChange={onSubstoreChange}
            options={substores}
            placeholder="Filter by substore..."
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
          disabled={loading || loadingAnalysis || analysisDataLength === 0}
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

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
      {message}
    </div>
  );
}

function AnalysisView({
  loading,
  loadingAnalysis,
  analysisData,
  columns,
  pagination,
  onPageChange,
  getPageNumbers,
}: {
  loading: boolean;
  loadingAnalysis: boolean;
  analysisData: FrequentlyBoughtItem[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: any[];
  pagination: FrequentlyBoughtPagination;
  onPageChange: (page: number) => void;
  getPageNumbers: () => (number | string)[];
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
      {/* Loading Overlay */}
      {loadingAnalysis && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-indigo-200 rounded-full"></div>
              <div className="absolute inset-0 w-12 h-12 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-slate-600 text-sm font-medium">Searching...</p>
          </div>
        </div>
      )}

      {loading && !loadingAnalysis ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-slate-500 text-sm">Analyzing patterns...</p>
          </div>
        </div>
      ) : (
        <>
          <DataTable
            data={analysisData}
            columns={columns}
            pageSize={10}
            showPagination={false}
            emptyMessage="No data found"
            isLoading={false}
          />

          {pagination.totalPages > 0 && (
            <Pagination
              pagination={pagination}
              loadingAnalysis={loadingAnalysis}
              onPageChange={onPageChange}
              getPageNumbers={getPageNumbers}
            />
          )}
        </>
      )}
    </div>
  );
}

function Pagination({
  pagination,
  loadingAnalysis,
  onPageChange,
  getPageNumbers,
}: {
  pagination: FrequentlyBoughtPagination;
  loadingAnalysis: boolean;
  onPageChange: (page: number) => void;
  getPageNumbers: () => (number | string)[];
}) {
  return (
    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-700">{((pagination.page - 1) * pagination.pageSize) + 1}</span> to{' '}
        <span className="font-medium text-slate-700">{Math.min(pagination.page * pagination.pageSize, pagination.totalSkus)}</span> of{' '}
        <span className="font-medium text-slate-700">{pagination.totalSkus.toLocaleString()}</span> results
      </p>
      
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page === 1 || loadingAnalysis}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        {getPageNumbers().map((pageNum, idx) => (
          <button
            key={idx}
            onClick={() => typeof pageNum === 'number' && onPageChange(pageNum)}
            disabled={pageNum === '...' || loadingAnalysis}
            className={`min-w-[36px] h-9 px-3 text-sm font-medium rounded-lg transition-all ${
              pageNum === pagination.page
                ? 'bg-indigo-600 text-white'
                : pageNum === '...'
                ? 'text-slate-400 cursor-default'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {pageNum}
          </button>
        ))}
        
        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.totalPages || loadingAnalysis}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function AllSkusView({ uniqueSkus, searchTerm }: { uniqueSkus: UniqueSku[]; searchTerm: string }) {
  const filteredSkus = uniqueSkus
    .filter((item) =>
      !searchTerm ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .slice(0, 100);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-base font-semibold text-slate-800">All Unique SKUs</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {uniqueSkus.length.toLocaleString()} products found in transaction data
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">#</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Name</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Orders</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSkus.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center">
                  <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm text-slate-500">No SKUs found</p>
                </td>
              </tr>
            ) : (
              filteredSkus.map((item, index) => (
                <tr key={item.sku} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-400 tabular-nums">{index + 1}</td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-slate-700">{item.sku}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.name}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-md">
                      {item.orderCount.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PushUpdatesBar({
  syncingMapping,
  pushingUpdates,
  onSyncMapping,
  onPushAllUpdates,
}: {
  syncingMapping: boolean;
  pushingUpdates: boolean;
  onSyncMapping: () => void;
  onPushAllUpdates: () => void;
}) {
  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-indigo-800 mb-1">
            Push Updates to Urvann API
          </h3>
          <p className="text-xs text-indigo-600">
            Sync SKU mappings first, then push frequently bought together data to products
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onSyncMapping}
            disabled={syncingMapping || pushingUpdates}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {syncingMapping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RotateCw className="w-4 h-4" />
                Sync Mappings
              </>
            )}
          </button>
          <button
            onClick={onPushAllUpdates}
            disabled={syncingMapping || pushingUpdates}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {pushingUpdates ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Pushing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Push All Updates
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function PairedProductsModal({ 
  data, 
  onClose 
}: { 
  data: { sku: string; name: string; topPaired: PairedProductWithStatus[]; loadingStatus: boolean }; 
  onClose: () => void;
}) {
  const publishedCount = data.topPaired.filter(p => p.isPublished === true).length;
  const unpublishedCount = data.topPaired.filter(p => p.isPublished === false).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Paired Products</h3>
                <p className="text-sm text-slate-500 mt-0.5 font-mono">{data.sku}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Status Summary */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-slate-500">
                {data.topPaired.length} products frequently bought together
              </p>
              {data.loadingStatus ? (
                <span className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Checking status...
                </span>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle className="w-3 h-3" />
                    {publishedCount} Published
                  </span>
                  <span className="flex items-center gap-1 text-xs text-rose-600">
                    <XCircle className="w-3 h-3" />
                    {unpublishedCount} Unpublished
                  </span>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              {data.topPaired.map((item, index) => (
                <div
                  key={item.sku}
                  className={`p-4 rounded-xl border transition-all ${
                    item.isPublished === false 
                      ? 'bg-rose-50/50 border-rose-200' 
                      : index === 0 ? 'bg-amber-50/50 border-amber-200' :
                        index === 1 ? 'bg-slate-50 border-slate-200' :
                        index === 2 ? 'bg-orange-50/50 border-orange-200' :
                        'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      item.isPublished === false
                        ? 'bg-rose-500 text-white'
                        : index === 0 ? 'bg-amber-500 text-white' :
                          index === 1 ? 'bg-slate-400 text-white' :
                          index === 2 ? 'bg-orange-400 text-white' :
                          'bg-slate-200 text-slate-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-slate-800">{item.sku}</span>
                          {item.isPublished !== undefined && (
                            item.isPublished ? (
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500" />
                            )
                          )}
                          {item.isPublished === undefined && data.loadingStatus && (
                            <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
                          )}
                        </div>
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {item.count}x
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{item.name}</p>
                      {item.isPublished === false && (
                        <p className="text-xs text-rose-500 mt-1">Unpublished or out of stock</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
