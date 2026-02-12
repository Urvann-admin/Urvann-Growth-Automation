'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pencil, Search, X, Check } from 'lucide-react';
import type { Category } from '@/models/category';
import { Notification } from '@/components/ui/Notification';
import { HUB_MAPPINGS, getSubstoresByHub } from '@/shared/constants/hubs';
import { SubstoreMultiPicker } from './CategoryMasterForm/shared';
import { RichTextEditor } from '@/components/ui/RichTextEditor';

export function ViewCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});

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

  const filtered = categories.filter(
    (c) =>
      !search.trim() ||
      (c.category ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.alias ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const hubOptions = HUB_MAPPINGS.map((m) => ({ value: m.hub, label: m.hub }));

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
      setMessage({ type: 'success', text: 'Category updated in DB and StoreHippo.' });
      setEditing(null);
      fetchCategories();
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">View Category</h2>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <span className="text-sm font-medium text-slate-700">All categories</span>
            <span className="inline-flex items-center justify-center min-w-[1.75rem] h-6 rounded-md bg-slate-100 text-xs font-medium text-slate-600">
              {filtered.length}
            </span>
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, alias..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E6007A]/20 focus:border-[#E6007A]"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading categories...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-3 font-semibold text-slate-700">Name</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-700">Alias</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-700">Type</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-700">Publish</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-700">Priority</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-700">Assignment</th>
                  <th className="text-right py-3 px-3 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cat) => (
                  <tr key={String(cat._id)} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3 px-3 text-slate-900">{cat.category ?? '—'}</td>
                    <td className="py-3 px-3 text-slate-600">{cat.alias ?? '—'}</td>
                    <td className="py-3 px-3 text-slate-600">{cat.typeOfCategory ?? '—'}</td>
                    <td className="py-3 px-3">
                      {cat.publish ? (
                        <Check className="w-5 h-5 text-emerald-600" strokeWidth={2.5} aria-label="Published" />
                      ) : (
                        <X className="w-5 h-5 text-slate-400" strokeWidth={2.5} aria-label="Not published" />
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{cat.priorityOrder ?? 0}</td>
                    <td className="py-3 px-3">
                      <span className="text-slate-600">{cat.type === 'Automatic' ? 'Automatic' : 'Manual'}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(cat)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-[#E6007A] transition-colors"
                        aria-label="Edit category"
                      >
                        <Pencil className="w-4 h-4" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="py-8 text-center text-slate-500">No categories found.</p>
            )}
          </div>
        )}
      </div>

      {message && (
        <Notification type={message.type} text={message.text} onDismiss={() => setMessage(null)} />
      )}

      {/* Edit modal */}
      {editing && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-category-title"
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 id="edit-category-title" className="text-lg font-semibold text-slate-900">
                Edit category
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-slate-700 mb-1">Name</span>
                  <input
                    type="text"
                    value={String(editForm.category ?? '')}
                    onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E6007A]/20 focus:border-[#E6007A]"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-slate-700 mb-1">Alias</span>
                  <input
                    type="text"
                    value={String(editForm.alias ?? '')}
                    onChange={(e) => setEditForm((f) => ({ ...f, alias: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E6007A]/20 focus:border-[#E6007A]"
                  />
                </label>
              </div>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1">Type of category</span>
                <select
                  value={String(editForm.typeOfCategory ?? '')}
                  onChange={(e) => setEditForm((f) => ({ ...f, typeOfCategory: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E6007A]/20 focus:border-[#E6007A]"
                >
                  <option value="L1">L1</option>
                  <option value="L2">L2</option>
                  <option value="L3">L3</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1">Description</span>
                <RichTextEditor
                  value={String(editForm.description ?? '')}
                  onChange={(v) => setEditForm((f) => ({ ...f, description: v }))}
                  placeholder="Description"
                  minHeight="100px"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-slate-700 mb-1">L1 parent</span>
                  <input
                    type="text"
                    value={String(editForm.l1Parent ?? '')}
                    onChange={(e) => setEditForm((f) => ({ ...f, l1Parent: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E6007A]/20 focus:border-[#E6007A]"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-slate-700 mb-1">L2 parent</span>
                  <input
                    type="text"
                    value={String(editForm.l2Parent ?? '')}
                    onChange={(e) => setEditForm((f) => ({ ...f, l2Parent: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E6007A]/20 focus:border-[#E6007A]"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-slate-700 mb-1">L3 parent</span>
                  <input
                    type="text"
                    value={String(editForm.l3Parent ?? '')}
                    onChange={(e) => setEditForm((f) => ({ ...f, l3Parent: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E6007A]/20 focus:border-[#E6007A]"
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editForm.publish)}
                    onChange={(e) => setEditForm((f) => ({ ...f, publish: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-[#E6007A] focus:ring-[#E6007A]"
                  />
                  <span className="text-sm font-medium text-slate-700">Publish</span>
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">Priority order</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={String(editForm.priorityOrder ?? '0')}
                    onChange={(e) => setEditForm((f) => ({ ...f, priorityOrder: e.target.value }))}
                    className="w-20 h-9 rounded-lg border border-slate-200 px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#E6007A]/20 focus:border-[#E6007A]"
                  />
                </label>
              </div>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1">Hubs (substores)</span>
                <SubstoreMultiPicker
                  value={Array.isArray(editForm.substores) ? editForm.substores as string[] : []}
                  options={hubOptions}
                  optionToSubstores={getSubstoresByHub}
                  onChange={(v) => setEditForm((f) => ({ ...f, substores: v }))}
                />
              </label>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="rounded-lg bg-[#E6007A] px-4 py-2 text-sm font-medium text-white hover:bg-pink-600 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save (DB + StoreHippo)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
