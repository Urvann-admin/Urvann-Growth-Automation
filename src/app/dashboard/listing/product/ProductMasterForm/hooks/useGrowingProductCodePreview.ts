'use client';

import { useState, useEffect } from 'react';

export interface GrowingProductCodePreviewState {
  preview: string;
  prefix: string;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches a non-consuming preview of the next growing-product code when all inputs are set.
 */
export function useGrowingProductCodePreview(
  enabled: boolean,
  plant: string,
  vendorMasterId: string,
  parentSku: string
): GrowingProductCodePreviewState {
  const [preview, setPreview] = useState('');
  const [prefix, setPrefix] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !plant.trim() || !vendorMasterId.trim() || !parentSku.trim()) {
      setPreview('');
      setPrefix('');
      setError(null);
      setLoading(false);
      return;
    }

    const handle = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const q = new URLSearchParams({
          plant: plant.trim(),
          vendorMasterId: vendorMasterId.trim(),
          parentSku: parentSku.trim(),
        });
        const res = await fetch(`/api/parent-master/growing-product-code?${q}`);
        const json = (await res.json()) as {
          success?: boolean;
          message?: string;
          productCodePreview?: string;
          prefix?: string;
        };
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Could not load code preview');
        }
        setPreview(String(json.productCodePreview ?? ''));
        setPrefix(String(json.prefix ?? ''));
      } catch (e) {
        setPreview('');
        setPrefix('');
        setError(e instanceof Error ? e.message : 'Could not load code preview');
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => window.clearTimeout(handle);
  }, [enabled, plant, vendorMasterId, parentSku]);

  return { preview, prefix, loading, error };
}
