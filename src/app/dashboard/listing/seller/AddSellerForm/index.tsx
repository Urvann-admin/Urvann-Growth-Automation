'use client';

import { useState } from 'react';
import { Notification } from '@/components/ui/Notification';

export function AddSellerForm() {
  const [seller_name, setSeller_name] = useState('');
  const [place, setPlace] = useState('');
  const [multiplicationFactor, setMultiplicationFactor] = useState('');
  const [billNo, setBillNo] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller_name.trim()) {
      setMessage({ type: 'error', text: 'Seller name is required.' });
      return;
    }
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch('/api/procurement-seller-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_name: seller_name.trim(),
          place: place.trim() || undefined,
          multiplicationFactor:
            multiplicationFactor.trim() !== ''
              ? Number(multiplicationFactor)
              : undefined,
          billNo: billNo.trim() || undefined,
          phoneNumber: phoneNumber.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message ?? 'Failed to create seller' });
        setSaving(false);
        return;
      }
      setMessage({ type: 'success', text: 'Seller created successfully.' });
      setSeller_name('');
      setPlace('');
      setMultiplicationFactor('');
      setBillNo('');
      setPhoneNumber('');
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-shadow';

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Add Seller</h2>

      {message && (
        <Notification
          type={message.type}
          message={message.text}
          onClose={() => setMessage(null)}
        />
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block sm:col-span-2">
            <span className="block text-sm font-medium text-slate-700 mb-1.5">
              Seller name
            </span>
            <input
              type="text"
              value={seller_name}
              onChange={(e) => setSeller_name(e.target.value)}
              className={inputClass}
              placeholder="Seller name"
              required
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1.5">
              Place
            </span>
            <input
              type="text"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className={inputClass}
              placeholder="Place"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1.5">
              Multiplication factor
            </span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={multiplicationFactor}
              onChange={(e) => setMultiplicationFactor(e.target.value)}
              className={inputClass}
              placeholder="0"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1.5">
              Bill no.
            </span>
            <input
              type="text"
              value={billNo}
              onChange={(e) => setBillNo(e.target.value)}
              className={inputClass}
              placeholder="Bill number"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1.5">
              Phone number
            </span>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className={inputClass}
              placeholder="Phone number"
            />
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              'Add Seller'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
