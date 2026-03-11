'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, Plus, Download } from 'lucide-react';
import { ModalContainer } from '../../shared';
import { Notification } from '@/components/ui/Notification';
import { HUB_MAPPINGS } from '@/shared/constants/hubs';
import type { DraftPurchaseRow } from '../AddInvoiceForm/types';
import type { PurchaseTypeBreakdown } from '@/models/purchaseMaster';
import { OverheadModal, type OverheadFormState } from '../AddInvoiceForm/OverheadModal';

const TYPE_OPTIONS: { value: '' | keyof PurchaseTypeBreakdown; label: string }[] = [
  { value: '', label: 'Select' },
  { value: 'listing', label: 'Listing' },
  { value: 'revival', label: 'Revival' },
  { value: 'growth', label: 'Growth' },
  { value: 'consumers', label: 'Consumers' },
];

function typeDropdownToBreakdown(value: '' | keyof PurchaseTypeBreakdown): PurchaseTypeBreakdown {
  if (!value) return {};
  return { [value]: 1 };
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
  return {
    billNumber: String(parsed.billNumber ?? '').trim(),
    productCode: String(parsed.productCode ?? '').trim(),
    productName: String(parsed.productName ?? '').trim(),
    itemType: undefined,
    quantity,
    productPrice,
    amount,
    parentSku,
    hub: undefined,
    type: {},
  };
}

interface ImportInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportInvoiceModal({ isOpen, onClose, onSuccess }: ImportInvoiceModalProps) {
  const [rows, setRows] = useState<DraftPurchaseRow[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [overheadModalOpen, setOverheadModalOpen] = useState(false);
  const [overheadForm, setOverheadForm] = useState<OverheadFormState>(emptyOverheadForm);
  const [manualAmounts, setManualAmounts] = useState<number[]>([]);
  const [manualTotalError, setManualTotalError] = useState<string | null>(null);
  const [typeDropdownValues, setTypeDropdownValues] = useState<('' | keyof PurchaseTypeBreakdown)[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const XLSX = await import('xlsx');
      const headers = [
        'Bill no.',
        'Product Code',
        'Product name',
        'Quantity',
        'Price',
        'Amount',
        'Parent',
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

  const setTypeForRow = useCallback((index: number, value: '' | keyof PurchaseTypeBreakdown) => {
    setTypeDropdownValues((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], type: typeDropdownToBreakdown(value) };
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
      setTypeDropdownValues(parsedRows.map(() => ''));
      setManualAmounts(parsedRows.map(() => 0));
      setMessage({ type: 'success', text: `Parsed ${parsedRows.length} row(s). Choose item type, parent, and type for each line, then save.` });
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

  const handleSave = async () => {
    if (rows.length === 0) {
      setMessage({ type: 'error', text: 'Upload a file first.' });
      return;
    }
    const invalid = rows.find(
      (r) =>
        !r.billNumber.trim() ||
        !r.productCode.trim() ||
        !r.parentSku.trim() ||
        !r.hub?.trim() ||
        r.quantity < 0 ||
        r.amount < 0
    );
    if (invalid) {
      setMessage({ type: 'error', text: 'Excel must include Parent. After upload, select Hub and set item type and type for all rows.' });
      return;
    }
    setMessage(null);
    setSaving(true);
    try {
      const payload = rows.map((r) => {
        const quantity = r.quantity;
        const amount = r.amount;
        const productPrice = quantity > 0 ? Math.round(amount / quantity) : r.productPrice ?? 0;
        return {
          billNumber: r.billNumber,
          productCode: r.productCode,
          productName: r.productName?.trim() || undefined,
          itemType: r.itemType?.trim() || undefined,
          quantity,
          productPrice,
          amount,
          parentSku: r.parentSku,
          ...(r.hub?.trim() && { hub: r.hub.trim() }),
          type: r.type,
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
      onClose();
      setRows([]);
      setTypeDropdownValues([]);
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
      <ModalContainer isOpen={isOpen} onClose={onClose} contentClassName="max-w-[95vw] sm:max-w-6xl">
        <div className="flex flex-col max-h-[88vh] min-h-0">
          <div className="flex items-center justify-between shrink-0 border-b border-slate-200 bg-slate-50/80 px-6 py-4 rounded-t-xl">
            <h2 id="import-invoice-modal-title" className="text-lg font-semibold text-slate-900">
              Import Invoice
            </h2>
            <button
              type="button"
              onClick={onClose}
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
            <p className="text-sm text-slate-600">
              Upload an Excel or CSV file with Parent column. After upload, set Hub, overhead (optional), item type, and type for each row, then Save.
            </p>
            <p className="text-xs text-slate-500">
              Excel columns: <strong>Bill no., Product Code, Product name (optional), Quantity, Price, Amount, Parent (or Parent SKU)</strong>. Select Hub from dropdown after upload.
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
                <span className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200">
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
              <button
                type="button"
                onClick={openOverheadModal}
                disabled={rows.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" /> Add overhead
              </button>
            </div>

            {rows.length > 0 && (
              <>
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
                        <th className="text-left py-2 px-2 font-semibold text-slate-700">Item Type</th>
                        <th className="text-left py-2 px-2 font-semibold text-slate-700">Parent</th>
                        <th className="text-left py-2 px-2 font-semibold text-slate-700">Hub</th>
                        <th className="text-left py-2 px-2 font-semibold text-slate-700">Type</th>
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
                          <td className="py-1 px-2 min-w-[100px]">
                            <select
                              value={row.itemType ?? ''}
                              onChange={(e) => updateRow(i, { itemType: e.target.value || undefined })}
                              className={inputClass}
                            >
                              <option value="">Select</option>
                              <option value="Product">Product</option>
                              <option value="Consumable">Consumable</option>
                            </select>
                          </td>
                          <td className="py-1 px-2 text-slate-600 min-w-[100px]">{row.parentSku || '—'}</td>
                          <td className="py-1 px-2 min-w-[100px]">
                            <select
                              value={row.hub ?? ''}
                              onChange={(e) => updateRow(i, { hub: e.target.value || undefined })}
                              className={inputClass}
                            >
                              <option value="">Select</option>
                              {HUB_MAPPINGS.map((m) => (
                                <option key={m.hub} value={m.hub}>
                                  {m.hub}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1 px-2 min-w-[100px]">
                            <select
                              value={typeDropdownValues[i] ?? ''}
                              onChange={(e) => setTypeForRow(i, e.target.value as '' | keyof PurchaseTypeBreakdown)}
                              className={inputClass}
                            >
                              {TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value || 'empty'} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
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
