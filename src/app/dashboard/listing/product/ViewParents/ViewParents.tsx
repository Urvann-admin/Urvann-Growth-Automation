'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ParentMaster } from '@/models/parentMaster';
import type { Category } from '@/models/category';
import type { SellerMaster } from '@/models/sellerMaster';
import { Notification } from '@/components/ui/Notification';
import { SearchBar, Pagination, ConfirmDialog } from '../../shared';
import { ParentTable } from './ParentTable';
import { EditParentModal } from './EditParentModal';

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface EditParentForm {
  plant: string;
  otherNames: string;
  variety: string;
  colour: string;
  height: number | '';
  mossStick: string;
  size: number | '';
  type: string;
  seller: string;
  sort_order: number | '';
  categories: string[];
  price: number | '';
  compare_price: number | '';
  publish: string;
  inventoryQuantity: number | '';
  inventory_management: string;
  inventory_management_level: string;
  inventory_allow_out_of_stock: number | '';
  images: string[];
  hub: string;
}

export function ViewParents() {
  const [items, setItems] = useState<ParentMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [editing, setEditing] = useState<ParentMaster | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditParentForm | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sellers, setSellers] = useState<SellerMaster[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<ParentMaster | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) setCategories(json.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/sellers')
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) setSellers(json.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (editing) fetchCategories();
  }, [editing, fetchCategories]);

  useEffect(() => {
    if (!editing) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditing(null);
        setEditForm(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [editing]);

  const fetchParents = useCallback(
    (pageNum: number) => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(pagination.limit),
      });
      if (search.trim()) params.set('search', search.trim());

      fetch(`/api/parent-master?${params.toString()}`)
        .then((res) => res.json())
        .then((json) => {
          if (json?.success && Array.isArray(json.data)) {
            setItems(json.data);
            if (json.pagination) setPagination(json.pagination);
          }
        })
        .catch(() => setMessage({ type: 'error', text: 'Failed to load products' }))
        .finally(() => setLoading(false));
    },
    [pagination.limit, search]
  );

  useEffect(() => {
    fetchParents(1);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchParents(1);
  };

  const openEdit = (parent: ParentMaster) => {
    setEditing(parent);
    setEditForm({
      plant: parent.plant ?? '',
      otherNames: parent.otherNames ?? '',
      variety: parent.variety ?? '',
      colour: parent.colour ?? '',
      height: parent.height ?? '',
      mossStick: parent.mossStick ?? '',
      size: parent.size ?? '',
      type: parent.type ?? '',
      seller: parent.seller ?? '',
      sort_order: parent.sort_order ?? '',
      categories: Array.isArray(parent.categories) ? parent.categories : [],
      price: parent.price ?? '',
      compare_price: parent.compare_price ?? '',
      publish: parent.publish ?? 'draft',
      inventoryQuantity: parent.inventoryQuantity ?? '',
      inventory_management: parent.inventory_management ?? 'none',
      inventory_management_level: parent.inventory_management_level ?? '',
      inventory_allow_out_of_stock: parent.inventory_allow_out_of_stock ?? '',
      images: Array.isArray(parent.images) ? parent.images : [],
      hub: parent.hub ?? '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editing?._id || !editForm) return;

    const priceNum = editForm.price !== '' ? Number(editForm.price) : 0;
    const comparePriceNum = editForm.compare_price !== '' ? Number(editForm.compare_price) : null;
    if (
      comparePriceNum != null &&
      comparePriceNum > 0 &&
      priceNum > 0 &&
      comparePriceNum < priceNum
    ) {
      setMessage({
        type: 'error',
        text: 'Compare price must be greater than or equal to Price (original price ≥ sale price).',
      });
      return;
    }

    setSaving(true);
    setMessage(null);
    const id = String(editing._id);
    const payload = {
      plant: editForm.plant.trim(),
      otherNames: editForm.otherNames.trim() || undefined,
      variety: editForm.variety.trim() || undefined,
      colour: editForm.colour.trim() || undefined,
      height: editForm.height !== '' ? Number(editForm.height) : undefined,
      mossStick: editForm.mossStick || undefined,
      size: editForm.size !== '' ? Number(editForm.size) : undefined,
      type: editForm.type || undefined,
      seller: editForm.seller || undefined,
      sort_order: editForm.sort_order !== '' ? Number(editForm.sort_order) : undefined,
      categories: editForm.categories,
      price: Number(editForm.price),
      compare_price: editForm.compare_price !== '' ? Number(editForm.compare_price) : undefined,
      publish: editForm.publish,
      inventoryQuantity: Number(editForm.inventoryQuantity),
      inventory_management: editForm.inventory_management || undefined,
      inventory_management_level: editForm.inventory_management_level || undefined,
      inventory_allow_out_of_stock:
        editForm.inventory_allow_out_of_stock !== ''
          ? Number(editForm.inventory_allow_out_of_stock)
          : undefined,
      images: editForm.images,
      hub: editForm.hub?.trim() || undefined,
    };

    try {
      const res = await fetch(`/api/parent-master/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message || 'Failed to update product' });
        setSaving(false);
        return;
      }
      setMessage({ type: 'success', text: 'Product updated successfully.' });
      setEditing(null);
      setEditForm(null);
      fetchParents(pagination.page);
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm?._id) return;

    setDeleting(true);
    setMessage(null);
    const id = String(deleteConfirm._id);

    try {
      const res = await fetch(`/api/parent-master/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message || 'Failed to delete product' });
        setDeleting(false);
        return;
      }
      setMessage({
        type: 'success',
        text: data.warnings ? `Product deleted with warnings: ${data.warnings.join('; ')}` : 'Product deleted successfully from all systems',
      });
      setDeleteConfirm(null);
      fetchParents(pagination.page);
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">View Parent</h2>

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
          placeholder="Search by plant, variety, type..."
          totalCount={pagination.total}
          entityName="Parent products"
        />

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading parent products...</div>
        ) : (
          <>
            <ParentTable items={items} onEdit={openEdit} onDelete={setDeleteConfirm} />
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={fetchParents}
            />
          </>
        )}
      </div>

      <EditParentModal
        isOpen={!!editing}
        editForm={editForm}
        saving={saving}
        categories={categories}
        sellers={sellers}
        onClose={() => {
          setEditing(null);
          setEditForm(null);
        }}
        onSave={handleSaveEdit}
        onChange={setEditForm}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteConfirm?.plant}"? This will permanently remove the product from the database, StoreHippo, and delete all associated images from S3. This action cannot be undone.`}
        confirmLabel="Delete Product"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        loading={deleting}
      />
    </div>
  );
}
