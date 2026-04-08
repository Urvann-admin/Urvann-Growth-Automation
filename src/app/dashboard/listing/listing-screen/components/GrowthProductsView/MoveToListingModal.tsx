'use client';

import { useState, useEffect } from 'react';

export interface GrowthProduct {
  parentSku: string;
  productCode: string;
  productName?: string;
  finalName?: string;
  plant?: string;
  quantity: number;
  price: number;
  amount: number;
  normalizedFactor?: number;
  invoiceDate?: string;
}

export interface MoveToListingModalProps {
  product: GrowthProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MoveToListingModal({
  product,
  isOpen,
  onClose,
  onSuccess,
}: MoveToListingModalProps) {
  const [quantityToMove, setQuantityToMove] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const maxQty = product?.quantity ?? 0;

  useEffect(() => {
    if (isOpen && product) {
      setQuantityToMove(String(maxQty));
      setError('');
    }
  }, [isOpen, product, maxQty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    const qty = parseInt(quantityToMove, 10);
    if (!Number.isInteger(qty) || qty <= 0) {
      setError('Please enter a valid positive quantity');
      return;
    }
    if (qty > maxQty) {
      setError(`Maximum ${maxQty} units available`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/growth-products/move-to-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentSku: product.parentSku,
          quantityToMove: qty,
        }),
      });

      const result = await res.json();

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.message || 'Failed to move to listing');
      }
    } catch (err) {
      setError('Failed to move to listing');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const displayName =
    product?.productName ||
    (product?.productCode ? String(product.productCode).trim() : '') ||
    product?.finalName ||
    product?.plant ||
    product?.parentSku ||
    'Product';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-xl shadow-lg border border-slate-200 p-6 w-full max-w-md mx-4">
        <h3 className="text-base font-semibold text-slate-900 mb-1">
          Move to Listing
        </h3>
        <p className="text-xs text-slate-600 mb-4">
          {displayName}
        </p>
        <p className="text-xs text-slate-500 mb-3">
          Available in growth: <span className="font-medium text-slate-700">{maxQty}</span> units
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="quantity" className="block text-xs font-medium text-slate-700 mb-1.5">
              Quantity to move
            </label>
            <input
              id="quantity"
              type="number"
              min={1}
              max={maxQty}
              value={quantityToMove}
              onChange={(e) => setQuantityToMove(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 mb-3">{error}</p>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-1.5 text-xs font-medium text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#E6007A' }}
            >
              {submitting ? 'Moving...' : 'Move to Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
