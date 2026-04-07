'use client';

import { useState, useEffect } from 'react';
import { Notification } from '@/components/ui/Notification';
import {
  clearFormStorageOnReload,
  getPersistedForm,
  setPersistedForm,
  removePersistedForm,
} from '../../hooks/useFormPersistence';
import { CustomSelect } from '../../components/CustomSelect';

const FORM_STORAGE_KEY = 'listing_form_seller';

const PRODUCT_TYPE_OPTIONS = [
  { value: 'Product', label: 'Product' },
  { value: 'saplings', label: 'Saplings' },
  { value: 'consumables', label: 'Consumables' },
];

interface SellerFormState {
  seller_name: string;
  place: string;
  multiplicationFactor: string;
  productType: string;
  phoneNumber: string;
}

export function AddSellerForm() {
  const [seller_name, setSeller_name] = useState(() => {
    clearFormStorageOnReload(FORM_STORAGE_KEY);
    const saved = getPersistedForm<SellerFormState>(FORM_STORAGE_KEY);
    return saved?.seller_name ?? '';
  });
  const [place, setPlace] = useState(() => {
    const saved = getPersistedForm<SellerFormState>(FORM_STORAGE_KEY);
    return saved?.place ?? '';
  });
  const [multiplicationFactor, setMultiplicationFactor] = useState(() => {
    const saved = getPersistedForm<SellerFormState>(FORM_STORAGE_KEY);
    return saved?.multiplicationFactor ?? '';
  });
  const [productType, setProductType] = useState(() => {
    const saved = getPersistedForm<SellerFormState>(FORM_STORAGE_KEY);
    return saved?.productType ?? '';
  });
  const [phoneNumber, setPhoneNumber] = useState(() => {
    const saved = getPersistedForm<SellerFormState>(FORM_STORAGE_KEY);
    return saved?.phoneNumber ?? '';
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    setPersistedForm(FORM_STORAGE_KEY, {
      seller_name,
      place,
      multiplicationFactor,
      productType,
      phoneNumber,
    });
  }, [seller_name, place, multiplicationFactor, productType, phoneNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller_name.trim()) {
      setMessage({ type: 'error', text: 'Vendor name is required.' });
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
          productType: productType
            ? productType.split(',').map((s) => s.trim()).filter(Boolean)
            : undefined,
          phoneNumber: phoneNumber.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message ?? 'Failed to create seller' });
        setSaving(false);
        return;
      }
      removePersistedForm(FORM_STORAGE_KEY);
      setMessage({ type: 'success', text: 'Seller created successfully.' });
      setSeller_name('');
      setPlace('');
      setMultiplicationFactor('');
      setProductType('');
      setPhoneNumber('');
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full h-11 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-shadow';

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Add Vendor</h2>

      {message && (
        <Notification
          type={message.type}
          text={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <label className="block sm:col-span-2">
            <span className="block text-sm font-medium text-slate-700 mb-1.5">
              Vendor name
            </span>
            <input
              type="text"
              value={seller_name}
              onChange={(e) => setSeller_name(e.target.value)}
              className={inputClass}
              placeholder="Vendor name"
              required
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1.5">
              Vendor place
            </span>
            <input
              type="text"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className={inputClass}
              placeholder="Vendor place"
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
          <label className="block sm:col-span-2">
            <CustomSelect
              label="Product type"
              value={productType}
              onChange={setProductType}
              options={PRODUCT_TYPE_OPTIONS}
              placeholder="Select product types..."
              multiSelect
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

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed transition-all min-w-[120px]"
            style={{ backgroundColor: '#E6007A' }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              'Add Vendor'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
