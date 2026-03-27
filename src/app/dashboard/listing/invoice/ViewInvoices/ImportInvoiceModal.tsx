'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Plus, Download } from 'lucide-react';
import { ModalContainer } from '../../shared';
import { Notification } from '@/components/ui/Notification';
import type { DraftPurchaseRow } from '../AddInvoiceForm/types';
import type { PurchaseTypeBreakdown } from '@/models/purchaseMaster';
import { OverheadModal, type OverheadFormState } from '../AddInvoiceForm/OverheadModal';

const TYPE_OPTIONS: { value: '' | keyof PurchaseTypeBreakdown; label: string }[] = [
  { value: '', label: 'Select product type breakdown' },
  { value: 'listing', label: 'Listing' },
  { value: 'revival', label: 'Revival' },
  { value: 'growth', label: 'Growth' },
  { value: 'consumers', label: 'Consumers' },
];

function typeDropdownToBreakdown(value: '' | keyof PurchaseTypeBreakdown, quantity: number): PurchaseTypeBreakdown {
  if (!value) return {};
  return { [value]: quantity };
}

function typeBreakdownToSlug(t: PurchaseTypeBreakdown | undefined): '' | keyof PurchaseTypeBreakdown {
  if (!t) return '';
  const has = (v: number | undefined) => v != null && Number(v) > 0;
  if (has(t.listing)) return 'listing';
  if (has(t.revival)) return 'revival';
  if (has(t.growth)) return 'growth';
  if (has(t.consumers)) return 'consumers';
  return '';
}

