'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { ListingSection } from '@/models/listingProduct';
import { HUB_MAPPINGS } from '@/shared/constants/hubs';

type MissingParentSku = {
  canonicalParentSku: string;
  expectedSku: string;
};

type BlockedHub = {
  hub: string;
  missingParentSkus: MissingParentSku[];
};

type ProductPreflight = {
  productId: string;
  productName: string;
  currentSku: string;
  sourceHub: string;
  replicableHubs: string[];
  blockedHubs: BlockedHub[];
};

type PreflightResponse = {
  summary: {
    selectedProducts: number;
    targetHubs: number;
    replicablePairs: number;
    blockedPairs: number;
    replicableProducts: number;
    blockedProducts: number;
  };
  products: ProductPreflight[];
};

type ExecuteResponse = {
  preflight: PreflightResponse;
  execution: {
    createdCount: number;
    skipped: Array<{ productId: string; hub: string; reason: string }>;
  };
};

export interface ReplicateToHubsModalProps {
  section: ListingSection;
  selectedProductIds: string[];
  onClose: () => void;
  onReplicated: () => void;
}

export function ReplicateToHubsModal({
  section,
  selectedProductIds,
  onClose,
  onReplicated,
}: ReplicateToHubsModalProps) {
  const [selectedHubs, setSelectedHubs] = useState<string[]>([]);
  const [loadingReplicate, setLoadingReplicate] = useState(false);
  const [loadingRetry, setLoadingRetry] = useState(false);
  const [preflight, setPreflight] = useState<PreflightResponse | null>(null);
  const [execution, setExecution] = useState<ExecuteResponse['execution'] | null>(null);

  const sortedHubs = useMemo(() => HUB_MAPPINGS.map((h) => h.hub), []);
  const canReplicate = selectedHubs.length > 0;
  const blockedRows = useMemo(() => {
    if (!preflight) return [];
    return preflight.products.flatMap((product) =>
      product.blockedHubs.map((blockedHub) => ({
        productName: product.productName,
        currentSku: product.currentSku,
        sourceHub: product.sourceHub,
        targetHub: blockedHub.hub,
        missingParentSkus: blockedHub.missingParentSkus,
      }))
    );
  }, [preflight]);

  /** Pairs blocked due to missing parent listing (excludes same-hub-only blocks with empty missing list). */
  const retryPairsFromPreflight = useMemo(() => {
    if (!preflight) return [];
    const pairs: { productId: string; hub: string }[] = [];
    for (const product of preflight.products) {
      for (const blocked of product.blockedHubs) {
        if (blocked.missingParentSkus.length > 0) {
          pairs.push({ productId: product.productId, hub: blocked.hub });
        }
      }
    }
    return pairs;
  }, [preflight]);

  const canRetryBlocked = retryPairsFromPreflight.length > 0;

  const toggleHub = (hub: string) => {
    setSelectedHubs((prev) => (prev.includes(hub) ? prev.filter((h) => h !== hub) : [...prev, hub]));
    setExecution(null);
  };

  const runReplication = async () => {
    if (selectedHubs.length === 0) {
      toast.error('Select at least one hub');
      return;
    }
    setLoadingReplicate(true);
    try {
      const response = await fetch('/api/listing-product/replicate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          productIds: selectedProductIds,
          targetHubs: selectedHubs,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        toast.error(result.message || 'Replication failed');
        return;
      }
      const payload = result.data as ExecuteResponse;
      setPreflight(payload.preflight);
      setExecution(payload.execution);
      toast.success(`Replicated ${payload.execution.createdCount} product-hub combinations`);
      onReplicated();
    } catch (error) {
      console.error('Replication error:', error);
      toast.error('Unable to replicate');
    } finally {
      setLoadingReplicate(false);
    }
  };

  const runRetryBlocked = async () => {
    if (!canRetryBlocked) return;
    setLoadingRetry(true);
    try {
      const response = await fetch('/api/listing-product/replicate/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          retryPairs: retryPairsFromPreflight,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        toast.error(result.message || 'Retry replication failed');
        return;
      }
      const payload = result.data as ExecuteResponse;
      setPreflight(payload.preflight);
      setExecution(payload.execution);
      toast.success(
        `Retry: created ${payload.execution.createdCount} records, skipped ${payload.execution.skipped.length}`
      );
      onReplicated();
    } catch (error) {
      console.error('Retry replication error:', error);
      toast.error('Unable to retry blocked replications');
    } finally {
      setLoadingRetry(false);
    }
  };

  const downloadBlockedCsv = () => {
    if (blockedRows.length === 0) return;
    const lines = [
      'Product Name,Current SKU,Source Hub,Target Hub,Missing Expected Parent SKU,Canonical Base Parent SKU',
      ...blockedRows.flatMap((row) =>
        (row.missingParentSkus.length > 0 ? row.missingParentSkus : [{ expectedSku: '', canonicalParentSku: '' }]).map(
          (missing) =>
            `"${row.productName.replace(/"/g, '""')}","${row.currentSku}","${row.sourceHub}","${row.targetHub}","${missing.expectedSku}","${missing.canonicalParentSku}"`
        )
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blocked-hub-replication-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyBlockedRows = async () => {
    if (blockedRows.length === 0) return;
    const text = blockedRows
      .flatMap((row) =>
        (row.missingParentSkus.length > 0 ? row.missingParentSkus : [{ expectedSku: '', canonicalParentSku: '' }]).map(
          (missing) =>
            `${row.productName} | ${row.currentSku} | source:${row.sourceHub} | target:${row.targetHub} | missing:${missing.expectedSku} | base:${missing.canonicalParentSku}`
        )
      )
      .join('\n');
    await navigator.clipboard.writeText(text);
    toast.success('Blocked SKU details copied');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] px-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl border border-slate-200 max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-pink-50 to-white">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Replicate to hubs</h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {selectedProductIds.length} selected products • parent validation runs on replicate
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[calc(85vh-66px)] space-y-5">
          <div className="space-y-2 rounded-xl border border-pink-100 bg-pink-50/40 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-700">Target hubs</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs text-slate-600 hover:text-slate-900"
                  onClick={() => setSelectedHubs(sortedHubs)}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="text-xs text-slate-600 hover:text-slate-900"
                  onClick={() => setSelectedHubs([])}
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {sortedHubs.map((hub) => (
                <label
                  key={hub}
                  className={`flex items-center gap-2 px-2.5 py-2 border rounded-lg transition-colors ${
                    selectedHubs.includes(hub)
                      ? 'border-pink-300 bg-pink-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedHubs.includes(hub)}
                    onChange={() => toggleHub(hub)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#E6007A] focus:ring-[#E6007A]"
                  />
                  <span className="text-xs text-slate-700">{hub}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={runReplication}
                disabled={loadingReplicate || loadingRetry || !canReplicate}
                className="px-3 py-1.5 text-xs rounded-lg text-white disabled:opacity-50"
                style={{ backgroundColor: '#E6007A' }}
              >
                {loadingReplicate ? 'Validating and replicating...' : 'Replicate to these hubs'}
              </button>
            </div>
            <p className="text-[11px] text-slate-600">
              Replication automatically runs parent-SKU validation first, then creates only valid replications. Blocked SKUs are shown below.
            </p>
          </div>

          {preflight && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-2.5">
                  <p className="text-[11px] text-emerald-700">Replicable</p>
                  <p className="text-sm font-semibold text-emerald-900">{preflight.summary.replicablePairs}</p>
                </div>
                <div className="border border-rose-200 bg-rose-50 rounded-lg p-2.5">
                  <p className="text-[11px] text-rose-700">Blocked</p>
                  <p className="text-sm font-semibold text-rose-900">{preflight.summary.blockedPairs}</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-2.5">
                  <p className="text-[11px] text-slate-500">Products with success</p>
                  <p className="text-sm font-semibold text-slate-900">{preflight.summary.replicableProducts}</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-2.5">
                  <p className="text-[11px] text-slate-500">Products with blockers</p>
                  <p className="text-sm font-semibold text-slate-900">{preflight.summary.blockedProducts}</p>
                </div>
              </div>

              {execution && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  Created {execution.createdCount} records. Skipped {execution.skipped.length} records.
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-semibold text-slate-700">Blocked SKUs (need parent listing first)</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={runRetryBlocked}
                    disabled={loadingRetry || loadingReplicate || !canRetryBlocked}
                    className="px-2.5 py-1 text-xs rounded-lg text-white disabled:opacity-50"
                    style={{ backgroundColor: '#E6007A' }}
                    title="Re-run replication only for product×hub pairs that were blocked for missing parents"
                  >
                    {loadingRetry ? 'Retrying…' : `Retry blocked (${retryPairsFromPreflight.length})`}
                  </button>
                  <button
                    onClick={copyBlockedRows}
                    className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg hover:bg-slate-50"
                    disabled={blockedRows.length === 0}
                  >
                    Copy blocked list
                  </button>
                  <button
                    onClick={downloadBlockedCsv}
                    className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg hover:bg-slate-50"
                    disabled={blockedRows.length === 0}
                  >
                    Download CSV
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                After you list the missing parent SKUs in the target hubs, use <strong>Retry blocked</strong> to replicate
                only those product×hub pairs (no need to change your table selection).
              </p>

              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Product</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Current SKU</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Target hub</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Missing expected parent SKU</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Base parent SKU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockedRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-3 text-slate-500">
                          No blocked products for selected hubs.
                        </td>
                      </tr>
                    ) : (
                      blockedRows.flatMap((row, idx) =>
                        (row.missingParentSkus.length > 0 ? row.missingParentSkus : [{ expectedSku: '', canonicalParentSku: '' }]).map(
                          (missing, missingIdx) => (
                            <tr key={`${idx}-${missingIdx}`} className="border-t border-slate-100">
                              <td className="px-3 py-2 text-slate-700">{row.productName}</td>
                              <td className="px-3 py-2 text-slate-700">{row.currentSku || '—'}</td>
                              <td className="px-3 py-2 text-slate-700">{row.targetHub}</td>
                              <td className="px-3 py-2 text-slate-700">{missing.expectedSku || 'Same as source hub'}</td>
                              <td className="px-3 py-2 text-slate-700">{missing.canonicalParentSku || '—'}</td>
                            </tr>
                          )
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
