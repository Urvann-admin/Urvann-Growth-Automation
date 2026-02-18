'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import type { PurchaseMaster } from '@/models/purchaseMaster';
import { Notification } from '@/components/ui/Notification';
import { SearchBar, ConfirmDialog } from '../../shared';
import { PurchaseTable } from './PurchaseTable';
import { EditPurchaseModal, type EditPurchaseForm } from './EditPurchaseModal';

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
    const amountListing = rows.reduce(
      (s, r) => s + ((r.type?.listing ?? 0) * (r.productPrice ?? 0) * normalizedFactor),
      0
    );
    const amountRevival = rows.reduce(
      (s, r) => s + ((r.type?.revival ?? 0) * (r.productPrice ?? 0) * normalizedFactor),
      0
    );
    const amountGrowth = rows.reduce(
      (s, r) => s + ((r.type?.growth ?? 0) * (r.productPrice ?? 0) * normalizedFactor),
      0
    );
    const amountConsumers = rows.reduce(
      (s, r) => s + ((r.type?.consumers ?? 0) * (r.productPrice ?? 0) * normalizedFactor),
      0
    );
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
  quantity: '',
  amount: '',
  parentSku: '',
  listing: '',
  revival: '',
  growth: '',
  consumers: '',
};

interface ParentOption {
  _id: string;
  sku?: string;
  plant: string;
}

function toEditForm(p: PurchaseMaster): EditPurchaseForm {
  return {
    billNumber: p.billNumber ?? '',
    productCode: p.productCode ?? '',
    productName: p.productName ?? '',
    quantity: String(p.quantity ?? ''),
    amount: String(p.amount ?? ''),
    parentSku: p.parentSku ?? '',
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
  const [billFilter, setBillFilter] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState<PurchaseMaster | null>(null);
  const [editForm, setEditForm] = useState<EditPurchaseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<PurchaseMaster | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [parents, setParents] = useState<ParentOption[]>([]);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '500');
      if (search.trim()) params.set('search', search.trim());
      if (billFilter.trim()) params.set('billNumber', billFilter.trim());
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
  }, [search, billFilter]);

  const fetchParents = useCallback(async () => {
    try {
      const res = await fetch('/api/parent-master?limit=500');
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        setParents(json.data.filter((p: ParentOption) => p.sku && String(p.sku).trim()));
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

  const parentOptions = parents.map((p) => ({
    value: p.sku ?? p._id,
    label: `${p.plant} ${p.sku ? `(${p.sku})` : ''}`,
  }));

  const billAnalytics = useMemo(() => computeBillAnalytics(purchases), [purchases]);
  const combinedAnalytics = useMemo(
    () => computeCombinedAnalytics(billAnalytics),
    [billAnalytics]
  );

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
      quantity,
      productPrice,
      amount,
      parentSku: editForm.parentSku.trim(),
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

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">View Invoice</h2>

      {message && (
        <Notification type={message.type} text={message.text} onDismiss={() => setMessage(null)} />
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Filter by bill number"
            value={billFilter}
            onChange={(e) => setBillFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <span className="text-sm text-slate-600">{purchases.length} record(s)</span>
        </div>
        <SearchBar
          value={search}
          onChange={setSearch}
          onSubmit={handleSearchSubmit}
          placeholder="Search bill, product code, parent SKU..."
          totalCount={purchases.length}
          entityName="Records"
        />

        {!loading && combinedAnalytics && (
          <div className="mb-6">
            <div
              className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border-2 border-emerald-400 bg-emerald-50 px-4 py-3 text-sm shadow-sm"
              aria-label="Combined analytics"
            >
              <span className="shrink-0 font-bold text-emerald-800">
                {combinedAnalytics.billNumber}
              </span>
              <span className="shrink-0 border-l border-emerald-300 pl-4 text-emerald-800">
                <span className="text-emerald-700">Bill total</span>{' '}
                <span className="font-semibold">{formatAmount(combinedAnalytics.billTotalAmount)}</span>
              </span>
              <span className="shrink-0 text-emerald-800">
                <span className="text-emerald-700">Grand total</span>{' '}
                <span className="font-semibold">{formatAmount(combinedAnalytics.grandTotalAmount)}</span>
              </span>
              <span className="shrink-0 border-l border-emerald-300 pl-4 text-emerald-800">
                <span className="text-emerald-700">Listing</span>{' '}
                <span className="font-semibold">{formatAmount(combinedAnalytics.amountListing)}</span>
              </span>
              <span className="shrink-0 text-emerald-800">
                <span className="text-emerald-700">Revival</span>{' '}
                <span className="font-semibold">{formatAmount(combinedAnalytics.amountRevival)}</span>
              </span>
              <span className="shrink-0 text-emerald-800">
                <span className="text-emerald-700">Growth</span>{' '}
                <span className="font-semibold">{formatAmount(combinedAnalytics.amountGrowth)}</span>
              </span>
              <span className="shrink-0 text-emerald-800">
                <span className="text-emerald-700">Consumers</span>{' '}
                <span className="font-semibold">{formatAmount(combinedAnalytics.amountConsumers)}</span>
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading...</div>
        ) : (
          <PurchaseTable
            purchases={purchases}
            onEdit={openEdit}
            onDelete={setDeleteConfirm}
          />
        )}
      </div>

      <EditPurchaseModal
        isOpen={editing !== null}
        editForm={editForm}
        saving={saving}
        parentOptions={parentOptions}
        onClose={() => setEditing(null)}
        onSave={handleSaveEdit}
        onChange={setEditForm}
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
