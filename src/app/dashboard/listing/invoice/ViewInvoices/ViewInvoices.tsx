'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Search, Calculator } from 'lucide-react';
import type { PurchaseMaster, PurchaseTypeBreakdown } from '@/models/purchaseMaster';
import { Notification } from '@/components/ui/Notification';
import { ConfirmDialog } from '../../shared';
import { HUB_MAPPINGS } from '@/shared/constants/hubs';
import { PurchaseTable } from './PurchaseTable';
import { EditPurchaseModal, type EditPurchaseForm } from './EditPurchaseModal';
import { AddInvoiceModal } from './AddInvoiceModal';
import { ImportInvoiceModal } from './ImportInvoiceModal';
import { AddOverheadModal } from './AddOverheadModal';

export interface BillAnalytics {
  billNumber: string;
  billTotalAmount: number;
  grandTotalAmount: number;
  normalizedFactor: number;
  amountListing: number;
  amountRevival: number;
  amountGrowth: number;
  amountConsumers: number;
}

function computeBillAnalytics(purchases: PurchaseMaster[]): BillAnalytics[] {
  const byBill = new Map<string, PurchaseMaster[]>();
  for (const p of purchases) {
    const bill = (p.billNumber ?? '').trim() || '—';
    if (!byBill.has(bill)) byBill.set(bill, []);
    byBill.get(bill)!.push(p);
  }
  const result: BillAnalytics[] = [];
  for (const [billNumber, rows] of byBill) {
    const billTotalAmount = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
    const totalOverhead = rows.reduce((s, r) => s + (r.overhead?.allocatedAmount ?? 0), 0);
    const grandTotalAmount = billTotalAmount + totalOverhead;
    const normalizedFactor = billTotalAmount > 0 ? grandTotalAmount / billTotalAmount : 1;
    const amountListing = rows.reduce((s, r) => {
      const qty = Math.max(1, r.quantity ?? 0);
      const price = (r.amount ?? 0) / qty;
      return s + (r.type?.listing ?? 0) * price * normalizedFactor;
    }, 0);
    const amountRevival = rows.reduce((s, r) => {
      const qty = Math.max(1, r.quantity ?? 0);
      const price = (r.amount ?? 0) / qty;
      return s + (r.type?.revival ?? 0) * price * normalizedFactor;
    }, 0);
    const amountGrowth = rows.reduce((s, r) => {
      const qty = Math.max(1, r.quantity ?? 0);
      const price = (r.amount ?? 0) / qty;
      return s + (r.type?.growth ?? 0) * price * normalizedFactor;
    }, 0);
    const amountConsumers = rows.reduce((s, r) => {
      const qty = Math.max(1, r.quantity ?? 0);
      const price = (r.amount ?? 0) / qty;
      return s + (r.type?.consumers ?? 0) * price * normalizedFactor;
    }, 0);
    result.push({
      billNumber,
      billTotalAmount,
      grandTotalAmount,
      normalizedFactor,
      amountListing,
      amountRevival,
      amountGrowth,
      amountConsumers,
    });
  }
  result.sort((a, b) => a.billNumber.localeCompare(b.billNumber));
  return result;
}

function computeCombinedAnalytics(billAnalytics: BillAnalytics[]): BillAnalytics | null {
  if (billAnalytics.length === 0) return null;
  return {
    billNumber: 'Combined',
    billTotalAmount: billAnalytics.reduce((s, a) => s + a.billTotalAmount, 0),
    grandTotalAmount: billAnalytics.reduce((s, a) => s + a.grandTotalAmount, 0),
    normalizedFactor: 0, // N/A for combined
    amountListing: billAnalytics.reduce((s, a) => s + a.amountListing, 0),
    amountRevival: billAnalytics.reduce((s, a) => s + a.amountRevival, 0),
    amountGrowth: billAnalytics.reduce((s, a) => s + a.amountGrowth, 0),
    amountConsumers: billAnalytics.reduce((s, a) => s + a.amountConsumers, 0),
  };
}

function formatAmount(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n));
}

const emptyForm: EditPurchaseForm = {
  billNumber: '',
  productCode: '',
  productName: '',
  itemType: '',
  quantity: '',
  amount: '',
  parentSku: '',
  hub: '',
  listing: '',
  revival: '',
  growth: '',
  consumers: '',
};

