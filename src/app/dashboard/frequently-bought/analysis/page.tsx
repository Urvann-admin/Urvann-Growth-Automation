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
  Clock,
  Play,
  Pause,
  AlertCircle,
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
  fetchTopSkus as fetchTopSkusApi,
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

// Components
import LoadingScreen from '../components/LoadingScreen';
import Header from '../components/Header';
import StatsRow from '../components/StatsRow';
import FiltersBar from '../components/FiltersBar';
import ErrorMessage from '../components/ErrorMessage';
import AnalysisView from '../components/AnalysisView';
import PushUpdatesBar from '../components/PushUpdatesBar';
import PairedProductsModal from '../components/PairedProductsModal';
import PushProgressModal from '../components/PushProgressModal';
import SyncProgressModal from '../components/SyncProgressModal';
import ConfirmationModal from '../components/ConfirmationModal';
import ManualSkuDialog from '../components/ManualSkuDialog';
import { HUB_MAPPINGS, getSubstoresByHub } from '@/shared/constants/hubs';

// Column helper
const columnHelper = createColumnHelper<FrequentlyBoughtItem>();

// Expected total for sync mapping progress (1.5 lakh = 150,000 items)
const SYNC_EXPECTED_TOTAL = 150000;

// --- Main Component ---
export default function FrequentlyBoughtPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisData, setAnalysisData] = useState<FrequentlyBoughtItem[]>([]);
  const [uniqueSkusCount, setUniqueSkusCount] = useState(0);
  const [topSkus, setTopSkus] = useState<UniqueSku[]>([]);
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
  const [errorType, setErrorType] = useState<'SKU_UNPUBLISHED' | 'SKU_NOT_FOUND' | 'default'>('default');
  
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
  const [pushProgress, setPushProgress] = useState<{
    show: boolean;
    processed: number;
    total: number;
    percentage: number;
    currentSku: string | null;
    currentName: string | null;
    logs: string[];
    successes: string[];
    failures: Array<{ sku: string; productId: string; error: string }>;
    elapsedTime: number;
    cancelled: boolean;
  } | null>(null);
  
  // Sync mapping progress state
  const [syncProgress, setSyncProgress] = useState<{
    show: boolean;
    processed: number;
    total: number;
    percentage: number;
    currentBatch: number | null;
    logs: string[];
    successes: number;
    failures: number;
    elapsedTime: number;
    cancelled: boolean;
    completed?: boolean;
  } | null>(null);

  // Confirmation modals state
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
  const [pushAllConfirmOpen, setPushAllConfirmOpen] = useState(false);
  const [pushSingleConfirmOpen, setPushSingleConfirmOpen] = useState(false);
  const [pushSingleSku, setPushSingleSku] = useState<string | null>(null);
  
  // Manual SKU dialog state (hub -> SKUs)
  const [manualSkuDialogOpen, setManualSkuDialogOpen] = useState(false);
  const [manualSkusByHub, setManualSkusByHub] = useState<Record<string, string[]>>({});

  // Abort controller for cancelling previous requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const pushAbortControllerRef = useRef<AbortController | null>(null);
  const syncAbortControllerRef = useRef<AbortController | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const searchCancelledRef = useRef<boolean>(false); // Track if search was cancelled

  // Convert selected hubs to substores for API calls
  const getSelectedSubstoreValues = useCallback(() => {
    const selectedHubs = selectedSubstores.map(s => s.value);
    // Map each selected hub to its substores
    const substoreValues: string[] = [];
    selectedHubs.forEach(hub => {
      const hubSubstores = getSubstoresByHub(hub);
      substoreValues.push(...hubSubstores);
    });
    return substoreValues;
  }, [selectedSubstores]);

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

  // Fetch top SKUs for display (not needed for analysis page, but kept for ManualSkuDialog)
  const loadTopSkus = useCallback(async () => {
    const result = await fetchTopSkusApi({ page: 1, pageSize: 100 });
    if (result.success && result.data) {
      setTopSkus(result.data);
    }
  }, []);

  // Fetch analysis data with abort support
  const loadAnalysisData = useCallback(async (page = 1, search = '', substoreValues: string[] = []) => {
    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      // Mark as cancelled
      searchCancelledRef.current = true;
      // Clear the reference immediately
      abortControllerRef.current = null;
    }
    
    // Reset cancellation flag for new request
    searchCancelledRef.current = false;
    
    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setLoadingAnalysis(true);
      setError(null);
      setErrorType('default');

      const result = await fetchAnalysis({
        page,
        search,
        substores: substoreValues,
        signal: abortController.signal,
      });

      // Check if request was aborted
      if (abortController.signal.aborted) {
        // Mark as cancelled if aborted
        searchCancelledRef.current = true;
        // Clear the abort controller reference
        abortControllerRef.current = null;
        return;
      }

      if (result.success && result.data && result.pagination) {
        setAnalysisData(result.data);
        setPagination(result.pagination);
        setError(null);
        setErrorType('default');
      } else {
        // Handle specific error cases
        if (result.message === 'SKU_UNPUBLISHED' || result.message === 'SKU_NOT_FOUND') {
          setAnalysisData([]); // Clear analysis data
          setPagination({
            page: 1,
            pageSize: 1,
            totalSkus: 0,
            totalPages: 0,
            hasMore: false,
          });
          setError(result.message || `SKU "${search}" is unpublished or not found.`);
          setErrorType('SKU_UNPUBLISHED');
        } else {
          setError(result.message || 'Failed to fetch analysis data');
          setErrorType('default');
        }
      }
    } catch (err) {
      // Don't show error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        // Mark as cancelled
        searchCancelledRef.current = true;
        // Clear the abort controller reference
        abortControllerRef.current = null;
        return;
      }
      setError('Failed to fetch frequently bought together data');
      setErrorType('default');
    } finally {
      // Only set loading to false if this is the current request and not cancelled
      if (!abortController.signal.aborted && !searchCancelledRef.current) {
        setLoadingAnalysis(false);
        setLoading(false);
      } else if (abortController.signal.aborted) {
        // If aborted, still set loading to false but don't trigger any reloads
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
    // Only admins can access frequently bought products
    if (user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    loadSubstores();
    loadUniqueSkus();
    loadTopSkus();
    // Don't load analysis data on first load - user must search
    setLoading(false);
  }, [user, authLoading, router, loadSubstores, loadUniqueSkus, loadTopSkus]);

  // Handlers
  const handleSearch = useCallback(() => {
    setActiveSearch(searchTerm);
    loadAnalysisData(1, searchTerm, getSelectedSubstoreValues());
  }, [searchTerm, getSelectedSubstoreValues, loadAnalysisData]);

  const handleSkuClick = useCallback((sku: string) => {
    setSearchTerm(sku);
    setActiveSearch(sku);
    loadAnalysisData(1, sku, getSelectedSubstoreValues());
  }, [getSelectedSubstoreValues, loadAnalysisData]);

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
      // Show loading message
      const loadingMsg = 'Preparing export for all SKUs... This may take a few minutes.';
      if (!window.confirm(loadingMsg + '\n\nClick OK to continue.')) {
        return; // User cancelled
      }

      console.log('[Export] Starting export...');
      const response = await fetch('/api/frequently-bought/export-all');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('[Export] Response received:', { success: result.success, dataLength: result.data?.length });

      if (!result.success || !result.data) {
        const errorMsg = result.error || result.message || 'Unknown error';
        alert(`Failed to fetch data for export: ${errorMsg}`);
        return;
      }

      // Transform the data to match FrequentlyBoughtItem format
      const transformedData = result.data.map((item: any) => ({
        sku: item.sku,
        name: item.name,
        totalPairings: item.topPaired?.length || 0,
        topPaired: (item.topPaired || []).map((p: any) => ({
          sku: p.sku,
          name: p.name || '',
          count: p.count || 0,
        })),
      }));

      console.log('[Export] Exporting to Excel...', transformedData.length, 'items');
      exportFrequentlyBoughtToExcel(transformedData);
      console.log('[Export] Export completed successfully');
    } catch (error) {
      console.error('[Export] Error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to export data: ${errorMsg}\n\nPlease check the console for details.`);
    }
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setSelectedSubstores([]);
    setActiveSearch('');
    setSearchTerm('');
    loadAnalysisData(1, '', []);
  }, [loadAnalysisData]);

  // Handle sync mapping with batch processing and progress
  const handleSyncMapping = useCallback(() => {
    setSyncConfirmOpen(true);
  }, []);

  const handleSyncMappingConfirm = useCallback(async () => {
    try {
      // Initialize progress - proportional to 1.5 lakh (150,000) items
      setSyncProgress({
        show: true,
        processed: 0,
        total: SYNC_EXPECTED_TOTAL,
        percentage: 0,
        currentBatch: null,
        logs: ['Starting sync mapping...'],
        successes: 0,
        failures: 0,
        elapsedTime: 0,
        cancelled: false,
      });

      // Start timer
      const startTime = Date.now();
      syncTimerIntervalRef.current = setInterval(() => {
        setSyncProgress(prev => prev ? { ...prev, elapsedTime: Math.floor((Date.now() - startTime) / 1000) } : null);
      }, 1000);

      // Create abort controller
      syncAbortControllerRef.current = new AbortController();

      // Process in batches using since_id pagination
      const batchSize = 500;
      let sinceId = '0';
      let totalSynced = 0;
      let hasMore = true;
      let isFirstBatch = true;
      let consecutiveEmpty = 0;
      let lastSinceId: string | null = null;
      const MAX_CONSECUTIVE_EMPTY = 5; // Increased to handle gaps in data
      const MAX_BATCHES = 500; // 500 batches * 500 products = 250k products max (enough for 145k)
      let batchCount = 0;

      while (hasMore && consecutiveEmpty < MAX_CONSECUTIVE_EMPTY && batchCount < MAX_BATCHES) {
        // Check if cancelled before each batch
        if (syncAbortControllerRef.current.signal.aborted) {
          setSyncProgress(prev => prev ? { ...prev, cancelled: true, logs: [...prev.logs, 'Sync cancelled by user'] } : null);
          break;
        }

        try {
          batchCount++;
          const response = await fetch('/api/frequently-bought/sync-mapping-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sinceId,
              batchSize,
              isFirstBatch,
            }),
            signal: syncAbortControllerRef.current.signal,
          });

          // Check if cancelled after fetch starts
          if (syncAbortControllerRef.current.signal.aborted) {
            setSyncProgress(prev => prev ? { ...prev, cancelled: true, logs: [...prev.logs, 'Sync cancelled by user'] } : null);
            break;
          }

          const result = await response.json();

          // Check if cancelled after getting result
          if (syncAbortControllerRef.current.signal.aborted) {
            setSyncProgress(prev => prev ? { ...prev, cancelled: true, logs: [...prev.logs, 'Sync cancelled by user'] } : null);
            break;
          }

          if (result.success) {
            totalSynced += result.progress.successes;
            
            // Update progress - proportional to 1.5 lakh (150,000) items
            setSyncProgress(prev => {
              if (!prev) return null;
              const newProcessed = prev.processed + result.progress.processed;
              
              // Calculate percentage based on fixed total of 150,000 items
              // Cap at 100% if we exceed the expected total
              const percentage = Math.min(Math.round((newProcessed / SYNC_EXPECTED_TOTAL) * 100), 100);
              
              return {
                ...prev,
                processed: newProcessed,
                total: SYNC_EXPECTED_TOTAL, // Always use fixed total of 150,000
                percentage,
                currentBatch: result.progress.currentBatch,
                logs: [...prev.logs, ...result.progress.logs].slice(-50), // Keep last 50 logs
                successes: prev.successes + result.progress.successes,
                failures: prev.failures + result.progress.failures,
              };
            });

            // Update since_id for next batch
            const newSinceId = result.nextSinceId || sinceId;
            
            // Check if we got products
            if (result.progress.processed === 0) {
              // Got 0 products - increment empty counter
              consecutiveEmpty++;
              if (consecutiveEmpty >= MAX_CONSECUTIVE_EMPTY) {
                // We're done - update progress to reflect completion
                setSyncProgress(prev => {
                  if (!prev) return null;
                  // Set to 100% when sync completes naturally (all available products synced)
                  return {
                    ...prev,
                    processed: totalSynced,
                    total: SYNC_EXPECTED_TOTAL, // Keep total as 150k for consistency
                    percentage: 100, // Set to 100% when completed
                    completed: true, // Mark as completed
                    logs: [...prev.logs, 'No more products found, sync complete'],
                  };
                });
                hasMore = false;
              } else {
                // Try next since_id even if empty (might be a gap in data)
                sinceId = newSinceId;
                hasMore = true; // Continue trying
              }
            } else {
              // Got products (any amount > 0) - reset empty counter and continue
              consecutiveEmpty = 0; // Reset on successful fetch
              
              // Log progress for partial batches
              if (result.progress.processed < batchSize) {
                setSyncProgress(prev => prev ? { 
                  ...prev, 
                  logs: [...prev.logs, `Got ${result.progress.processed} products (batch ${batchCount}), continuing to fetch more...`] 
                } : null);
              }
              
              // Check if since_id changed (if not, we might be stuck in a loop)
              if (lastSinceId === newSinceId && result.progress.processed > 0) {
                // Same since_id but got products - might be stuck, but continue anyway
                setSyncProgress(prev => prev ? { ...prev, logs: [...prev.logs, `⚠ Same since_id returned products, continuing...`] } : null);
              }
              
              lastSinceId = newSinceId;
              hasMore = true; // Always continue if we got products, regardless of count
              sinceId = newSinceId;
            }

            isFirstBatch = false; // Only first batch deletes data
          } else {
            // Handle 406 errors gracefully - might mean we've reached the end
            if (result.error?.includes('406')) {
              setSyncProgress(prev => prev ? { ...prev, logs: [...prev.logs, 'Reached API pagination limit (406), sync complete'] } : null);
              hasMore = false;
            } else {
              setSyncProgress(prev => prev ? { ...prev, logs: [...prev.logs, `Error: ${result.error || result.message}`] } : null);
              // Don't break on error, try to continue
              consecutiveEmpty++;
              if (consecutiveEmpty >= MAX_CONSECUTIVE_EMPTY) {
                hasMore = false;
              }
            }
          }
        } catch (fetchError) {
          // Handle abort error - this means user cancelled
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            setSyncProgress(prev => prev ? { ...prev, cancelled: true, logs: [...prev.logs, 'Sync cancelled by user'] } : null);
            console.log('Sync cancelled');
            break;
          } else {
            // Other errors
            console.error('Sync error:', fetchError);
            setSyncProgress(prev => prev ? { ...prev, logs: [...prev.logs, `Error: ${fetchError}`] } : null);
            consecutiveEmpty++;
            if (consecutiveEmpty >= MAX_CONSECUTIVE_EMPTY) {
              hasMore = false;
            }
          }
        }
      }

      if (batchCount >= MAX_BATCHES) {
        setSyncProgress(prev => prev ? { ...prev, logs: [...prev.logs, `⚠ Reached maximum batch limit (${MAX_BATCHES}), stopping sync`] } : null);
      }

      // Stop timer
      if (syncTimerIntervalRef.current) {
        clearInterval(syncTimerIntervalRef.current);
        syncTimerIntervalRef.current = null;
      }

      // Final update - smoothly transition to 100%
      setSyncProgress(prev => {
        if (!prev) return null;
        // Set to 100% when sync completes (all available products synced)
        return {
          ...prev,
          processed: totalSynced,
          total: SYNC_EXPECTED_TOTAL, // Keep total as 150k for consistency
          percentage: 100, // Set to 100% when completed
          completed: true, // Mark as completed
          logs: [...prev.logs, `✓ Sync completed! Total synced: ${totalSynced.toLocaleString()} products`],
        };
      });

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setSyncProgress(prev => prev ? { ...prev, cancelled: true, logs: [...prev.logs, 'Sync cancelled by user'] } : null);
        console.log('Sync cancelled');
      } else {
        console.error('Sync error:', error);
        setSyncProgress(prev => prev ? { ...prev, logs: [...prev.logs, `Fatal error: ${error}`] } : null);
      }
      
      // Stop timer on error
      if (syncTimerIntervalRef.current) {
        clearInterval(syncTimerIntervalRef.current);
        syncTimerIntervalRef.current = null;
      }
    }
  }, []);

  // Handle push all updates with batch processing
  const handlePushAllUpdates = useCallback(() => {
    // First show manual SKU dialog
    setManualSkuDialogOpen(true);
  }, []);

  const handleManualSkusConfirm = useCallback((hubSkus: Record<string, string[]>) => {
    // Store hub-wise manual SKUs
    setManualSkusByHub(hubSkus);
    // Close manual dialog
    setManualSkuDialogOpen(false);
    // Open confirmation dialog
    setPushAllConfirmOpen(true);
  }, []);

  const handlePushAllUpdatesConfirm = useCallback(async () => {
    try {
      // Show loading state immediately
      setPushProgress({
        show: true,
        processed: 0,
        total: 0,
        percentage: 0,
        currentSku: null,
        currentName: null,
        logs: ['Getting started...'],
        successes: [],
        failures: [],
        elapsedTime: 0,
        cancelled: false,
      });

      // Create abort controller early so we can cancel all API calls
      pushAbortControllerRef.current = new AbortController();

      // Fetch all unique SKUs first (with abort signal)
      const skusResponse = await fetch('/api/frequently-bought/all-unique-skus', {
        signal: pushAbortControllerRef.current.signal,
      });
      
      // Check if cancelled
      if (pushAbortControllerRef.current.signal.aborted) {
        setPushProgress(prev => prev ? { ...prev, cancelled: true, logs: [...prev.logs, 'Process cancelled by user'] } : null);
        return;
      }
      
      const skusData = await skusResponse.json();
      
      if (!skusData.success || !skusData.data) {
        setPushProgress(null);
        alert('Failed to fetch SKUs');
        return;
      }

      const allSkus = skusData.data;
      const totalSkus = allSkus.length;

      // Calculate total manual SKUs across all hubs
      const totalManualSkus = Object.values(manualSkusByHub).reduce((sum, skus) => sum + skus.length, 0);
      const hubSummary = Object.entries(manualSkusByHub)
        .filter(([_, skus]) => skus.length > 0)
        .map(([hub, skus]) => `${hub}: ${skus.join(', ')}`)
        .join(' | ');

      // Update progress
      const initialLogs = [
        `Starting push for ${totalSkus.toLocaleString()} SKUs...`,
        ...(totalManualSkus > 0 
          ? [`📝 Manual SKUs configured (hub-wise): ${totalManualSkus} SKU${totalManualSkus > 1 ? 's' : ''} (${hubSummary})`]
          : []
        ),
        'Fetching mappings cache...'
      ];
      
      setPushProgress({
        show: true,
        processed: 0,
        total: totalSkus,
        percentage: 0,
        currentSku: null,
        currentName: null,
        logs: initialLogs,
        successes: [],
        failures: [],
        elapsedTime: 0,
        cancelled: false,
      });

      // Check if cancelled before fetching mappings
      if (pushAbortControllerRef.current.signal.aborted) {
        setPushProgress(prev => prev ? { ...prev, cancelled: true, logs: [...prev.logs, 'Process cancelled by user'] } : null);
        return;
      }

      // OPTIMIZATION 4: Pre-fetch all mappings once and reuse (with abort signal)
      let allMappingsCache = null;
      try {
        const mappingsResponse = await fetch('/api/frequently-bought/all-mappings', {
          signal: pushAbortControllerRef.current.signal,
        });
        
        // Check if cancelled
        if (pushAbortControllerRef.current.signal.aborted) {
          setPushProgress(prev => prev ? { ...prev, cancelled: true, logs: [...prev.logs, 'Process cancelled by user'] } : null);
          return;
        }
        
        const mappingsData = await mappingsResponse.json();
        
        if (mappingsData.success && mappingsData.data) {
          allMappingsCache = mappingsData.data;
          setPushProgress(prev => prev ? { ...prev, logs: [...prev.logs, `✓ Loaded ${Object.keys(mappingsData.data).length.toLocaleString()} mappings cache`] } : null);
        } else {
          setPushProgress(prev => prev ? { ...prev, logs: [...prev.logs, '⚠ Failed to fetch mappings cache, will fetch per batch'] } : null);
        }
      } catch (error) {
        // Don't show error if request was aborted
        if (error instanceof Error && error.name === 'AbortError') {
          setPushProgress(prev => prev ? { ...prev, cancelled: true, logs: [...prev.logs, 'Process cancelled by user'] } : null);
          return;
        }
        console.error('Error fetching mappings cache:', error);
        setPushProgress(prev => prev ? { ...prev, logs: [...prev.logs, '⚠ Failed to fetch mappings cache, will fetch per batch'] } : null);
      }

      // Check if cancelled after fetching mappings
      if (pushAbortControllerRef.current.signal.aborted) {
        setPushProgress(prev => prev ? { ...prev, cancelled: true, logs: [...prev.logs, 'Process cancelled by user'] } : null);
        return;
      }

      // Update progress with actual data
      const batchLogMessage = totalManualSkus > 0
        ? `Starting batch processing with hub-wise manual SKUs (${totalManualSkus} total) - each SKU will use manual SKUs from its hub only`
        : 'Starting batch processing...';
      
      setPushProgress(prev => prev ? { 
        ...prev, 
        logs: [...prev.logs, batchLogMessage] 
      } : null);

      // Start timer
      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        setPushProgress(prev => prev ? { ...prev, elapsedTime: Math.floor((Date.now() - startTime) / 1000) } : null);
      }, 1000);

      // OPTIMIZATION 3: Process in larger batches
      const batchSize = 50; // Increased from 10 to 50
      let currentIndex = 0;

      while (currentIndex < totalSkus) {
        // Check if cancelled before each batch
        if (pushAbortControllerRef.current.signal.aborted) {
          setPushProgress(prev => prev ? { ...prev, cancelled: true, logs: [...prev.logs, 'Process cancelled by user'] } : null);
          break;
        }

        try {
          const response = await fetch('/api/frequently-bought/push-all-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              startIndex: currentIndex,
              batchSize,
              allSkus,
              limit: 6,
              manualSkusByHub, // Pass hub-wise manual SKUs
              allMappingsCache, // Pass mappings cache to avoid re-fetching
            }),
            signal: pushAbortControllerRef.current.signal,
          });

          // Check if cancelled after fetch starts
          if (pushAbortControllerRef.current.signal.aborted) {
            setPushProgress(prev => prev ? { ...prev, cancelled: true, logs: [...prev.logs, 'Process cancelled by user'] } : null);
            break;
          }

          const result = await response.json();

          // Check if cancelled after getting result
          if (pushAbortControllerRef.current.signal.aborted) {
            setPushProgress(prev => prev ? { ...prev, cancelled: true, logs: [...prev.logs, 'Process cancelled by user'] } : null);
            break;
          }

          if (result.success) {
            setPushProgress(prev => {
              if (!prev || pushAbortControllerRef.current?.signal.aborted) return null;
              const newProcessed = currentIndex + result.progress.processed;
              return {
                ...prev,
                processed: newProcessed,
                percentage: Math.round((newProcessed / totalSkus) * 100),
                currentSku: result.progress.current?.sku || null,
                currentName: result.progress.current?.name || null,
                logs: [...prev.logs, ...result.progress.logs].slice(-50), // Keep last 50 logs
                successes: [...prev.successes, ...result.progress.successes],
                failures: [...prev.failures, ...result.progress.failures],
              };
            });

            currentIndex = result.nextIndex;
          } else {
            break;
          }
        } catch (fetchError) {
          // Handle abort error - this means user cancelled
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            setPushProgress(prev => prev ? { ...prev, cancelled: true, logs: [...prev.logs, 'Process cancelled by user'] } : null);
            console.log('Push cancelled');
            break;
          } else {
            // Other errors
            console.error('Push error:', fetchError);
            setPushProgress(prev => prev ? { ...prev, logs: [...prev.logs, `Error: ${fetchError}`] } : null);
            break;
          }
        }
      }

      // Stop timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setPushProgress(prev => prev ? { ...prev, cancelled: true, logs: [...prev.logs, 'Process cancelled by user'] } : null);
        console.log('Push cancelled');
      } else {
        console.error('Push error:', error);
        setPushProgress(prev => prev ? { ...prev, logs: [...prev.logs, `Error: ${error}`] } : null);
      }
      
      // Stop timer on error
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  }, [manualSkusByHub]); // Include manualSkusByHub in dependency array

  // Handle cancel push
  const handleCancelPush = useCallback(() => {
    // Immediately update UI to show cancelled and clear loading state
    setPushProgress(prev => prev ? { 
      ...prev, 
      cancelled: true,
      currentSku: null, // Clear current SKU to stop loader
      currentName: null, // Clear current name
      logs: [...prev.logs, 'Cancelling...'] 
    } : null);
    
    // Abort the fetch request
    if (pushAbortControllerRef.current) {
      pushAbortControllerRef.current.abort();
    }
    
    // Stop timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Handle close progress modal
  const handleCloseProgressModal = useCallback(() => {
    setPushProgress(null);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Handle cancel sync
  const handleCancelSync = useCallback(() => {
    // Immediately update UI to show cancelled
    setSyncProgress(prev => prev ? { ...prev, cancelled: true, logs: [...prev.logs, 'Cancelling...'] } : null);
    
    // Abort the fetch request
    if (syncAbortControllerRef.current) {
      syncAbortControllerRef.current.abort();
    }
    
    // Stop timer
    if (syncTimerIntervalRef.current) {
      clearInterval(syncTimerIntervalRef.current);
      syncTimerIntervalRef.current = null;
    }
  }, []);

  // Handle close sync progress modal
  const handleCloseSyncProgressModal = useCallback(() => {
    setSyncProgress(null);
    if (syncTimerIntervalRef.current) {
      clearInterval(syncTimerIntervalRef.current);
      syncTimerIntervalRef.current = null;
    }
  }, []);

  // Handle push single SKU update
  const handlePushSingleUpdate = useCallback((sku: string) => {
    setPushSingleSku(sku);
    setPushSingleConfirmOpen(true);
  }, []);

  const handlePushSingleUpdateConfirm = useCallback(async () => {
    if (!pushSingleSku) return;
    
    try {
      setPushingUpdates(true);
      const response = await fetch('/api/frequently-bought/push-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: pushSingleSku, limit: 6, manualSkusByHub }),
      });
      const result = await response.json();
      
      if (result.success) {
        // Use the detailed message from API which includes skipped products info
        alert(`✓ ${result.message || `Successfully pushed ${result.pushedCount} products for SKU: ${pushSingleSku}`}`);
      } else {
        alert(`✗ Failed: ${result.message}`);
      }
    } catch (error) {
      alert(`✗ Failed to update SKU: ${pushSingleSku}`);
      console.error('Push single update error:', error);
    } finally {
      setPushingUpdates(false);
    }
  }, [pushSingleSku]);

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
        onBack={() => router.push('/dashboard')} 
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Row */}
        <StatsRow 
          uniqueSkusCount={uniqueSkusCount}
          loading={loading || (uniqueSkusCount === 0 && !activeSearch)}
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
          showSkeleton={loading || (substores.length === 0 && !activeSearch)}
        />

        {/* Info Banner */}
        {!activeSearch && analysisData.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Search className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-sm text-blue-700">
                <span className="font-medium">Search for a SKU</span> to find its frequently bought together products.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && <ErrorMessage message={error} errorType={errorType} />}

        {/* Content */}
        {activeSearch ? (
          <AnalysisView
            loading={loading}
            loadingAnalysis={loadingAnalysis}
            analysisData={analysisData}
            columns={columns}
            pagination={pagination}
            onPageChange={handlePageChange}
            getPageNumbers={getPageNumbers}
          />
        ) : null}
      </main>

      {/* Paired Products Modal */}
      {modalOpen && modalData && (
        <PairedProductsModal 
          data={modalData} 
          onClose={handleCloseModal} 
        />
      )}

      {/* Push Progress Modal */}
      {pushProgress?.show && (
        <PushProgressModal
          progress={pushProgress}
          onCancel={handleCancelPush}
          onClose={handleCloseProgressModal}
        />
      )}

      {/* Sync Progress Modal */}
      {syncProgress?.show && (
        <SyncProgressModal
          progress={syncProgress}
          onCancel={handleCancelSync}
          onClose={handleCloseSyncProgressModal}
        />
      )}

      {/* Manual SKU Dialog */}
      <ManualSkuDialog
        open={manualSkuDialogOpen}
        onOpenChange={setManualSkuDialogOpen}
        onConfirm={handleManualSkusConfirm}
        topSkus={topSkus}
      />

      {/* Confirmation Modals */}
      <ConfirmationModal
        open={syncConfirmOpen}
        onOpenChange={setSyncConfirmOpen}
        title="Sync Mappings"
        message="This will sync SKU to product_id mappings from Urvann API. This may take several minutes. Continue?"
        confirmText="OK"
        cancelText="Cancel"
        onConfirm={handleSyncMappingConfirm}
      />

      <ConfirmationModal
        open={pushAllConfirmOpen}
        onOpenChange={setPushAllConfirmOpen}
        title="Push All Updates"
        message={`This will push frequently bought together data for ALL SKUs to Urvann API${Object.keys(manualSkusByHub).length > 0 ? ` (with hub-wise manual SKUs)` : ''}. This may take several minutes. Continue?`}
        confirmText="OK"
        cancelText="Cancel"
        onConfirm={handlePushAllUpdatesConfirm}
      />

      <ConfirmationModal
        open={pushSingleConfirmOpen}
        onOpenChange={setPushSingleConfirmOpen}
        title="Push Single Update"
        message={pushSingleSku ? `Push frequently bought together data for SKU: ${pushSingleSku}${Object.keys(manualSkusByHub).length > 0 ? ` (with hub-wise manual SKUs)` : ''}?` : ''}
        confirmText="OK"
        cancelText="Cancel"
        onConfirm={handlePushSingleUpdateConfirm}
      />

    </div>
  );
}
