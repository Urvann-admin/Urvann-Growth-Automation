'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Leaf, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { ListingProduct } from '@/models/listingProduct';

export interface MoveToRevivalModalProps {
  open: boolean;
  selectedIds: string[];
  onClose: () => void;
  onMoved: () => void;
}

type RowModel = {
  id: string;
  name: string;
  sku: string;
  hub?: string;
  isParent: boolean;
  maxQty: number;
};

function productLabel(p: ListingProduct): string {
  return (p.finalName || p.plant || '—').trim();
}

export function MoveToRevivalModal({ open, selectedIds, onClose, onMoved }: MoveToRevivalModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<RowModel[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const loadRows = useCallback(async () => {
    if (selectedIds.length === 0) {
      setRows([]);
      setQuantities({});
      return;
    }
    setLoading(true);
    try {
      const merged: RowModel[] = await Promise.all(
        selectedIds.map(async (id) => {
          try {
            const res = await fetch(`/api/listing-product/${encodeURIComponent(id)}`);
            const json = await res.json();
            if (!json.success || !json.data) {
              return {
                id,
                name: json.message ? `Error: ${json.message}` : 'Could not load product',
                sku: '—',
                hub: undefined,
                isParent: false,
                maxQty: 0,
              };
            }
            const p = json.data as ListingProduct;
            const maxQty = Math.max(0, Math.floor(Number(p.inventory_quantity) || 0));
            return {
              id: String(p._id ?? id),
              name: productLabel(p),
              sku: (p.sku || p.parentItems?.[0]?.parentSku || '—').trim(),
              hub: p.hub?.trim(),
              isParent: p.listingType === 'parent',
              maxQty,
            };
          } catch {
            return {
              id,
              name: 'Could not load product',
              sku: '—',
              hub: undefined,
              isParent: false,
              maxQty: 0,
            };
          }
        })
      );

      setRows(merged);
      const q: Record<string, number> = {};
      for (const r of merged) {
        q[r.id] = r.maxQty > 0 ? r.maxQty : 0;
      }
      setQuantities(q);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load products');
      setRows([]);
      setQuantities({});
    } finally {
      setLoading(false);
    }
  }, [selectedIds]);

  useEffect(() => {
    if (!open) return;
    void loadRows();
  }, [open, loadRows]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  const canSubmit = useMemo(() => {
    if (rows.length === 0 || loading) return false;
    return rows.every((r) => {
      if (r.maxQty <= 0) return false;
      const q = quantities[r.id];
      if (!Number.isFinite(q) || q < 1) return false;
      if (q > r.maxQty) return false;
      if (r.isParent && q !== r.maxQty) return false;
      return true;
    });
  }, [rows, quantities, loading]);

  const setQty = (id: string, value: number, row: RowModel) => {
    if (row.isParent) return;
    const v = Math.floor(Number(value));
    if (!Number.isFinite(v)) return;
    const clamped = Math.min(Math.max(1, v), row.maxQty);
    setQuantities((prev) => ({ ...prev, [id]: clamped }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error('Fix quantities: each line needs 1–max sets; parent listings must use the full quantity.');
      return;
    }
    setSubmitting(true);
    try {
      const moves = rows
        .filter((r) => r.maxQty > 0)
        .map((r) => ({
          id: r.id,
          quantity: r.isParent ? r.maxQty : Math.min(Math.max(1, quantities[r.id] ?? r.maxQty), r.maxQty),
        }));
      const response = await fetch('/api/listing-product/move-to-revival', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves }),
      });
      const result = await response.json();
      if (result.moved > 0) {
        toast.success(result.message || `Moved ${result.moved} product(s) to Revival`);
      }
      if (Array.isArray(result.failed) && result.failed.length > 0) {
        for (const f of result.failed as { id: string; message: string }[]) {
          toast.error(f.message || `Failed for ${f.id}`);
        }
      } else if (!result.success && result.message) {
        toast.error(result.message);
      }
      onMoved();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Failed to move to revival');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] px-4"
      onClick={() => !submitting && onClose()}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-revival-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-white shrink-0">
          <div>
            <h3 id="move-revival-title" className="text-sm font-semibold text-slate-900">
              Move to Revival
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Confirm and choose how many <span className="font-medium">sets</span> to move per product. Rows leave
              Listing and appear under Listing → Revival.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <p className="text-sm text-slate-600 text-center py-8">Loading selected products…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-8">No products selected.</p>
          ) : (
            <>
              <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-900 leading-relaxed">
                <span className="font-semibold">Parent listings</span> use one SKU in one section at a time — the full
                listed quantity moves together. <span className="font-semibold">Child listings</span> can move a
                smaller number of sets; a new Revival row gets a new listing SKU.
              </div>
              <ul className="space-y-3">
                {rows.map((row) => {
                  const q = quantities[row.id] ?? row.maxQty;
                  const bad = row.maxQty <= 0;
                  return (
                    <li
                      key={row.id}
                      className={`rounded-xl border px-3 py-3 ${bad ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-slate-50/40'}`}
                    >
                      <div className="flex gap-2 min-w-0">
                        <Leaf className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 truncate">{row.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {row.sku}
                            {row.hub ? ` · ${row.hub}` : ''}
                            {row.isParent ? (
                              <span className="ml-1 text-slate-600 font-sans">· Parent</span>
                            ) : (
                              <span className="ml-1 text-slate-600 font-sans">· Child</span>
                            )}
                          </p>
                          {bad ? (
                            <p className="flex items-center gap-1 text-[11px] text-rose-700 mt-2">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              No inventory to move for this row.
                            </p>
                          ) : (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <label className="text-[11px] font-medium text-slate-600 shrink-0" htmlFor={`qty-${row.id}`}>
                                Quantity (sets)
                              </label>
                              <input
                                id={`qty-${row.id}`}
                                type="number"
                                min={1}
                                max={row.maxQty}
                                disabled={row.isParent || submitting}
                                value={row.isParent ? row.maxQty : q}
                                onChange={(e) => setQty(row.id, Number(e.target.value), row)}
                                className="w-24 px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-700"
                              />
                              <span className="text-[11px] text-slate-500">of {row.maxQty} available</span>
                              {row.isParent && (
                                <span className="text-[11px] text-slate-500">(full quantity required)</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 bg-slate-50/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-2 text-xs font-medium rounded-xl border-2 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || submitting}
            className="px-3 py-2 text-xs font-medium rounded-xl text-white disabled:opacity-50 shadow-sm border-2 border-emerald-700 bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting ? 'Moving…' : 'Confirm move to Revival'}
          </button>
        </div>
      </div>
    </div>
  );
}
