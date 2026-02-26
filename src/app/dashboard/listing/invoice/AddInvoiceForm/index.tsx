'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Plus, Download } from 'lucide-react';
import { Notification } from '@/components/ui/Notification';
import {
  clearFormStorageOnReload,
  getPersistedForm,
  setPersistedForm,
  removePersistedForm,
} from '../../hooks/useFormPersistence';
import type { DraftPurchaseRow, ParentOption } from './types';
import { OverheadModal, type OverheadFormState } from './OverheadModal';

const FORM_STORAGE_KEY = 'listing_form_invoice';

const emptyOverheadForm: OverheadFormState = {
  overheadAmount: '',
  overheadNature: '',
  bill: '',
  allocationMethod: 'Equal',
};

function toDraftRow(parsed: Record<string, unknown>): DraftPurchaseRow {
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
    itemType: String(parsed.itemType ?? '').trim() || undefined,
    quantity,
    productPrice,
    amount,
    parentSku: String(parsed.parentSku ?? '').trim(),
    type: {
      listing:
        parsed.listing != null && parsed.listing !== ''
          ? Number(parsed.listing)
          : parsed.revival == null && parsed.growth == null && parsed.consumers == null
            ? quantity
            : undefined,
      revival: parsed.revival != null && parsed.revival !== '' ? Number(parsed.revival) : undefined,
      growth: parsed.growth != null && parsed.growth !== '' ? Number(parsed.growth) : undefined,
      consumers: parsed.consumers != null && parsed.consumers !== '' ? Number(parsed.consumers) : undefined,
    },
  };
}

interface PersistedInvoiceState {
  rows: DraftPurchaseRow[];
  overheadForm: OverheadFormState;
  manualAmounts: number[];
}

export interface AddInvoiceFormProps {
  onSuccess?: () => void;
  onClose?: () => void;
  /** When true, hide the page title (e.g. when embedded in a modal) */
  embedded?: boolean;
}

