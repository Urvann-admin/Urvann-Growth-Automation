'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Category } from '@/models/category';
import { Notification } from '@/components/ui/Notification';
import { SearchBar, ConfirmDialog } from '../../shared';
import { CategoryTable } from './CategoryTable';
import { EditCategoryModal } from './EditCategoryModal';

interface EditCategoryForm {
  category: string;
  alias: string;
  typeOfCategory: string;
  description: string;
  l1Parent: string;
  l2Parent: string;
  l3Parent: string;
  publish: boolean;
  priorityOrder: string;
  type: string;
  substores: string[];
}

export function ViewCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState<EditCategoryForm>({
    category: '',
    alias: '',
    typeOfCategory: '',
    description: '',
    l1Parent: '',
    l2Parent: '',
    l3Parent: '',
    publish: true,
    priorityOrder: '0',
    type: 'Manual',
    substores: [],
  });

  const fetchCategories = useCallback(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) setCategories(json.data);
      })
      .catch(() => setMessage({ type: 'error', text: 'Failed to load categories' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (!editing) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditing(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [editing]);

  const filtered = categories.filter(
    (c) =>
      !search.trim() ||
      (c.category ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.alias ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setEditForm({
      category: cat.category ?? '',
      alias: cat.alias ?? '',
      typeOfCategory: cat.typeOfCategory ?? '',
      description: cat.description ?? '',
      l1Parent: cat.l1Parent ?? '',
      l2Parent: cat.l2Parent ?? '',
      l3Parent: cat.l3Parent ?? '',
      publish: cat.publish ?? true,
      priorityOrder: String(cat.priorityOrder ?? 0),
      type: cat.type ?? 'Manual',
      substores: Array.isArray(cat.substores) ? cat.substores : [],
    });
  };

  const handleSaveEdit = async () => {
    if (!editing?._id) return;
    setSaving(true);
    setMessage(null);
    const id = String(editing._id);
    const conditionsOrItems = (editForm as any).conditions ?? (editForm as any).items;
    const rule =
      editForm.type === 'Automatic' && Array.isArray(conditionsOrItems) && conditionsOrItems?.length
        ? {
            rule_operator: (editForm as any).ruleOperator ?? 'AND',
            items: conditionsOrItems.filter((c: any) => c && String((c.value ?? '')).trim() !== ''),
          }
        : undefined;

    const payload = {
      category: String(editForm.category ?? '').trim(),
      alias: String(editForm.alias ?? '').trim(),
      typeOfCategory: String(editForm.typeOfCategory ?? '').trim(),
      description: String(editForm.description ?? '').trim(),
      l1Parent: String(editForm.l1Parent ?? '').trim(),
      l2Parent: String(editForm.l2Parent ?? '').trim(),
      l3Parent: String(editForm.l3Parent ?? '').trim(),
      publish: Boolean(editForm.publish),
      priorityOrder: Math.max(0, Math.round((parseFloat(String(editForm.priorityOrder)) || 0) * 10) / 10),
      type: editForm.type === 'Automatic' ? 'Automatic' : 'Manual',
      rule,
      substores: Array.isArray(editForm.substores) ? editForm.substores : [],
    };

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message || 'Failed to update category' });
        setSaving(false);
        return;
      }
      setMessage({ type: 'success', text: 'Category updated successfully.' });
      setEditing(null);
      fetchCategories();
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
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message || 'Failed to delete category' });
        setDeleting(false);
        return;
      }
      setMessage({
        type: 'success',
        text: data.warnings ? `Category deleted with warnings: ${data.warnings.join('; ')}` : 'Category deleted successfully from all systems',
      });
      setDeleteConfirm(null);
      fetchCategories();
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">View Categories</h2>

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
          placeholder="Search by name or alias..."
          totalCount={categories.length}
          entityName="Categories"
        />

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading categories...</div>
        ) : (
          <CategoryTable categories={filtered} onEdit={openEdit} onDelete={setDeleteConfirm} />
        )}
      </div>

      <EditCategoryModal
        isOpen={!!editing}
        editForm={editForm}
        saving={saving}
        onClose={() => setEditing(null)}
        onSave={handleSaveEdit}
        onChange={setEditForm}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteConfirm?.category}"? This will permanently remove the category from the database and StoreHippo. This action cannot be undone.`}
        confirmLabel="Delete Category"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        loading={deleting}
      />
    </div>
  );
}
