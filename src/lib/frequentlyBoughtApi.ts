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
 * Fetch unique SKUs
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
    return await response.json();
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