export function AddInvoiceForm({ onSuccess, onClose, embedded }: AddInvoiceFormProps = {}) {
  const [rows, setRows] = useState<DraftPurchaseRow[]>(() => {
    clearFormStorageOnReload(FORM_STORAGE_KEY);
    const saved = getPersistedForm<PersistedInvoiceState>(FORM_STORAGE_KEY);
    return saved?.rows ?? [];
  });
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [overheadModalOpen, setOverheadModalOpen] = useState(false);
  const [overheadForm, setOverheadForm] = useState<OverheadFormState>(() => {
    const saved = getPersistedForm<PersistedInvoiceState>(FORM_STORAGE_KEY);
    return saved?.overheadForm ?? emptyOverheadForm;
  });
  const [manualAmounts, setManualAmounts] = useState<number[]>(() => {
    const saved = getPersistedForm<PersistedInvoiceState>(FORM_STORAGE_KEY);
    if (saved?.manualAmounts && saved.manualAmounts.length === (saved.rows?.length ?? 0))
      return saved.manualAmounts;
    return saved?.rows?.length ? saved.rows.map(() => 0) : [];
  });
  const [manualTotalError, setManualTotalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPersistedForm(FORM_STORAGE_KEY, { rows, overheadForm, manualAmounts });
  }, [rows, overheadForm, manualAmounts]);

  const fetchParents = useCallback(async () => {
    try {
      const res = await fetch('/api/parent-master?limit=500');
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        setParents(json.data.filter((p: ParentOption) => p.sku && String(p.sku).trim()));
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load parent SKUs' });
    }
  }, []);

  useEffect(() => {
    fetchParents();
  }, [fetchParents]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls') {
      setMessage({ type: 'error', text: 'Please upload an Excel file (.xlsx or .xls)' });
      return;
    }
    setMessage(null);
    setParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/purchase-master/parse-excel', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message ?? 'Failed to parse file' });
        setParsing(false);
        return;
      }
      const parsedRows = (data.rows ?? []).map(toDraftRow);
      setRows(parsedRows);
      setManualAmounts(parsedRows.map(() => 0));
      setMessage({ type: 'success', text: `Parsed ${parsedRows.length} row(s). Review and add overhead if needed, then submit.` });
    } catch {
      setMessage({ type: 'error', text: 'Failed to parse file' });
    } finally {
      setParsing(false);
      e.target.value = '';
    }
  };

  const updateRow = (index: number, patch: Partial<DraftPurchaseRow>) => {
    setRows((prev) => {
      const next = [...prev];
      const current = next[index];
      const merged = { ...current, ...patch };
      if (patch.quantity !== undefined) {
        const t = merged.type ?? {};
        const hasAnyType =
          (t.listing ?? 0) > 0 || (t.revival ?? 0) > 0 || (t.growth ?? 0) > 0 || (t.consumers ?? 0) > 0;
        if (!hasAnyType) {
          merged.type = { ...t, listing: merged.quantity };
        }
      }
      next[index] = merged;
      return next;
    });
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
      const tolerance = 0.01;
      if (Math.abs(sum - overheadAmount) > tolerance) {
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
      setMessage({ type: 'error', text: 'Add at least one line (manual form or upload Excel) first.' });
      return;
    }
    setManualAmounts(rows.map(() => 0));
    setManualTotalError(null);
    setOverheadModalOpen(true);
  };

  const downloadBillTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
      const headers = [
        'Bill no.',
        'Product Code',
        'Product Name',
        'Quantity',
        'Price',
        'Amount',
      ];
      const ws = XLSX.utils.aoa_to_sheet([headers]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Bill');
      XLSX.writeFile(wb, 'purchase-bill-template.xlsx');
    } catch {
      setMessage({ type: 'error', text: 'Failed to generate template.' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rows.length === 0) {
      setMessage({ type: 'error', text: 'No rows to submit. Add lines manually or upload an Excel file first.' });
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
      setMessage({ type: 'error', text: 'Fix all rows: bill number, product code, parent SKU, quantity and amount are required.' });
      return;
    }

    const typeMismatchIndex = rows.findIndex((r) => {
      const listing = Number(r.type?.listing ?? 0) || 0;
      const revival = Number(r.type?.revival ?? 0) || 0;
      const growth = Number(r.type?.growth ?? 0) || 0;
      const consumers = Number(r.type?.consumers ?? 0) || 0;
      return listing + revival + growth + consumers !== r.quantity;
    });
    if (typeMismatchIndex !== -1) {
      setMessage({ type: 'error', text: `Row ${typeMismatchIndex + 1}: Type split must equal Quantity.` });
      return;
    }

    setMessage(null);
    setSaving(true);
    try {
      const payload = rows.map((r) => {
        const quantity = r.quantity;
        const amount = r.amount;
        const productPrice = quantity > 0 ? Math.round(amount / quantity) : 0;
        return {
          billNumber: r.billNumber,
          productCode: r.productCode,
          productName: r.productName?.trim() || undefined,
          itemType: r.itemType?.trim() || undefined,
          quantity,
          productPrice,
          amount,
          parentSku: r.parentSku,
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
      removePersistedForm(FORM_STORAGE_KEY);
      setMessage({
        type: 'success',
        text: data.insertedCount
          ? `Saved ${data.insertedCount} purchase record(s).`
          : 'Invoice recorded successfully.',
      });
      setRows([]);
      onSuccess?.();
      onClose?.();
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full min-w-0 h-9 rounded border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500';

  return (
    <div className="space-y-6">
      {!embedded && (
        <h2 className="text-xl font-semibold text-slate-900">Add Invoice</h2>
      )}

      {message && (
        <Notification type={message.type} text={message.text} onDismiss={() => setMessage(null)} />
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={parsing}
              className="sr-only"
              ref={fileInputRef}
            />
            <span className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200">
              <Upload className="w-4 h-4" />
              {parsing ? 'Parsing...' : 'Upload Excel (bill)'}
            </span>
          </label>
          <button
            type="button"
            onClick={downloadBillTemplate}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 border border-slate-200"
          >
            <Download className="w-4 h-4" />
            Download Excel template
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-2 font-semibold text-slate-700">Bill no.</th>
                    <th className="text-left py-2 px-2 font-semibold text-slate-700">Product code</th>
                    <th className="text-left py-2 px-2 font-semibold text-slate-700">Product name</th>
                    <th className="text-left py-2 px-2 font-semibold text-slate-700">Item Type</th>
                    <th className="text-left py-2 px-2 font-semibold text-slate-700">Qty</th>
                    <th className="text-left py-2 px-2 font-semibold text-slate-700">Amount</th>
                    <th className="text-left py-2 px-2 font-semibold text-slate-700">Price (amt ÷ qty)</th>
                    <th className="text-left py-2 px-2 font-semibold text-slate-700">Parent SKU</th>
                    <th className="text-left py-2 px-2 font-semibold text-slate-700">Listing</th>
                    <th className="text-left py-2 px-2 font-semibold text-slate-700">Revival</th>
                    <th className="text-left py-2 px-2 font-semibold text-slate-700">Growth</th>
                    <th className="text-left py-2 px-2 font-semibold text-slate-700">Consumers</th>
                    <th className="text-left py-2 px-2 font-semibold text-slate-700">Alloc.</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-1 px-2">
                        <input
                          type="text"
                          value={row.billNumber}
                          onChange={(e) => updateRow(i, { billNumber: e.target.value })}
                          className={inputClass}
                        />
                      </td>
                      <td className="py-1 px-2">
                        <input
                          type="text"
                          value={row.productCode}
                          onChange={(e) => updateRow(i, { productCode: e.target.value })}
                          className={inputClass}
                        />
                      </td>
                      <td className="py-1 px-2">
                        <input
                          type="text"
                          value={row.productName}
                          onChange={(e) => updateRow(i, { productName: e.target.value })}
                          className={inputClass}
                          placeholder="Product name"
                        />
                      </td>
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
                      <td className="py-1 px-2">
                        <input
                          type="number"
                          min={0}
                          value={row.quantity}
                          onChange={(e) =>
                            updateRow(i, { quantity: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                          }
                          className={inputClass}
                        />
                      </td>
                      <td className="py-1 px-2">
                        <input
                          type="number"
                          min={0}
                          value={row.amount}
                          onChange={(e) =>
                            updateRow(i, { amount: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                          }
                          className={inputClass}
                        />
                      </td>
                      <td className="py-1 px-2 text-slate-600 text-xs">
                        {row.quantity > 0 ? Math.round(row.amount / row.quantity) : '—'}
                      </td>
                      <td className="py-1 px-2 min-w-[120px]">
                        <select
                          value={row.parentSku}
                          onChange={(e) => updateRow(i, { parentSku: e.target.value })}
                          className={inputClass}
                        >
                          <option value="">Select</option>
                          {parents.map((p) => (
                            <option key={p._id} value={p.sku ?? p._id}>
                              {p.plant} {p.sku ? `(${p.sku})` : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1 px-2">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={row.type.listing ?? ''}
                          onChange={(e) =>
                            updateRow(i, {
                              type: {
                                ...row.type,
                                listing: e.target.value !== '' ? Number(e.target.value) : undefined,
                              },
                            })
                          }
                          className={inputClass}
                          placeholder="-"
                        />
                      </td>
                      <td className="py-1 px-2">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={row.type.revival ?? ''}
                          onChange={(e) =>
                            updateRow(i, {
                              type: {
                                ...row.type,
                                revival: e.target.value !== '' ? Number(e.target.value) : undefined,
                              },
                            })
                          }
                          className={inputClass}
                          placeholder="-"
                        />
                      </td>
                      <td className="py-1 px-2">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={row.type.growth ?? ''}
                          onChange={(e) =>
                            updateRow(i, {
                              type: {
                                ...row.type,
                                growth: e.target.value !== '' ? Number(e.target.value) : undefined,
                              },
                            })
                          }
                          className={inputClass}
                          placeholder="-"
                        />
                      </td>
                      <td className="py-1 px-2">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={row.type.consumers ?? ''}
                          onChange={(e) =>
                            updateRow(i, {
                              type: {
                                ...row.type,
                                consumers: e.target.value !== '' ? Number(e.target.value) : undefined,
                              },
                            })
                          }
                          className={inputClass}
                          placeholder="-"
                        />
                      </td>
                      <td className="py-1 px-2 text-slate-600 text-xs">
                        {row.overhead != null
                          ? `${row.overhead.allocatedAmount} (${row.overhead.allocationMethod})`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save invoice'}
              </button>
            </div>
          </form>
        )}

        {rows.length === 0 && !parsing && (
          <p className="text-sm text-slate-500 py-4 mt-4">
            Upload an Excel file (.xlsx or .xls) with columns:{' '}
            <strong>Bill no., Product Code, Product Name, Quantity, Price, Amount</strong>. Then choose item type, parent, and type in the table, add overhead (optional), and save.
          </p>
        )}
      </div>

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
      />
    </div>
  );
}
