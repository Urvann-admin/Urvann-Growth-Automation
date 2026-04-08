'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ModalContainer, ModalHeader, ModalFooter, ModalSection } from '../../shared';
import { Notification } from '@/components/ui/Notification';
import { CustomSelect, type SelectOption } from '@/app/dashboard/listing/components/CustomSelect';
import { HUB_MAPPINGS } from '@/shared/constants/hubs';
import { inferHubFromParentRecord } from '@/lib/inferHubFromParent';

type ResolvedProductType = 'parent' | 'growing_product' | 'consumable';

interface ParentFromApi {
  _id: string;
  sku?: string;
  plant: string;
  finalName?: string;
  productCode?: string;
  vendor_id?: string;
  /** Hub for hub-scoped parent rows; SKU may include this hub’s letter prefix. */
  hub?: string;
}

function displayProductName(p: ParentFromApi): string {
  const fromFinal = p.finalName?.trim();
  if (fromFinal) return fromFinal;
  const fromPlant = p.plant?.trim();
  if (fromPlant) return fromPlant;
  const sk = p.sku?.trim();
  return sk ?? '';
}

/** CustomSelect treats `value=""` as no selection but fails to show placeholder; use a sentinel. */
const NO_PRODUCT = '__no_product__';

export interface AddInvoiceFormState {
  hub: string;
  productCode: string;
  productName: string;
  quantity: string;
  amount: string;
  parentSku: string;
  resolvedProductType: ResolvedProductType | '';
  vendor: string;
  listing: string;
  revival: string;
  growth: string;
  consumers: string;
}

const emptyForm: AddInvoiceFormState = {
  hub: '',
  productCode: '',
  productName: '',
  quantity: '',
  amount: '',
  parentSku: '',
  resolvedProductType: '',
  vendor: '',
  listing: '',
  revival: '',
  growth: '',
  consumers: '',
};

interface AddInvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

async function fetchResolveParentSku(
  productCode: string,
  hub: string
): Promise<{
  ok: boolean;
  parentSku?: string;
  productType?: ResolvedProductType;
  vendorId?: string | null;
  message?: string;
}> {
  const code = productCode.trim();
  const h = hub.trim();
  if (!code || !h) return { ok: false, message: 'Product code and hub are required.' };
  const res = await fetch(
    `/api/purchase-master/resolve-parent-sku?productCode=${encodeURIComponent(code)}&hub=${encodeURIComponent(h)}`
  );
  const data = await res.json();
  if (!res.ok || !data.success) {
    return { ok: false, message: String(data.message ?? 'Could not resolve parent SKU') };
  }
  return {
    ok: true,
    parentSku: String(data.parentSku ?? '').trim(),
    productType: data.productType as ResolvedProductType,
    vendorId: data.vendorId ?? null,
  };
}

function applyTypeDefaultsForProductType(
  productType: ResolvedProductType | '',
  quantity: number
): Pick<AddInvoiceFormState, 'listing' | 'revival' | 'growth' | 'consumers'> {
  if (quantity <= 0) {
    return { listing: '', revival: '', growth: '', consumers: '' };
  }
  const q = String(quantity);
  if (productType === 'growing_product' || productType === 'consumable') {
    return { listing: '0', revival: '0', growth: q, consumers: '0' };
  }
  return { listing: q, revival: '0', growth: '0', consumers: '0' };
}