const emptyOverheadForm: OverheadFormState = {
  overheadAmount: '',
  overheadNature: '',
  bill: '',
  allocationMethod: 'Equal',
};

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
  const parentSku = parsed.parentSku != null ? String(parsed.parentSku).trim() : '';
  const sellerRaw = parsed.seller != null ? String(parsed.seller).trim() : '';
  return {
    billNumber: String(parsed.billNumber ?? '').trim(),
    productCode: String(parsed.productCode ?? '').trim(),
    productName: String(parsed.productName ?? '').trim(),
    quantity,
    productPrice,
    amount,
    parentSku,
    seller: sellerRaw || undefined,
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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [overheadModalOpen, setOverheadModalOpen] = useState(false);
  const [overheadForm, setOverheadForm] = useState<OverheadFormState>(emptyOverheadForm);
  const [manualAmounts, setManualAmounts] = useState<number[]>([]);
  const [manualTotalError, setManualTotalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleClose = useCallback(() => {
    setRows([]);
    setMessage(null);
    onClose();
  }, [onClose]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const XLSX = await import('xlsx');
      const headers = [
        'Bill no.',
        'Product Code',
        'Product name',
        'Product quantity',
        'Price',
        'Amount',
        'Parent',
        'Seller',
      ];
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
      setMessage({
        type: 'success',
        text: `Parsed ${parsedRows.length} row(s). Choose product type breakdown and seller per line, then save.`,
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
    const billFromFile = rows[0]?.billNumber?.trim() ?? '';
    setOverheadForm((prev) => ({ ...prev, bill: billFromFile }));
    setOverheadModalOpen(true);
  };

  const rowReadyForSave = useCallback((r: DraftPurchaseRow) => {
    const hasSeller = !!r.seller?.trim();
    const t = r.type;
    const hasType =
      !!t &&
      (Number(t.listing ?? 0) > 0 ||
        Number(t.revival ?? 0) > 0 ||
        Number(t.growth ?? 0) > 0 ||
        Number(t.consumers ?? 0) > 0);
    return hasSeller && hasType;
  }, []);

  const allRowsComplete = rows.length > 0 && rows.every(rowReadyForSave);
  const incompleteRows = rows.filter((r) => !rowReadyForSave(r)).length;

  const handleSave = async () => {
    if (rows.length === 0) {
      setMessage({ type: 'error', text: 'Upload a file first.' });
      return;
    }
    if (!allRowsComplete) {
      setMessage({
        type: 'error',
        text: `Select product type breakdown and seller for every line before saving. ${incompleteRows} row(s) incomplete.`,
      });
      return;
    }
    const invalid = rows.find(
      (r) =>
        !r.billNumber.trim() ||
        !r.productCode.trim() ||
        !r.parentSku.trim() ||
        r.quantity < 0 ||
        r.amount < 0
    );
    if (invalid) {
      setMessage({ type: 'error', text: 'Each row must have Bill no., Product code, and Parent from the file.' });
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
          billNumber: r.billNumber,
          productCode: r.productCode,
          productName: r.productName?.trim() || undefined,
          quantity,
          productPrice,
          amount,
          parentSku: r.parentSku,
          ...(r.seller?.trim() && { seller: r.seller.trim() }),
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
      setMessage({
        type: 'success',
        text: data.insertedCount ? `Saved ${data.insertedCount} purchase record(s).` : 'Saved.',
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

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
              <h3 className="text-base font-semibold text-slate-800 mb-2">Upload file</h3>
              <p className="text-sm text-slate-600 mb-4">
                Download the template or upload a CSV/Excel file with columns:{' '}
                <strong>
                  Bill no., Product Code, Product name, Product quantity, Price, Amount, Parent, Seller
                </strong>
                . Use procurement <strong>seller name</strong>, <strong>vendor code</strong>, or <strong>Mongo _id</strong>. After upload, set{' '}
                <strong>Product type breakdown</strong> and <strong>Seller</strong> for each row if not in the file.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    disabled={parsing}
                    className="sr-only"
                    ref={fileInputRef}
                  />
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

            {rows.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={openOverheadModal}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4" /> Add overhead
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-2 font-semibold text-slate-700">Bill no.</th>
                        <th className="text-left py-2 px-2 font-semibold text-slate-700">Product code</th>
                        <th className="text-left py-2 px-2 font-semibold text-slate-700">Product name</th>
                        <th className="text-left py-2 px-2 font-semibold text-slate-700">Qty</th>
                        <th className="text-left py-2 px-2 font-semibold text-slate-700">Price</th>
                        <th className="text-left py-2 px-2 font-semibold text-slate-700">Amount</th>
                        <th className="text-left py-2 px-2 font-semibold text-slate-700">Parent</th>
                        <th className="text-left py-2 px-2 font-semibold text-slate-700 min-w-[140px]">
                          Product type breakdown
                        </th>
                        <th className="text-left py-2 px-2 font-semibold text-slate-700 min-w-[160px]">Seller</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="py-1 px-2 text-slate-600">{row.billNumber}</td>
                          <td className="py-1 px-2 text-slate-600">{row.productCode}</td>
                          <td className="py-1 px-2 text-slate-600 truncate max-w-[120px]">{row.productName || '—'}</td>
                          <td className="py-1 px-2 text-slate-600">{row.quantity}</td>
                          <td className="py-1 px-2 text-slate-600">{row.productPrice}</td>
                          <td className="py-1 px-2 text-slate-600">{row.amount}</td>
                          <td className="py-1 px-2 text-slate-600 min-w-[100px]">{row.parentSku || '—'}</td>
                          <td className="py-1 px-2 min-w-[140px]">
                            <select
                              value={typeBreakdownToSlug(row.type)}
                              onChange={(e) => {
                                const v = e.target.value as '' | keyof PurchaseTypeBreakdown;
                                updateRow(i, { type: typeDropdownToBreakdown(v, row.quantity) });
                              }}
                              className={inputClass}
                              aria-label={`Product type breakdown row ${i + 1}`}
                            >
                              {TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value || 'empty'} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1 px-2 min-w-[160px]">
                            <select
                              value={row.seller ?? ''}
                              onChange={(e) => updateRow(i, { seller: e.target.value || undefined })}
                              className={inputClass}
                              aria-label={`Seller row ${i + 1}`}
                            >
                              <option value="">Select seller</option>
                              {row.seller &&
                                !sellers.some((s) => s._id === row.seller) && (
                                  <option value={row.seller}>{row.seller} (from file)</option>
                                )}
                              {sellers.map((s) => (
                                <option key={s._id} value={s._id}>
                                  {s.seller_name}
                                  {s.vendorCode ? ` (${s.vendorCode})` : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {!allRowsComplete && (
                    <p className="text-sm text-amber-600">
                      Select <strong>Product type breakdown</strong> and <strong>Seller</strong> for every row to enable Save.
                      {incompleteRows > 0 && ` ${incompleteRows} row(s) incomplete.`}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !allRowsComplete}
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
