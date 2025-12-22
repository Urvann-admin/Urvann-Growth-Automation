// API utilities for Frequently Bought Together feature

import {
  AnalysisApiResponse,
  SkusApiResponse,
  SubstoresApiResponse,
  SubstoreOption,
} from '@/types/frequentlyBought';

const API_BASE = '/api/frequently-bought';

/**
 * Fetch substores list
 */
export async function fetchSubstores(): Promise<SubstoreOption[]> {
  try {
    const response = await fetch(`${API_BASE}/substores`);
    const result: SubstoresApiResponse = await response.json();

    if (result.success && result.data) {
      return result.data.map((s: string) => ({
        value: s,
        label: s.charAt(0).toUpperCase() + s.slice(1),
      }));
    }
    return [];
  } catch (err) {
    console.error('Error fetching substores:', err);
    return [];
  }
}

/**
 * Fetch all unique SKUs from mapping collection
 */
export async function fetchUniqueSkus(): Promise<SkusApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/skus`);
    return await response.json();
  } catch (err) {
    console.error('Error fetching SKUs:', err);
    return { success: false, message: 'Failed to fetch SKUs' };
  }
}

/**
 * Fetch top SKUs by transaction count with substore filter and pagination
 */
export async function fetchTopSkus(options?: {
  substore?: string;
  substores?: string[];
  page?: number;
  pageSize?: number;
}): Promise<SkusApiResponse & { page?: number; pageSize?: number; totalPages?: number }> {
  try {
    const params = new URLSearchParams();
    if (options?.substores && options.substores.length > 0) {
      params.append('substores', options.substores.join(','));
    } else if (options?.substore) {
      params.append('substore', options.substore);
    }
    if (options?.page) {
      params.append('page', options.page.toString());
    }
    if (options?.pageSize) {
      params.append('pageSize', options.pageSize.toString());
    }
    
    const url = `${API_BASE}/top-skus${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url);
    return await response.json();
  } catch (err) {
    console.error('Error fetching top SKUs:', err);
    return { success: false, message: 'Failed to fetch top SKUs' };
  }
}

/**
 * Fetch analysis data with pagination and filters
 */
export async function fetchAnalysis(options: {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  substores?: string[];
  signal?: AbortSignal;
}): Promise<AnalysisApiResponse> {
  try {
    const { page = 1, pageSize = 1, limit = 10, search = '', substores = [], signal } = options;

    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      limit: limit.toString(),
    });

    if (search) {
      params.append('search', search);
    }

    if (substores.length > 0) {
      params.append('substores', substores.join(','));
    }

    const response = await fetch(`${API_BASE}/analysis?${params.toString()}`, { signal });
    const data = await response.json();
    
    // Handle error responses (like unpublished SKU)
    if (!response.ok || !data.success) {
      return data; // Return the error response as-is
    }
    
    return data;
  } catch (err) {
    // Re-throw abort errors so they can be handled by caller
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    console.error('Error fetching analysis:', err);
    return { success: false, message: 'Failed to fetch analysis data' };
  }
}

/**
 * Export data to prepare for Excel
 */
export async function fetchAllForExport(options: {
  search?: string;
  substores?: string[];
}): Promise<AnalysisApiResponse> {
  return fetchAnalysis({
    page: 1,
    pageSize: 10000,
    limit: 10,
    ...options,
  });
}

/**
 * Fetch all SKUs for export with filters
 */
export async function fetchAllSkusForExport(options?: {
  substores?: string[];
  search?: string;
}): Promise<SkusApiResponse & { page?: number; pageSize?: number; totalPages?: number }> {
  try {
    const params = new URLSearchParams();
    if (options?.substores && options.substores.length > 0) {
      params.append('substores', options.substores.join(','));
    }
    if (options?.search) {
      params.append('search', options.search);
    }
    // Fetch all records (large page size for export)
    params.append('page', '1');
    params.append('pageSize', '10000');
    
    const url = `${API_BASE}/top-skus${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    
    // Return all data (not paginated) for export
    if (data.success && data.data) {
      return {
        ...data,
        data: data.data, // All records
      };
    }
    
    return data;
  } catch (err) {
    console.error('Error fetching all SKUs for export:', err);
    return { success: false, message: 'Failed to fetch SKUs for export' };
  }
}

/**
 * Check publish status for a list of SKUs
 */
export async function checkPublishStatus(skus: string[]): Promise<{
  success: boolean;
  data?: { sku: string; isPublished: boolean }[];
  message?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/check-publish-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skus }),
    });
    return await response.json();
  } catch (err) {
    console.error('Error checking publish status:', err);
    return { success: false, message: 'Failed to check publish status' };
  }
}

