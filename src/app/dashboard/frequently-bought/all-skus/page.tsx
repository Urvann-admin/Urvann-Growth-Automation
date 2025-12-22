'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { UniqueSku, SubstoreOption } from '@/types/frequentlyBought';
import { MultiValue } from 'react-select';
import {
  fetchSubstores as fetchSubstoresApi,
  fetchUniqueSkus as fetchUniqueSkusApi,
  fetchTopSkus as fetchTopSkusApi,
  fetchAllSkusForExport,
} from '@/lib/frequentlyBoughtApi';
import { exportAllSkusToExcel } from '@/lib/excelExport';

// Components
import LoadingScreen from '../components/LoadingScreen';
import Header from '../components/Header';
import StatsRow from '../components/StatsRow';
import FiltersBar from '../components/FiltersBar';
import AllSkusView from '../components/AllSkusView';

export default function AllSkusPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [loadingAllSkus, setLoadingAllSkus] = useState(false);
  const [uniqueSkusCount, setUniqueSkusCount] = useState(0);
  const [topSkus, setTopSkus] = useState<UniqueSku[]>([]);
  const [substores, setSubstores] = useState<SubstoreOption[]>([]);
  const [selectedSubstores, setSelectedSubstores] = useState<SubstoreOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [allSkusPagination, setAllSkusPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });

  // Fetch substores
  const loadSubstores = useCallback(async () => {
    const data = await fetchSubstoresApi();
    setSubstores(data);
  }, []);

  // Fetch unique SKU count
  const loadUniqueSkus = useCallback(async () => {
    const result = await fetchUniqueSkusApi();
    if (result.success && result.total !== undefined) {
      setUniqueSkusCount(result.total);
    }
  }, []);

  // Get selected substore values
  const getSelectedSubstoreValues = useCallback((): string[] => 
    selectedSubstores.map(s => s.value), [selectedSubstores]
  );

  // Fetch top SKUs for display with pagination and filters
  const loadTopSkus = useCallback(async (page = 1, substoreFilter: string[] = [], search = '') => {
    setLoadingAllSkus(true);
    try {
      // Use provided substores or selected substores
      const substores = substoreFilter.length > 0 
        ? substoreFilter 
        : selectedSubstores.map(s => s.value);
      
      const result = await fetchTopSkusApi({
        substores: substores.length > 0 ? substores : undefined,
        page,
        pageSize: 10,
      });
      
      // Apply client-side search filter if search term is provided
      if (result.success && result.data) {
        let filteredData = result.data;
        
        if (search && search.trim() !== '') {
          const searchLower = search.toLowerCase().trim();
          filteredData = result.data.filter(sku => 
            sku.sku.toLowerCase().includes(searchLower) ||
            (sku.name && sku.name.toLowerCase().includes(searchLower))
          );
        }
        
        setTopSkus(filteredData);
        
        // Update pagination - if searching, use filtered count, otherwise use API total
        if (result.total !== undefined && result.totalPages !== undefined) {
          const total = search ? filteredData.length : result.total;
          setAllSkusPagination({
            page: result.page || page,
            pageSize: result.pageSize || 10,
            total,
            totalPages: search ? Math.ceil(filteredData.length / 10) : result.totalPages,
          });
        }
      }
    } catch (error) {
      console.error('Error loading top SKUs:', error);
    } finally {
      setLoadingAllSkus(false);
    }
  }, [selectedSubstores]);

  // Auth check and initial data fetch
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    loadSubstores();
    loadUniqueSkus();
    loadTopSkus(1, [], ''); // Load first page
    setLoading(false);
  }, [user, authLoading, router, loadSubstores, loadUniqueSkus, loadTopSkus]);

  // Handlers
  const handleSearch = useCallback(() => {
    setActiveSearch(searchTerm);
    loadTopSkus(1, getSelectedSubstoreValues(), searchTerm);
  }, [searchTerm, getSelectedSubstoreValues, loadTopSkus]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setActiveSearch('');
    loadTopSkus(1, getSelectedSubstoreValues(), '');
  }, [getSelectedSubstoreValues, loadTopSkus]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleSubstoreChange = useCallback((selected: MultiValue<SubstoreOption>) => {
    const newSelected = selected as SubstoreOption[];
    setSelectedSubstores(newSelected);
    // Use all selected substores for filtering
    const substores = newSelected.map(s => s.value);
    loadTopSkus(1, substores, activeSearch);
  }, [activeSearch, loadTopSkus]);

  const handleRefresh = useCallback(() => {
    loadTopSkus(1, getSelectedSubstoreValues(), activeSearch);
    loadUniqueSkus();
  }, [activeSearch, getSelectedSubstoreValues, loadTopSkus, loadUniqueSkus]);

  const handleClearAllFilters = useCallback(() => {
    setSelectedSubstores([]);
    setActiveSearch('');
    setSearchTerm('');
    loadTopSkus(1, [], '');
  }, [loadTopSkus]);

  const handleExport = useCallback(async () => {
    try {
      const result = await fetchAllSkusForExport({
        substores: getSelectedSubstoreValues(),
        search: activeSearch || undefined,
      });

      if (!result.success || !result.data) {
        alert('Failed to fetch data for export');
        return;
      }

      exportAllSkusToExcel(result.data);
    } catch {
      alert('Failed to export data');
    }
  }, [activeSearch, getSelectedSubstoreValues]);

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= allSkusPagination.totalPages && !loadingAllSkus) {
      const substores = getSelectedSubstoreValues();
      loadTopSkus(newPage, substores, activeSearch);
    }
  }, [allSkusPagination.totalPages, loadingAllSkus, getSelectedSubstoreValues, activeSearch, loadTopSkus]);

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
        onBack={() => router.push('/dashboard')} 
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Row */}
        <StatsRow 
          uniqueSkusCount={uniqueSkusCount}
          loading={loading || uniqueSkusCount === 0}
        />

        {/* Filters & Actions */}
        <FiltersBar
          substores={substores}
          selectedSubstores={selectedSubstores}
          searchTerm={searchTerm}
          activeSearch={activeSearch}
          loading={loading}
          loadingAnalysis={loadingAllSkus}
          analysisDataLength={topSkus.length}
          onSubstoreChange={handleSubstoreChange}
          onSearchTermChange={setSearchTerm}
          onSearch={handleSearch}
          onKeyPress={handleKeyPress}
          onClearSearch={handleClearSearch}
          onRefresh={handleRefresh}
          onExport={handleExport}
          onClearAllFilters={handleClearAllFilters}
          showSkeleton={loading || (substores.length === 0)}
        />

        {/* All SKUs View */}
        <AllSkusView 
          uniqueSkus={topSkus} 
          loading={loading || loadingAllSkus}
          loadingAnalysis={false}
          pagination={allSkusPagination.total > 0 ? allSkusPagination : undefined}
          onPageChange={handlePageChange}
        />
      </main>
    </div>
  );
}

