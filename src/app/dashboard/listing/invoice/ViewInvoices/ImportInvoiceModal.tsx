'use client';

import { useState, useCallback, useRef, useEffect, Fragment } from 'react';
import { Upload, Plus, Download } from 'lucide-react';
import { ModalContainer } from '../../shared';
import { Notification } from '@/components/ui/Notification';
import type { DraftPurchaseRow } from '../AddInvoiceForm/types';
import type { PurchaseTypeBreakdown } from '@/models/purchaseMaster';
import { OverheadModal, type OverheadFormState } from '../AddInvoiceForm/OverheadModal';
import { HUB_MAPPINGS } from '@/shared/constants/hubs';

function sumTypeBreakdown(t: PurchaseTypeBreakdown | undefined): number {
  return (
    Math.floor(Math.max(0, Number(t?.listing ?? 0) || 0)) +
    Math.floor(Math.max(0, Number(t?.revival ?? 0) || 0)) +
    Math.floor(Math.max(0, Number(t?.growth ?? 0) || 0)) +
    Math.floor(Math.max(0, Number(t?.consumers ?? 0) || 0))
  );
}

function patchTypeField(
  row: DraftPurchaseRow,
  key: keyof PurchaseTypeBreakdown,
  raw: string
): PurchaseTypeBreakdown {
  const n = Math.max(0, Math.floor(Number(raw) || 0));
  const next: PurchaseTypeBreakdown = { ...row.type };
  if (n <= 0) {
    delete next[key];
  } else {
    next[key] = n;
  }
  return next;
}

const emptyOverheadForm: OverheadFormState = {
  overheadAmount: '',
  overheadNature: '',
  bill: '',
  allocationMethod: 'Equal',
};

function defaultTypeForProductType(
  productType: string,
  quantity: number
): PurchaseTypeBreakdown {
  if (productType === 'growing_product' || productType === 'consumable') {
    return { growth: quantity };
  }
  return { listing: quantity };
}

function parsedToDraftRow(parsed: Record<string, unknown>): DraftPurchaseRow {
  const q = Number(parsed.quantity);
  const amt = Number(parsed.amount);
  const quantity = Number.isFinite(q) ? Math.floor(q) : 0;
  const amount = Number.isFinite(amt) ? Math.floor(amt) : 0;
  const priceFromSheet = parsed.productPrice != null ? Number(parsed.productPrice) : NaN;
  const productPrice =
    Number.isFinite(priceFromSheet) && priceFromSheet >= 0
      ? Math.round(priceFromSheet)
      : quantity > 0
        ? Math.round(amount / quantity)
        : 0;
  return {
    billNumber: String(parsed.billNumber ?? '').trim(),
    productCode: String(parsed.productCode ?? '').trim(),
    productName: String(parsed.productName ?? '').trim(),
    quantity,
    productPrice,
    amount,
    parentSku: '',
    type: {},
  };
}

interface ImportInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProcurementSellerRow {
  _id: string;
  seller_name: string;
  vendorCode?: string;
}