interface ParentFromApi {
  _id: string;
  sku?: string;
  plant: string;
  finalName?: string;
}

function toEditForm(p: PurchaseMaster): EditPurchaseForm {
  return {
    billNumber: p.billNumber ?? '',
    productCode: p.productCode ?? '',
    productName: p.productName ?? '',
    itemType: p.itemType ?? '',
    quantity: String(p.quantity ?? ''),
    amount: String(p.amount ?? ''),
    parentSku: p.parentSku ?? '',
    hub: (p as PurchaseMaster & { hub?: string }).hub ?? '',
    listing: p.type?.listing != null ? String(p.type.listing) : '',
    revival: p.type?.revival != null ? String(p.type.revival) : '',
    growth: p.type?.growth != null ? String(p.type.growth) : '',
    consumers: p.type?.consumers != null ? String(p.type.consumers) : '',
  };
}

export function ViewInvoices() {
  const [purchases, setPurchases] = useState<PurchaseMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState<PurchaseMaster | null>(null);
  const [editForm, setEditForm] = useState<EditPurchaseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<PurchaseMaster | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [parents, setParents] = useState<ParentFromApi[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [overheadModalOpen, setOverheadModalOpen] = useState(false);
  const [pendingEdits, setPendingEdits] = useState<
    Record<string, { itemType?: string; type?: PurchaseTypeBreakdown }>
  >({});
  const [savingPending, setSavingPending] = useState(false);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '500');
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/purchase-master?${params.toString()}`);
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        setPurchases(json.data);
      } else {
        setMessage({ type: 'error', text: json?.message ?? 'Failed to load purchases' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load purchases' });
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchParents = useCallback(async () => {
    try {
      const res = await fetch('/api/parent-master?limit=500');
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        setParents(json.data);
      }
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  useEffect(() => {
    fetchParents();
  }, [fetchParents]);

  useEffect(() => {
    if (!editing) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditing(null);
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [editing]);

  /** All unique SKUs from parent master */
  const parentOptions = useMemo(() => {
    const set = new Set<string>();
    parents.forEach((p: ParentFromApi) => {
      if (p.sku && String(p.sku).trim()) set.add(String(p.sku).trim());
    });
    return Array.from(set)
      .sort()
      .map((sku) => ({ value: sku, label: sku }));
  }, [parents]);

  const hubOptions = useMemo(
    () => HUB_MAPPINGS.map((m) => ({ value: m.hub, label: m.hub })),
    []
  );

  const billAnalytics = useMemo(() => computeBillAnalytics(purchases), [purchases]);
  const combinedAnalytics = useMemo(
    () => computeCombinedAnalytics(billAnalytics),
    [billAnalytics]
  );

  const displayPurchases = useMemo(() => {
    return purchases.map((p) => {
      const id = String(p._id);
      const pe = pendingEdits[id];
      return {
        ...p,
        itemType: pe?.itemType !== undefined ? pe.itemType : p.itemType,
        type: pe?.type !== undefined ? pe.type : p.type,
      };
    });
  }, [purchases, pendingEdits]);

  const pendingCount = Object.keys(pendingEdits).length;

  const handlePendingItemType = useCallback((p: PurchaseMaster, itemType: string) => {
    const id = String(p._id);
    setPendingEdits((prev) => ({ ...prev, [id]: { ...prev[id], itemType } }));
  }, []);

  const handlePendingType = useCallback(
    (p: PurchaseMaster, type: PurchaseTypeBreakdown | Record<string, never>) => {
      const id = String(p._id);
      setPendingEdits((prev) => ({
        ...prev,
        [id]: { ...prev[id], type: Object.keys(type).length ? (type as PurchaseTypeBreakdown) : undefined },
      }));
    },
    []
  );

  const handleSavePending = useCallback(async () => {
    if (pendingCount === 0) return;
    setMessage(null);
    setSavingPending(true);
    try {
      for (const id of Object.keys(pendingEdits)) {
        const pe = pendingEdits[id];
        const body: { itemType?: string; type?: PurchaseTypeBreakdown } = {};
        if (pe.itemType !== undefined) body.itemType = pe.itemType;
        if (pe.type !== undefined) body.type = pe.type;
        if (Object.keys(body).length === 0) continue;
        const res = await fetch(`/api/purchase-master/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Failed to update');
      }
      setMessage({ type: 'success', text: 'Changes saved successfully.' });
      setPendingEdits({});
      fetchPurchases();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to save' });
    } finally {
      setSavingPending(false);
    }
  }, [pendingEdits, pendingCount, fetchPurchases]);

  const openEdit = (p: PurchaseMaster) => {
    setEditing(p);
    setEditForm(toEditForm(p));
  };

  const handleSaveEdit = async () => {
    if (!editing?._id) return;
    setMessage(null);
    setSaving(true);
    const id = String(editing._id);
    const quantity = Math.max(0, Math.floor(Number(editForm.quantity) || 0));
    const amount = Math.max(0, Math.floor(Number(editForm.amount) || 0));
    const productPrice = quantity > 0 ? Math.round(amount / quantity) : 0;
    const payload = {
      billNumber: editForm.billNumber.trim(),
      productCode: editForm.productCode.trim(),
      productName: editForm.productName.trim() || undefined,
      itemType: editForm.itemType.trim() || undefined,
      quantity,
      productPrice,
      amount,
      parentSku: editForm.parentSku.trim(),
      ...(editForm.hub.trim() && { hub: editForm.hub.trim() }),
      type: {
        listing: editForm.listing !== '' ? Number(editForm.listing) : undefined,
        revival: editForm.revival !== '' ? Number(editForm.revival) : undefined,
        growth: editForm.growth !== '' ? Number(editForm.growth) : undefined,
        consumers: editForm.consumers !== '' ? Number(editForm.consumers) : undefined,
      },
    };
    try {
      const res = await fetch(`/api/purchase-master/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message ?? 'Failed to update' });
        setSaving(false);
        return;
      }
      setMessage({ type: 'success', text: 'Updated successfully.' });
      setEditing(null);
      fetchPurchases();
    } catch {
      setMessage({ type: 'error', text: 'Network error.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleDelete = async () => {
    if (!deleteConfirm?._id) return;
    setDeleting(true);
    setMessage(null);
    const id = String(deleteConfirm._id);
    try {
      const res = await fetch(`/api/purchase-master/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message ?? 'Failed to delete' });
        setDeleting(false);
        return;
      }
      setMessage({ type: 'success', text: 'Deleted successfully.' });
      setDeleteConfirm(null);
      fetchPurchases();
    } catch {
      setMessage({ type: 'error', text: 'Network error.' });
    } finally {
      setDeleting(false);
    }
  };

  const handleAddSuccess = useCallback(() => {
    setAddModalOpen(false);
    fetchPurchases();
  }, [fetchPurchases]);

  const handleImportSuccess = useCallback(() => {
    setImportModalOpen(false);
    fetchPurchases();
  }, [fetchPurchases]);

  return (
    <div className="space-y-6">
      {message && (
        <Notification type={message.type} text={message.text} onDismiss={() => setMessage(null)} />
      )}

      {!loading && combinedAnalytics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" aria-label="Combined analytics">
            <div className="rounded-xl border border-[#330033]/20 bg-[#330033]/5 px-4 py-3 shadow-sm ring-1 ring-[#330033]/10">
              <p className="text-xs font-medium uppercase tracking-wider text-[#330033]">Bill Total</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[#330033]">
                {formatAmount(combinedAnalytics.billTotalAmount)}
              </p>
            </div>
            <div className="rounded-xl border border-[#330033]/20 bg-[#330033]/5 px-4 py-3 shadow-sm ring-1 ring-[#330033]/10">
              <p className="text-xs font-medium uppercase tracking-wider text-[#330033]">Grand Total</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[#330033]">
                {formatAmount(combinedAnalytics.grandTotalAmount)}
              </p>
            </div>
            <div className="rounded-xl border border-[#330033]/20 bg-[#330033]/5 px-4 py-3 shadow-sm ring-1 ring-[#330033]/10">
              <p className="text-xs font-medium uppercase tracking-wider text-[#330033]">Listing</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[#330033]">
                {formatAmount(combinedAnalytics.amountListing)}
              </p>
            </div>
            <div className="rounded-xl border border-[#330033]/20 bg-[#330033]/5 px-4 py-3 shadow-sm ring-1 ring-[#330033]/10">
              <p className="text-xs font-medium uppercase tracking-wider text-[#330033]">Revival</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[#330033]">
                {formatAmount(combinedAnalytics.amountRevival)}
              </p>
            </div>
            <div className="rounded-xl border border-[#330033]/20 bg-[#330033]/5 px-4 py-3 shadow-sm ring-1 ring-[#330033]/10">
              <p className="text-xs font-medium uppercase tracking-wider text-[#330033]">Growth</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[#330033]">
                {formatAmount(combinedAnalytics.amountGrowth)}
              </p>
            </div>
            <div className="rounded-xl border border-[#330033]/20 bg-[#330033]/5 px-4 py-3 shadow-sm ring-1 ring-[#330033]/10">
              <p className="text-xs font-medium uppercase tracking-wider text-[#330033]">Consumers</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[#330033]">
                {formatAmount(combinedAnalytics.amountConsumers)}
              </p>
            </div>
          </div>
      )}

      <div className="rounded-xl border border-[#330033]/20 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#330033]/25 bg-[#330033]/10 px-3">
            <span className="text-sm font-medium text-[#330033]">RECORDS</span>
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white border border-[#330033]/25 px-2 text-sm font-medium text-[#330033] shadow-sm">
              {purchases.length}
            </span>
          </div>
          <form onSubmit={handleSearchSubmit} className="relative flex flex-1 min-w-[200px] h-10 gap-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#330033]/60 pointer-events-none" />
            <input
              type="text"
              placeholder="Search bill, product code, parent SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-full w-full pl-9 pr-4 rounded-lg border border-[#330033]/25 bg-white text-sm text-slate-900 placeholder:text-[#330033]/50 focus:outline-none focus:ring-2 focus:ring-[#330033]/30 focus:border-[#330033]"
            />
            <button
              type="submit"
              className="h-full rounded-lg bg-[#330033] px-4 text-sm font-medium text-white hover:bg-[#4a004a] focus:outline-none focus:ring-2 focus:ring-[#330033]/40 shrink-0"
            >
              Search
            </button>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#330033] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4a004a] focus:outline-none focus:ring-2 focus:ring-[#330033]/40"
            >
              <FileText className="w-4 h-4" />
              Import Invoice
            </button>
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#E6007A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#cc0066] focus:outline-none focus:ring-2 focus:ring-[#E6007A]/40"
            >
              <Plus className="w-4 h-4" />
              Add Invoice
            </button>
            <button
              type="button"
              onClick={() => setOverheadModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#330033]/30 bg-white px-4 py-2.5 text-sm font-medium text-[#330033] hover:bg-[#330033]/10 focus:outline-none focus:ring-2 focus:ring-[#330033]/30"
            >
              <Calculator className="w-4 h-4" />
              Add Overhead
            </button>
            <button
              type="button"
              onClick={handleSavePending}
              disabled={pendingCount === 0 || savingPending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#330033] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4a004a] focus:outline-none focus:ring-2 focus:ring-[#330033]/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingPending ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>Save{pendingCount > 0 ? ` (${pendingCount})` : ''}</>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading...</div>
        ) : (
          <PurchaseTable
            purchases={displayPurchases}
            onEdit={openEdit}
            onDelete={setDeleteConfirm}
            onPendingItemType={handlePendingItemType}
            onPendingType={handlePendingType}
          />
        )}
      </div>

      <EditPurchaseModal
        isOpen={editing !== null}
        editForm={editForm}
        saving={saving}
        parentOptions={parentOptions}
        hubOptions={hubOptions}
        onClose={() => setEditing(null)}
        onSave={handleSaveEdit}
        onChange={setEditForm}
      />

      <AddInvoiceModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      <ImportInvoiceModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={handleImportSuccess}
      />

      <AddOverheadModal
        isOpen={overheadModalOpen}
        purchases={purchases}
        onClose={() => setOverheadModalOpen(false)}
        onSuccess={handleImportSuccess}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete purchase record"
        message={`Delete this record (Bill: ${deleteConfirm?.billNumber}, Product: ${deleteConfirm?.productCode})?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        loading={deleting}
      />
    </div>
  );
}
