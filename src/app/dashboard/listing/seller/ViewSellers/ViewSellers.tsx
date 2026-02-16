'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ProcurementSellerMaster } from '@/models/procurementSellerMaster';
import { Notification } from '@/components/ui/Notification';
import { SearchBar, ConfirmDialog } from '../../shared';
import { SellerTable } from './SellerTable';
import {
  EditSellerModal,
  type EditSellerForm,
} from './EditSellerModal';

const emptyForm: EditSellerForm = {
  seller_name: '',
  place: '',
  multiplicationFactor: '',
  billNo: '',
  phoneNumber: '',
};

function toEditForm(seller: ProcurementSellerMaster): EditSellerForm {
  return {
    seller_name: seller.seller_name ?? '',
    place: seller.place ?? '',
    multiplicationFactor:
      seller.multiplicationFactor != null
        ? String(seller.multiplicationFactor)
        : '',
    billNo: seller.billNo ?? '',
    phoneNumber: seller.phoneNumber ?? '',
  };
}

export function ViewSellers() {
  const [sellers, setSellers] = useState<ProcurementSellerMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [editing, setEditing] = useState<ProcurementSellerMaster | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] =
    useState<ProcurementSellerMaster | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState<EditSellerForm>(emptyForm);

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      params.set('limit', '500');
      const res = await fetch(
        `/api/procurement-seller-master?${params.toString()}`
      );
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        setSellers(json.data);
      } else {
        setMessage({ type: 'error', text: json?.message ?? 'Failed to load sellers' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load sellers' });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  useEffect(() => {
    if (editing === null) return;
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

  const filtered = sellers.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.seller_name ?? '').toLowerCase().includes(q) ||
      (s.place ?? '').toLowerCase().includes(q) ||
      (s.billNo ?? '').toLowerCase().includes(q) ||
      (s.phoneNumber ?? '').toLowerCase().includes(q)
    );
  });

  const openEdit = (seller: ProcurementSellerMaster) => {
    setEditing(seller);
    setEditForm(toEditForm(seller));
  };

  const handleSaveEdit = async () => {
    setMessage(null);
    setSaving(true);

    const payload = {
      seller_name: editForm.seller_name.trim(),
      place: editForm.place.trim() || undefined,
      multiplicationFactor:
        editForm.multiplicationFactor.trim() !== ''
          ? Number(editForm.multiplicationFactor)
          : undefined,
      billNo: editForm.billNo.trim() || undefined,
      phoneNumber: editForm.phoneNumber.trim() || undefined,
    };

    try {
      const seller = editing as ProcurementSellerMaster;
      const id = String(seller._id);
      const res = await fetch(`/api/procurement-seller-master/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message ?? 'Failed to update seller' });
        setSaving(false);
        return;
      }
      setMessage({ type: 'success', text: 'Seller updated successfully.' });
      setEditing(null);
      fetchSellers();
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
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
      const res = await fetch(`/api/procurement-seller-master/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message ?? 'Failed to delete seller' });
        setDeleting(false);
        return;
      }
      setMessage({ type: 'success', text: 'Seller deleted successfully.' });
      setDeleteConfirm(null);
      fetchSellers();
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">View Seller</h2>

      {message && (
        <Notification
          type={message.type}
          message={message.text}
          onClose={() => setMessage(null)}
        />
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <SearchBar
          value={search}
          onChange={setSearch}
          onSubmit={handleSearchSubmit}
          placeholder="Search by seller name, place, bill no., phone..."
          totalCount={filtered.length}
          entityName="Sellers"
        />

        {loading ? (
          <div className="py-12 text-center text-slate-500">
            Loading sellers...
          </div>
        ) : (
          <SellerTable
            sellers={filtered}
            onEdit={openEdit}
            onDelete={setDeleteConfirm}
          />
        )}
      </div>

      <EditSellerModal
        isOpen={editing !== null}
        title="Edit Seller"
        editForm={editForm}
        saving={saving}
        onClose={() => setEditing(null)}
        onSave={handleSaveEdit}
        onChange={setEditForm}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Seller"
        message={`Are you sure you want to delete "${deleteConfirm?.seller_name}"? This action cannot be undone.`}
        confirmLabel="Delete Seller"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        loading={deleting}
      />
    </div>
  );
}
