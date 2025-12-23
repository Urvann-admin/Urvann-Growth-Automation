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
import { HUB_MAPPINGS, getSubstoresByHub } from '@/shared/constants/hubs';

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

  // Initialize hubs list (no need to fetch from API)
  const loadSubstores = useCallback(async () => {
    // Convert hubs to options format
    const hubOptions: SubstoreOption[] = HUB_MAPPINGS.map(mapping => ({
      value: mapping.hub,
      label: mapping.hub,
    }));
    setSubstores(hubOptions);
  }, []);

  // Fetch unique SKU count
  const loadUniqueSkus = useCallback(async () => {
    const result = await fetchUniqueSkusApi();
    if (result.success && result.total !== undefined) {
      setUniqueSkusCount(result.total);
    }
  }, []);

  // Convert selected hubs to substores for API calls
  const getSelectedSubstoreValues = useCallback((): string[] => {
    const selectedHubs = selectedSubstores.map(s => s.value);
    // Map each selected hub to its substores
    const substoreValues: string[] = [];
    selectedHubs.forEach(hub => {
      const hubSubstores = getSubstoresByHub(hub);
      substoreValues.push(...hubSubstores);
    });
    return substoreValues;
  }, [selectedSubstores]);

  // Fetch top SKUs for display with pagination and filters
  const loadTopSkus = useCallback(async (page = 1, substoreFilter: string[] = [], search = '') => {
    setLoadingAllSkus(true);
    try {
      // Use provided substores (already converted from hubs) or convert selected hubs to substores
      const substores = substoreFilter.length > 0 
        ? substoreFilter 
        : (() => {
            const selectedHubs = selectedSubstores.map(s => s.value);
            const substoreValues: string[] = [];
            selectedHubs.forEach(hub => {
              const hubSubstores = getSubstoresByHub(hub);
              substoreValues.push(...hubSubstores);
            });
            return substoreValues;
          })();
      
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
    // Only admins can access frequently bought products
    if (user.role !== 'admin') {
      router.push('/dashboard');
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

    // IMPORTANT: derive substores from the freshly selected hubs (not stale state)
    const substoresFromSelection: string[] = [];
    newSelected.forEach(hubOption => {
      const hubSubstores = getSubstoresByHub(hubOption.value);
      substoresFromSelection.push(...hubSubstores);
    });

    // Immediately reload with the new substore filter (no search click required)
    loadTopSkus(1, substoresFromSelection, activeSearch);
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
          onSkuClick={(sku) => {
            // Navigate to analysis page with this SKU
            router.push(`/dashboard/frequently-bought/analysis?sku=${encodeURIComponent(sku)}`);
          }}
        />
      </main>
    </div>
  );
}