export function ImportInvoiceModal({ isOpen, onClose, onSuccess }: ImportInvoiceModalProps) {
  const [rows, setRows] = useState<DraftPurchaseRow[]>([]);
  const [sellers, setSellers] = useState<ProcurementSellerRow[]>([]);
  const [importHub, setImportHub] = useState('');
  const [importVendor, setImportVendor] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [overheadModalOpen, setOverheadModalOpen] = useState(false);
  const [overheadForm, setOverheadForm] = useState<OverheadFormState>(emptyOverheadForm);
  const [manualAmounts, setManualAmounts] = useState<number[]>([]);
  const [manualTotalError, setManualTotalError] = useState<string | null>(null);
  const [uploadNonce, setUploadNonce] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
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
        /* non-blocking */
      }
    })();
  }, [isOpen]);

  const resolveRowsForHub = useCallback(async (hub: string, rowList: DraftPurchaseRow[]) => {
    const h = hub.trim();
    if (!h || rowList.length === 0) return;
    setResolving(true);
    try {
      const next = await Promise.all(
        rowList.map(async (r) => {
          const code = r.productCode.trim();
          if (!code) {
            return {
              ...r,
              parentSku: '',
              resolveError: 'Product code is required',
              type: {},
            };
          }
          try {
            const res = await fetch(
              `/api/purchase-master/resolve-parent-sku?productCode=${encodeURIComponent(code)}&hub=${encodeURIComponent(h)}`
            );
            const data = await res.json();
            if (!res.ok || !data.success) {
              return {
                ...r,
                parentSku: '',
                resolveError: String(data.message ?? 'Could not resolve parent SKU'),
                type: {},
              };
            }
            const productType = String(data.productType ?? 'parent');
            return {
              ...r,
              parentSku: String(data.parentSku ?? '').trim(),
              resolveError: undefined,
              type: defaultTypeForProductType(productType, r.quantity),
            };
          } catch {
            return {
              ...r,
              parentSku: '',
              resolveError: 'Network error resolving SKU',
              type: {},
            };
          }
        })
      );
      setRows(next);
    } finally {
      setResolving(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || rowsRef.current.length === 0 || !importHub.trim()) return;
    void resolveRowsForHub(importHub, rowsRef.current);
  }, [importHub, rows.length, uploadNonce, isOpen, resolveRowsForHub]);

  const handleClose = useCallback(() => {
    setRows([]);
    setImportHub('');
    setImportVendor('');
    setUploadNonce(0);
    setMessage(null);
    onClose();
  }, [onClose]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const XLSX = await import('xlsx');
      const headers = ['Product name', 'Product Code', 'Amount', 'Quantity'];
      const ws = XLSX.utils.aoa_to_sheet([headers]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
      XLSX.writeFile(wb, 'import-invoice-template.xlsx');
    } catch {
      setMessage({ type: 'error', text: 'Failed to download template.' });
    }
  }, []);

  const updateRow = useCallback((index: number, patch: Partial<DraftPurchaseRow>) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const updateRowTypeField = useCallback(
    (index: number, key: keyof PurchaseTypeBreakdown, raw: string) => {
      setRows((prev) => {
        const next = [...prev];
        const cur = next[index];
        if (!cur) return prev;
        next[index] = { ...cur, type: patchTypeField(cur, key, raw) };
        return next;
      });
    },
    []
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls' && ext !== '.csv') {
      setMessage({ type: 'error', text: 'Please upload an Excel or CSV file (.xlsx, .xls, or .csv)' });
      return;
    }
    setMessage(null);
    setParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/purchase-master/parse-excel', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message ?? 'Failed to parse file' });
        setParsing(false);
        return;
      }
      const parsedRows = (data.rows ?? []).map(parsedToDraftRow);
      setRows(parsedRows);
      setManualAmounts(parsedRows.map(() => 0));
      setUploadNonce((n) => n + 1);
      setMessage({
        type: 'success',
        text: `Loaded ${parsedRows.length} line(s). Choose hub and vendor, review the preview, then save.`,
      });
    } catch {
      setMessage({ type: 'error', text: 'Failed to parse file' });
    } finally {
      setParsing(false);
      e.target.value = '';
    }
  };

  const applyOverhead = () => {
    const overheadAmount = Number(overheadForm.overheadAmount);
    if (!Number.isFinite(overheadAmount) || overheadAmount <= 0 || rows.length === 0) {
      setMessage({ type: 'error', text: 'Enter a valid overhead amount and ensure there are rows.' });
      return;
    }
    const method = overheadForm.allocationMethod;
    if (method === 'Manual') {
      const sum = manualAmounts.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - overheadAmount) > 0.01) {
        setManualTotalError(`Sum of allocated amounts (${sum}) must equal overhead amount (${overheadAmount}).`);
        return;
      }
      setManualTotalError(null);
      setRows((prev) =>
        prev.map((row, i) => ({
          ...row,
          overhead: {
            overheadAmount,
            overheadNature: overheadForm.overheadNature.trim() || undefined,
            bill: overheadForm.bill.trim() || undefined,
            allocationMethod: 'Manual',
            allocatedAmount: manualAmounts[i] ?? 0,
          },
        }))
      );
    } else if (method === 'Equal') {
      const perLine = overheadAmount / rows.length;
      setRows((prev) =>
        prev.map((row) => ({
          ...row,
          overhead: {
            overheadAmount,
            overheadNature: overheadForm.overheadNature.trim() || undefined,
            bill: overheadForm.bill.trim() || undefined,
            allocationMethod: 'Equal',
            allocatedAmount: Math.round(perLine * 100) / 100,
          },
        }))
      );
    } else if (method === 'quantity') {
      const totalQ = rows.reduce((a, r) => a + r.quantity, 0);
      if (totalQ === 0) {
        setMessage({ type: 'error', text: 'Total quantity is 0; cannot allocate by quantity.' });
        return;
      }
      setRows((prev) =>
        prev.map((row) => ({
          ...row,
          overhead: {
            overheadAmount,
            overheadNature: overheadForm.overheadNature.trim() || undefined,
            bill: overheadForm.bill.trim() || undefined,
            allocationMethod: 'quantity',
            allocatedAmount: Math.round((overheadAmount * (row.quantity / totalQ)) * 100) / 100,
          },
        }))
      );
    } else {
      const totalAmt = rows.reduce((a, r) => a + r.amount, 0);
      if (totalAmt === 0) {
        setMessage({ type: 'error', text: 'Total amount is 0; cannot allocate by value.' });
        return;
      }
      setRows((prev) =>
        prev.map((row) => ({
          ...row,
          overhead: {
            overheadAmount,
            overheadNature: overheadForm.overheadNature.trim() || undefined,
            bill: overheadForm.bill.trim() || undefined,
            allocationMethod: 'value',
            allocatedAmount: Math.round((overheadAmount * (row.amount / totalAmt)) * 100) / 100,
          },
        }))
      );
    }
    setOverheadModalOpen(false);
    setOverheadForm(emptyOverheadForm);
    setManualAmounts(rows.map(() => 0));
    setManualTotalError(null);
    setMessage({ type: 'success', text: 'Overhead applied to all lines.' });
  };

  const openOverheadModal = () => {
    if (rows.length === 0) {
      setMessage({ type: 'error', text: 'Upload a file first to add overhead.' });
      return;
    }
    setManualAmounts(rows.map(() => 0));
    setManualTotalError(null);
    const billFromFile = rows[0]?.billNumber?.trim() || '';
    setOverheadForm((prev) => ({ ...prev, bill: billFromFile }));
    setOverheadModalOpen(true);
  };

  const rowReadyForSave = useCallback((r: DraftPurchaseRow) => {
    const sumOk = sumTypeBreakdown(r.type) === r.quantity;
    return sumOk && !!r.parentSku.trim() && !r.resolveError;
  }, []);

  const allRowsComplete =
    rows.length > 0 &&
    rows.every(rowReadyForSave) &&
    !!importHub.trim() &&
    !!importVendor.trim();
  const incompleteRows = rows.filter((r) => !rowReadyForSave(r)).length;

  const handleSave = async () => {
    if (rows.length === 0) {
      setMessage({ type: 'error', text: 'Upload a file first.' });
      return;
    }
    if (!importHub.trim()) {
      setMessage({ type: 'error', text: 'Select a hub.' });
      return;
    }
    if (!importVendor.trim()) {
      setMessage({ type: 'error', text: 'Select a vendor.' });
      return;
    }
    if (!allRowsComplete) {
      setMessage({
        type: 'error',
        text: `Fix errors, select product type breakdown for every line, and ensure hub/vendor are set. ${incompleteRows} row(s) incomplete.`,
      });
      return;
    }
    const invalid = rows.find(
      (r) => !r.productCode.trim() || !r.parentSku.trim() || r.quantity < 0 || r.amount < 0
    );
    if (invalid) {
      setMessage({
        type: 'error',
        text: 'Each row needs product code and resolved parent SKU.',
      });
      return;
    }
    setMessage(null);
    setSaving(true);
    try {
      const payload = rows.map((r) => {
        const quantity = r.quantity;
        const amount = r.amount;
        const productPrice = quantity > 0 ? Math.round(amount / quantity) : r.productPrice ?? 0;
        const type = r.type;
        return {
          billNumber: r.billNumber.trim(),
          productCode: r.productCode,
          productName: r.productName?.trim() || undefined,
          quantity,
          productPrice,
          amount,
          parentSku: r.parentSku,
          seller: importVendor.trim(),
          type,
          overhead: r.overhead
            ? {
                overheadAmount: r.overhead.overheadAmount,
                overheadNature: r.overhead.overheadNature,
                bill: r.overhead.bill,
                allocationMethod: r.overhead.allocationMethod,
                allocatedAmount: r.overhead.allocatedAmount,
              }
            : undefined,
        };
      });
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
      const bill = data.billNumber != null ? String(data.billNumber) : '';
      setMessage({
        type: 'success',
        text: data.insertedCount
          ? `Saved ${data.insertedCount} line(s)${bill ? ` — bill ${bill}` : ''}.`
          : 'Saved.',
      });
      onSuccess();
      handleClose();
    } catch {
      setMessage({ type: 'error', text: 'Network error.' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputClass =
    'w-full min-w-0 h-9 rounded border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500';

  return (
    <>
      <ModalContainer isOpen={isOpen} onClose={handleClose} contentClassName="max-w-[95vw] sm:max-w-6xl">
        <div className="flex flex-col max-h-[88vh] min-h-0">
          <div className="flex items-center justify-between shrink-0 border-b border-slate-200 bg-slate-50/80 px-6 py-4 rounded-t-xl">
            <h2 id="import-invoice-modal-title" className="text-lg font-semibold text-slate-900">
              Import invoice
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-4">
            {message && (
              <Notification type={message.type} text={message.text} onDismiss={() => setMessage(null)} />
            )}

            <input
              id="import-invoice-file-input"
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={parsing}
              className="sr-only"
              aria-label="Choose Excel or CSV file for import"
            />

            {/* Step 1: upload only (opening the modal) */}
            {rows.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
                <h3 className="text-base font-semibold text-slate-800 mb-2">Upload file</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Download the template or upload a CSV/Excel file with columns:{' '}
                  <strong>Product name, Product Code, Amount, Quantity</strong>. Optional columns{' '}
                  <strong>Bill no.</strong>, <strong>Price</strong> are still accepted. After the file loads, you will
                  choose hub and vendor, see a preview, then save.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="import-invoice-file-input"
                    className="inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">
                      <Upload className="w-4 h-4" />
                      {parsing ? 'Parsing...' : 'Upload Excel or CSV'}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    title="Download Excel template"
                  >
                    <Download className="w-4 h-4" />
                    Download template
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: after file parsed — hub & vendor, then preview & save */}
            {rows.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-slate-600">
                    <span className="font-medium text-slate-800">{rows.length}</span> line(s) loaded.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={parsing}
                      className="text-sm font-medium text-emerald-700 hover:text-emerald-800 underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      {parsing ? 'Parsing…' : 'Replace file'}
                    </button>
                    {resolving && (
                      <span className="text-sm text-slate-600">Resolving parent SKUs…</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 space-y-4">
                  <h3 className="text-base font-semibold text-slate-800">Import settings</h3>
                  <p className="text-sm text-slate-600">
                    Choose <strong>Hub</strong> and <strong>Vendor</strong> for this bill. Parent SKUs are resolved from
                    each row&apos;s product code and the hub you select. Bill numbers are assigned automatically (or use
                    the <strong>Bill no.</strong> column in the file when present).
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="block text-sm font-medium text-slate-700 mb-1">Hub</span>
                      <select
                        value={importHub}
                        onChange={(e) => setImportHub(e.target.value)}
                        className={inputClass}
                        aria-label="Hub"
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
                      <span className="block text-sm font-medium text-slate-700 mb-1">Vendor</span>
                      <select
                        value={importVendor}
                        onChange={(e) => setImportVendor(e.target.value)}
                        className={inputClass}
                        aria-label="Vendor"
                      >
                        <option value="">Select vendor</option>
                        {sellers.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.seller_name}
                            {s.vendorCode ? ` (${s.vendorCode})` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-slate-800">Preview</h3>
                  <p className="text-sm text-slate-600">
                    Defaults: parent-type → full qty in <strong>Listing</strong>; growing/consumable → full qty in{' '}
                    <strong>Growth</strong>. Split quantity across Listing, Revival, Growth, and Consumers as needed —
                    the four must <strong>sum to Qty</strong> for each row. Parent SKU appears when hub is set.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={openOverheadModal}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4" /> Add overhead
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left py-2 px-2 font-semibold text-slate-700">Bill no.</th>
                        <th className="text-left py-2 px-2 font-semibold text-slate-700">Product code</th>
                        <th className="text-left py-2 px-2 font-semibold text-slate-700">Product name</th>
                        <th className="text-left py-2 px-2 font-semibold text-slate-700">Qty</th>
                        <th className="text-left py-2 px-2 font-semibold text-slate-700">Price</th>
                        <th className="text-left py-2 px-2 font-semibold text-slate-700">Amount</th>
                        <th className="text-left py-2 px-2 font-semibold text-slate-700">Parent SKU</th>
                        <th className="text-center py-2 px-1 font-semibold text-slate-700 text-xs w-[72px]">Listing</th>
                        <th className="text-center py-2 px-1 font-semibold text-slate-700 text-xs w-[72px]">Revival</th>
                        <th className="text-center py-2 px-1 font-semibold text-slate-700 text-xs w-[72px]">Growth</th>
                        <th className="text-center py-2 px-1 font-semibold text-slate-700 text-xs w-[72px]">
                          Consumers
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => {
                        const hasError = !!row.resolveError;
                        const typeSum = sumTypeBreakdown(row.type);
                        const sumMismatch = !hasError && typeSum !== row.quantity;
                        const typeInputClass = `${inputClass} text-center px-1`;
                        const typeKeys: (keyof PurchaseTypeBreakdown)[] = [
                          'listing',
                          'revival',
                          'growth',
                          'consumers',
                        ];
                        return (
                          <Fragment key={i}>
                            <tr className={`border-b ${hasError ? 'bg-red-50 border-red-100' : 'border-slate-100'}`}>
                              <td className="py-1.5 px-2 text-slate-600">{row.billNumber || '—'}</td>
                              <td className="py-1.5 px-2 text-slate-600">{row.productCode}</td>
                              <td className="py-1.5 px-2 text-slate-600 truncate max-w-[120px]">{row.productName || '—'}</td>
                              <td className="py-1.5 px-2 text-slate-600">{row.quantity}</td>
                              <td className="py-1.5 px-2 text-slate-600">{row.productPrice}</td>
                              <td className="py-1.5 px-2 text-slate-600">{row.amount}</td>
                              <td className="py-1.5 px-2 min-w-[180px]">
                                {hasError ? (
                                  <div className="flex items-start gap-1">
                                    <svg className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-red-600 text-xs leading-snug">{row.resolveError}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-600 text-sm">
                                    {row.parentSku || (importHub ? (resolving ? '…' : '—') : 'Select hub')}
                                  </span>
                                )}
                              </td>
                              {typeKeys.map((key) => (
                                <td key={key} className="py-1.5 px-1 align-top">
                                  <input
                                    type="number"
                                    min={0}
                                    disabled={hasError}
                                    value={row.type?.[key] ?? ''}
                                    onChange={(e) => updateRowTypeField(i, key, e.target.value)}
                                    className={typeInputClass}
                                    aria-label={`${key} row ${i + 1}`}
                                  />
                                </td>
                              ))}
                            </tr>
                            {sumMismatch && (
                              <tr className="bg-amber-50/80 border-b border-amber-100">
                                <td colSpan={7} className="py-0" />
                                <td colSpan={4} className="py-0 pb-2 px-2 text-xs text-amber-800">
                                  Sum is {typeSum}; must equal Qty ({row.quantity}).
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {(() => {
                    const errorRows = rows.filter((r) => r.resolveError);
                    if (errorRows.length > 0) {
                      return (
                        <p className="text-sm text-red-600">
                          <strong>{errorRows.length}</strong> row{errorRows.length === 1 ? '' : 's'} in red — fix before saving.
                        </p>
                      );
                    }
                    if (!allRowsComplete) {
                      return (
                        <p className="text-sm text-amber-600">
                          Set <strong>Hub</strong> and <strong>Vendor</strong>, resolve parent SKUs, and make{' '}
                          <strong>Listing + Revival + Growth + Consumers = Qty</strong> on every row.
                          {incompleteRows > 0 && ` ${incompleteRows} row(s) incomplete.`}
                        </p>
                      );
                    }
                    return null;
                  })()}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !allRowsComplete || resolving}
                    className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save invoice'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </ModalContainer>

      <OverheadModal
        isOpen={overheadModalOpen}
        onClose={() => {
          setOverheadModalOpen(false);
          setManualTotalError(null);
        }}
        form={overheadForm}
        onChange={setOverheadForm}
        onApply={applyOverhead}
        saving={false}
        rowCount={rows.length}
        manualAmounts={manualAmounts}
        onManualAmountChange={(index, value) => {
          setManualAmounts((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
          });
        }}
        manualTotalError={manualTotalError}
        hideBillField
      />
    </>
  );
}
