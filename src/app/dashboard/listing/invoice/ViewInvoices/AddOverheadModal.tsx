'use client';

import { useState, useEffect } from 'react';
import { ModalContainer, ModalHeader, ModalFooter, ModalSection } from '../../shared';
import { Notification } from '@/components/ui/Notification';
import type { PurchaseMaster } from '@/models/purchaseMaster';

type AllocationMethod = 'Equal' | 'quantity' | 'value';

interface AddOverheadModalProps {
  isOpen: boolean;
  purchases: PurchaseMaster[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AddOverheadModal({ isOpen, purchases, onClose, onSuccess }: AddOverheadModalProps) {
  const [selectedBill, setSelectedBill] = useState('');
  const [overheadAmount, setOverheadAmount] = useState('');
  const [overheadNature, setOverheadNature] = useState('');
  const [billRef, setBillRef] = useState('');
  const [allocationMethod, setAllocationMethod] = useState<AllocationMethod>('Equal');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const billNumbers = Array.from(
    new Set(purchases.map((p) => (p.billNumber ?? '').trim()).filter(Boolean))
  ).sort();

  const rowsForBill = selectedBill
    ? purchases.filter((p) => (p.billNumber ?? '').trim() === selectedBill)
    : [];

  useEffect(() => {
    if (isOpen) {
      setSelectedBill('');
      setOverheadAmount('');
      setOverheadNature('');
      setBillRef('');
      setAllocationMethod('Equal');
      setMessage(null);
    }
  }, [isOpen]);

  const handleApply = async () => {
    setMessage(null);
    const amount = Number(overheadAmount);
    if (!selectedBill) {
      setMessage({ type: 'error', text: 'Select a bill number.' });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Enter a valid overhead amount.' });
      return;
    }
    if (rowsForBill.length === 0) {
      setMessage({ type: 'error', text: 'No lines found for this bill.' });
      return;
    }

    let allocatedPerRow: number[];
    if (allocationMethod === 'Equal') {
      allocatedPerRow = rowsForBill.map(() => Math.round((amount / rowsForBill.length) * 100) / 100);
    } else if (allocationMethod === 'quantity') {
      const totalQ = rowsForBill.reduce((s, r) => s + (r.quantity ?? 0), 0);
      if (totalQ === 0) {
        setMessage({ type: 'error', text: 'Total quantity is 0; cannot allocate by quantity.' });
        return;
      }
      allocatedPerRow = rowsForBill.map((r) =>
        Math.round((amount * ((r.quantity ?? 0) / totalQ)) * 100) / 100
      );
    } else {
      const totalAmt = rowsForBill.reduce((s, r) => s + (r.amount ?? 0), 0);
      if (totalAmt === 0) {
        setMessage({ type: 'error', text: 'Total amount is 0; cannot allocate by value.' });
        return;
      }
      allocatedPerRow = rowsForBill.map((r) =>
        Math.round((amount * ((r.amount ?? 0) / totalAmt)) * 100) / 100
      );
    }

    setSaving(true);
    try {
      for (let i = 0; i < rowsForBill.length; i++) {
        const p = rowsForBill[i];
        if (!p._id) continue;
        const res = await fetch(`/api/purchase-master/${p._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            overhead: {
              overheadAmount: amount,
              overheadNature: overheadNature.trim() || undefined,
              bill: billRef.trim() || undefined,
              allocationMethod,
              allocatedAmount: allocatedPerRow[i],
            },
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message ?? 'Failed to update');
        }
      }
      setMessage({ type: 'success', text: `Overhead applied to ${rowsForBill.length} line(s).` });
      onSuccess();
      onClose();
    } catch (e) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Failed to apply overhead',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputClass =
    'w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500';

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Add Overhead" onClose={onClose} />

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6 space-y-6">
          {message && (
            <Notification type={message.type} text={message.text} onDismiss={() => setMessage(null)} />
          )}

          <ModalSection title="Overhead details">
            <div className="space-y-4">
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Bill number</span>
                <select
                  value={selectedBill}
                  onChange={(e) => setSelectedBill(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select bill</option>
                  {billNumbers.map((bill) => (
                    <option key={bill} value={bill}>
                      {bill}
                    </option>
                  ))}
                </select>
                {selectedBill && rowsForBill.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">{rowsForBill.length} line(s) in this bill</p>
                )}
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Overhead amount</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={overheadAmount}
                  onChange={(e) => setOverheadAmount(e.target.value)}
                  className={inputClass}
                  placeholder="Total overhead for this bill"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Overhead nature</span>
                <input
                  type="text"
                  value={overheadNature}
                  onChange={(e) => setOverheadNature(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Freight"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Bill reference</span>
                <input
                  type="text"
                  value={billRef}
                  onChange={(e) => setBillRef(e.target.value)}
                  className={inputClass}
                  placeholder="Optional"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Allocation</span>
                <select
                  value={allocationMethod}
                  onChange={(e) => setAllocationMethod(e.target.value as AllocationMethod)}
                  className={inputClass}
                >
                  <option value="Equal">Equal (split equally across lines)</option>
                  <option value="quantity">By quantity (proportional to quantity)</option>
                  <option value="value">By value (proportional to amount)</option>
                </select>
              </label>
            </div>
          </ModalSection>
        </div>
      </div>

      <ModalFooter
        onCancel={onClose}
        onSave={handleApply}
        saving={saving}
        saveLabel="Apply overhead"
        cancelLabel="Cancel"
      />
    </ModalContainer>
  );
}