export function AddInvoiceFormModal({ isOpen, onClose, onSuccess }: AddInvoiceFormModalProps) {
  const [form, setForm] = useState<AddInvoiceFormState>(emptyForm);
  const [parents, setParents] = useState<ParentFromApi[]>([]);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [sellers, setSellers] = useState<
    { _id: string; seller_name: string; vendorCode?: string }[]
  >([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(false);
  /** Hub came from selected parent’s `hub` field — user cannot change (SKU is hub-scoped). */
  const [hubLockedFromParent, setHubLockedFromParent] = useState(false);
  const formRef = useRef(form);
  formRef.current = form;

  const fetchParents = useCallback(async () => {
    try {
      const res = await fetch('/api/parent-master?limit=2000&baseParentsOnly=true');
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        setParents(json.data);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load products' });
    }
  }, []);

  /** Searchable product names: one row per base parent with SKU (matches ParentMaster listing use). */
  const productNameOptions = useMemo((): SelectOption[] => {
    const rows = parents.filter((p) => p.sku && String(p.sku).trim());
    const baseLabels = rows.map((p) => displayProductName(p));
    const labelCounts = new Map<string, number>();
    baseLabels.forEach((l) => labelCounts.set(l, (labelCounts.get(l) ?? 0) + 1));
    const opts = rows.map((p) => {
      const base = displayProductName(p);
      const sku = String(p.sku).trim();
      const dup = (labelCounts.get(base) ?? 0) > 1;
      return {
        value: String(p._id),
        label: dup && base ? `${base} (${sku})` : base || sku,
      };
    });
    opts.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    return [{ value: NO_PRODUCT, label: 'Select product…' }, ...opts];
  }, [parents]);

  const resolveAndApply = useCallback(
    async (productCode: string, hub: string, quantityStr: string) => {
      const h = hub.trim();
      if (!productCode.trim() || !h) {
        setForm((f) => ({
          ...f,
          parentSku: '',
          resolvedProductType: '',
        }));
        return;
      }
      setResolving(true);
      try {
        const result = await fetchResolveParentSku(productCode, h);
        if (!result.ok) {
          setForm((f) => ({
            ...f,
            parentSku: '',
            resolvedProductType: '',
          }));
          setMessage({ type: 'error', text: result.message ?? 'Resolve failed' });
          return;
        }
        const qty = Math.max(0, Math.floor(Number(quantityStr) || 0));
        const typePatch = applyTypeDefaultsForProductType(result.productType ?? 'parent', qty);
        const vid = result.vendorId?.trim();
        setForm((f) => ({
          ...f,
          parentSku: result.parentSku ?? '',
          resolvedProductType: (result.productType ?? 'parent') as ResolvedProductType,
          ...typePatch,
          ...(vid && sellers.some((s) => s._id === vid) ? { vendor: vid } : {}),
        }));
        setMessage(null);
      } finally {
        setResolving(false);
      }
    },
    [sellers]
  );

  const applyParentSelection = useCallback(
    async (parentId: string) => {
      if (!parentId || parentId === NO_PRODUCT) {
        setSelectedParentId('');
        setHubLockedFromParent(false);
        setForm((f) => ({
          ...f,
          productName: '',
          productCode: '',
          parentSku: '',
          resolvedProductType: '',
          vendor: '',
          hub: '',
        }));
        return;
      }
      setSelectedParentId(parentId);
      const p = parents.find((x) => String(x._id) === parentId);
      if (!p?.sku) return;
      const sku = String(p.sku).trim();
      const productName = displayProductName(p) || sku;
      const productCode = (p.productCode?.trim() || sku).trim();
      const vid = p.vendor_id?.trim();
      const vendorGuess = vid && sellers.some((s) => s._id === vid) ? vid : '';
      const inferredHub = inferHubFromParentRecord(p);
      const lockHub = !!String(p.hub ?? '').trim();
      setHubLockedFromParent(lockHub);

      const qty = formRef.current.quantity;
      setForm((f) => ({
        ...f,
        productName,
        productCode,
        vendor: vendorGuess || f.vendor,
        hub: inferredHub ?? '',
      }));

      const hubToUse = (inferredHub ?? '').trim();
      if (hubToUse) {
        await resolveAndApply(productCode, hubToUse, qty);
      }
    },
    [parents, sellers, resolveAndApply]
  );

  useEffect(() => {
    if (!selectedParentId) return;
    const vid = String(
      parents.find((x) => String(x._id) === selectedParentId)?.vendor_id ?? ''
    ).trim();
    if (!vid || !sellers.some((s) => s._id === vid)) return;
    setForm((f) => (f.vendor === vid ? f : { ...f, vendor: vid }));
  }, [sellers, selectedParentId, parents]);

  const sellerOptions = useMemo(
    () =>
      sellers.map((s) => ({
        value: s._id,
        label: s.vendorCode
          ? `${s.seller_name} (${s.vendorCode})`
          : s.seller_name || s._id,
      })),
    [sellers]
  );

  const fetchSellers = useCallback(async () => {
    try {
      const res = await fetch('/api/procurement-seller-master?limit=500');
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        setSellers(
          json.data
            .filter((s: { _id?: unknown }) => s._id != null)
            .map((s: { _id: string; seller_name?: string; vendorCode?: string }) => ({
              _id: String(s._id),
              seller_name: String(s.seller_name ?? '').trim(),
              vendorCode: s.vendorCode ? String(s.vendorCode).trim() : undefined,
            }))
        );
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load vendors' });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setForm(emptyForm);
      setSelectedParentId('');
      setHubLockedFromParent(false);
      setMessage(null);
      fetchParents();
      fetchSellers();
    }
  }, [isOpen, fetchParents, fetchSellers]);

  const handleSubmit = async () => {
    setMessage(null);
    const quantity = Math.max(0, Math.floor(Number(form.quantity) || 0));
    const amount = Math.max(0, Math.floor(Number(form.amount) || 0));
    if (!form.hub.trim()) {
      setMessage({ type: 'error', text: 'Hub is required.' });
      return;
    }
    if (!form.productCode.trim()) {
      setMessage({ type: 'error', text: 'Product code is required.' });
      return;
    }
    if (!form.parentSku.trim()) {
      setMessage({ type: 'error', text: 'Parent SKU could not be resolved. Check hub and product code.' });
      return;
    }
    if (quantity < 0 || amount < 0) {
      setMessage({ type: 'error', text: 'Quantity and amount must be non-negative.' });
      return;
    }

    let listing = Math.max(0, Math.floor(Number(form.listing) || 0));
    let revival = Math.max(0, Math.floor(Number(form.revival) || 0));
    let growth = Math.max(0, Math.floor(Number(form.growth) || 0));
    let consumers = Math.max(0, Math.floor(Number(form.consumers) || 0));
    const typeSum = listing + revival + growth + consumers;
    if (typeSum === 0 && quantity > 0) {
      const patch = applyTypeDefaultsForProductType(form.resolvedProductType || 'parent', quantity);
      listing = Math.max(0, Math.floor(Number(patch.listing) || 0));
      revival = Math.max(0, Math.floor(Number(patch.revival) || 0));
      growth = Math.max(0, Math.floor(Number(patch.growth) || 0));
      consumers = Math.max(0, Math.floor(Number(patch.consumers) || 0));
    } else if (typeSum !== quantity) {
      setMessage({ type: 'error', text: 'Type split must equal Quantity.' });
      return;
    }

    const productPrice = quantity > 0 ? Math.round(amount / quantity) : 0;

    const payload = {
      productCode: form.productCode.trim(),
      productName: form.productName.trim() || undefined,
      quantity,
      productPrice,
      amount,
      parentSku: form.parentSku.trim(),
      ...(form.vendor.trim() && { seller: form.vendor.trim() }),
      type: {
        ...(listing > 0 && { listing }),
        ...(revival > 0 && { revival }),
        ...(growth > 0 && { growth }),
        ...(consumers > 0 && { consumers }),
      },
    };

    setSaving(true);
    try {
      const res = await fetch('/api/purchase-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message ?? 'Failed to save' });
        setSaving(false);
        return;
      }
      const bill = data?.data?.billNumber != null ? String(data.data.billNumber) : '';
      setMessage({
        type: 'success',
        text: bill ? `Invoice line added (bill ${bill}).` : 'Invoice line added.',
      });
      onSuccess();
      onClose();
      setForm(emptyForm);
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputClass =
    'w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500';

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Add Invoice" onClose={onClose} />

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6 space-y-6">
          {message && (
            <Notification type={message.type} text={message.text} onDismiss={() => setMessage(null)} />
          )}

          <p className="text-sm text-slate-600">Add a line item below.</p>

          <ModalSection title="Line details">
            <p className="text-xs text-slate-500 -mt-2 mb-2">
              Bill number is assigned automatically when you save.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="block sm:col-span-2">
                <CustomSelect
                  label="Product name"
                  value={selectedParentId || NO_PRODUCT}
                  onChange={applyParentSelection}
                  options={productNameOptions}
                  placeholder="Search or select product…"
                  searchable
                />
              </div>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Hub</span>
                {hubLockedFromParent && (
                  <p className="text-xs text-slate-500 mb-1">From selected product (hub-scoped SKU).</p>
                )}
                <select
                  value={form.hub}
                  disabled={hubLockedFromParent}
                  onChange={async (e) => {
                    const hub = e.target.value;
                    const pc = formRef.current.productCode.trim();
                    const qty = formRef.current.quantity;
                    if (!hub.trim()) {
                      setForm((f) => ({ ...f, hub, parentSku: '', resolvedProductType: '' }));
                      return;
                    }
                    setForm((f) => ({ ...f, hub }));
                    if (pc) await resolveAndApply(pc, hub, qty);
                  }}
                  className={`${inputClass} ${hubLockedFromParent ? 'bg-slate-50 text-slate-700 cursor-not-allowed' : ''}`}
                >
                  <option value="">Select hub</option>
                  {HUB_MAPPINGS.map((m) => (
                    <option key={m.hub} value={m.hub}>
                      {m.hub}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Product code</span>
                <input
                  type="text"
                  value={form.productCode}
                  onChange={(e) => setForm((f) => ({ ...f, productCode: e.target.value }))}
                  onBlur={async () => {
                    const { hub, productCode, quantity } = formRef.current;
                    if (hub.trim() && productCode.trim()) {
                      await resolveAndApply(productCode, hub, quantity);
                    }
                  }}
                  className={inputClass}
                  placeholder="e.g. SKU001"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Quantity</span>
                <input
                  type="number"
                  min={0}
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((f) => {
                      const nextQuantity = e.target.value;
                      const prevQty = Math.max(0, Math.floor(Number(f.quantity) || 0));
                      const listVal = Math.max(0, Math.floor(Number(f.listing) || 0));
                      const rev = Math.max(0, Math.floor(Number(f.revival) || 0));
                      const gro = Math.max(0, Math.floor(Number(f.growth) || 0));
                      const con = Math.max(0, Math.floor(Number(f.consumers) || 0));
                      const isGrowing =
                        f.resolvedProductType === 'growing_product' ||
                        f.resolvedProductType === 'consumable';
                      if (isGrowing) {
                        const othersZero = listVal === 0 && rev === 0 && con === 0;
                        const growthUnset = !String(f.growth ?? '').trim();
                        const syncGrowth =
                          othersZero && (growthUnset || gro === prevQty);
                        return {
                          ...f,
                          quantity: nextQuantity,
                          ...(syncGrowth ? { growth: nextQuantity } : {}),
                        };
                      }
                      const othersZero = rev === 0 && gro === 0 && con === 0;
                      const listingUnset = !String(f.listing ?? '').trim();
                      const syncListing =
                        othersZero && (listingUnset || listVal === prevQty);
                      return {
                        ...f,
                        quantity: nextQuantity,
                        ...(syncListing ? { listing: nextQuantity } : {}),
                      };
                    })
                  }
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Amount</span>
                <input
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <div className="block sm:col-span-2">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Parent SKU</span>
                <div
                  className={`${inputClass} bg-slate-50 text-slate-700 flex items-center min-h-[2.5rem]`}
                  aria-live="polite"
                >
                  {resolving ? 'Resolving…' : form.parentSku || '—'}
                </div>
              </div>
              <label className="block sm:col-span-2">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Vendor</span>
                <select
                  value={form.vendor}
                  onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Select</option>
                  {sellerOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </ModalSection>

          <ModalSection title="Type">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Listing</span>
                <input
                  type="number"
                  min={0}
                  value={form.listing}
                  onChange={(e) => setForm((f) => ({ ...f, listing: e.target.value }))}
                  className={inputClass}
                  placeholder="0"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Revival</span>
                <input
                  type="number"
                  min={0}
                  value={form.revival}
                  onChange={(e) => setForm((f) => ({ ...f, revival: e.target.value }))}
                  className={inputClass}
                  placeholder="0"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Growth</span>
                <input
                  type="number"
                  min={0}
                  value={form.growth}
                  onChange={(e) => setForm((f) => ({ ...f, growth: e.target.value }))}
                  className={inputClass}
                  placeholder="0"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Consumers</span>
                <input
                  type="number"
                  min={0}
                  value={form.consumers}
                  onChange={(e) => setForm((f) => ({ ...f, consumers: e.target.value }))}
                  className={inputClass}
                  placeholder="0"
                />
              </label>
            </div>
          </ModalSection>
        </div>
      </div>

      <ModalFooter
        onCancel={onClose}
        onSave={handleSubmit}
        saving={saving}
        saveLabel="Add invoice line"
        cancelLabel="Cancel"
      />
    </ModalContainer>
  );
}
