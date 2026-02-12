'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Check, X, Pencil, ChevronDown } from 'lucide-react';
import type { ParentMaster } from '@/models/parentMaster';
import type { Category } from '@/models/category';
import type { SellerMaster } from '@/models/sellerMaster';
import { Notification } from '@/components/ui/Notification';
import { HUB_MAPPINGS } from '@/shared/constants/hubs';
import { CustomSelect } from '../components';
import { MOSS_STICK_OPTIONS, PLANT_TYPES } from './ProductMasterForm/types';

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function getCategoryName(categories: Category[], categoryId: string): string {
  const cat = categories.find((c) => c._id === categoryId || c.categoryId === categoryId);
  return cat?.category || categoryId;
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
  const [editForm, setEditForm] = useState<{
    plant: string;
    otherNames: string;
    variety: string;
    colour: string;
    height: number | '';
    mossStick: string;
    size: number | '';
    type: string;
    seller: string;
    categories: string[];
    price: number | '';
    publish: string;
    inventoryQuantity: number | '';
    images: string[];
    hub: string;
  } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sellers, setSellers] = useState<SellerMaster[]>([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

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
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      fetch(`/api/parent-master?${params}`)
        .then((res) => res.json())
        .then((json) => {
          if (json?.success && Array.isArray(json.data)) {
            setItems(json.data);
            if (json.pagination) {
              setPagination((prev) => ({
                ...prev,
                total: json.pagination.total ?? prev.total,
                page: json.pagination.page ?? prev.page,
                limit: json.pagination.limit ?? prev.limit,
                totalPages: json.pagination.totalPages ?? prev.totalPages,
              }));
            }
          }
        })
        .catch(() => setMessage({ type: 'error', text: 'Failed to load parent products' }))
        .finally(() => setLoading(false));
    },
    [search, pagination.limit]
  );

  useEffect(() => {
    fetchParents(pagination.page);
    // Intentionally omit fetchParents so we don't refetch on every search keystroke; Search button calls fetchParents(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
    fetchParents(1);
  };

  const openEdit = async (row: ParentMaster) => {
    const id = String(row._id);
    try {
      const res = await fetch(`/api/parent-master/${id}`);
      const json = await res.json();
      if (!json?.success || !json.data) {
        setMessage({ type: 'error', text: 'Failed to load product' });
        return;
      }
      const p = json.data as ParentMaster;
      setEditing(p);
      setEditForm({
        plant: p.plant ?? '',
        otherNames: p.otherNames ?? '',
        variety: p.variety ?? '',
        colour: p.colour ?? '',
        height: p.height ?? '',
        mossStick: p.mossStick ?? '',
        size: p.size ?? '',
        type: p.type ?? '',
        seller: p.seller ?? '',
        categories: Array.isArray(p.categories) ? p.categories : [],
        price: p.price ?? '',
        publish: p.publish ?? 'draft',
        inventoryQuantity: p.inventoryQuantity ?? '',
        images: Array.isArray(p.images) ? p.images : [],
        hub: p.hub ?? '',
      });
      setCategorySearch('');
      setCategoryDropdownOpen(false);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load product' });
    }
  };

  const handleSaveEdit = async () => {
    if (!editing?._id || !editForm) return;
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
      categories: editForm.categories,
      price: Number(editForm.price),
      publish: editForm.publish,
      inventoryQuantity: Number(editForm.inventoryQuantity),
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

  const filteredCategoriesForDropdown = categories.filter(
    (c) =>
      c.category?.toLowerCase().includes(categorySearch.toLowerCase()) ||
      c.alias?.toLowerCase().includes(categorySearch.toLowerCase())
  );
  const sellerOptions = [
    { value: '', label: 'Select Seller' },
    ...sellers.map((s) => ({ value: s.seller_id, label: s.seller_name })),
  ];
  const hubOptions = [
    { value: '', label: 'Select Hub' },
    ...HUB_MAPPINGS.map((m) => ({ value: m.hub, label: m.hub })),
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">View Parent</h2>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <span className="text-sm font-medium text-slate-700">Parent products</span>
            <span className="inline-flex items-center justify-center min-w-[1.75rem] h-6 rounded-md bg-slate-100 text-xs font-medium text-slate-600">
              {pagination.total}
            </span>
          </div>
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px] flex gap-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by plant, variety, type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Search
            </button>
          </form>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading parent products...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-3 font-semibold text-slate-700">Plant</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-700">Final name</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-700">Price</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-700">Inventory</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-700">Publish</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-700">Categories</th>
                  <th className="text-right py-3 px-3 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={String(row._id)} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3 px-3 text-slate-900">{row.plant ?? '—'}</td>
                    <td className="py-3 px-3 text-slate-600 max-w-[200px] truncate" title={row.finalName}>
                      {row.finalName ?? '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{row.price ?? '—'}</td>
                    <td className="py-3 px-3 text-slate-600">{row.inventoryQuantity ?? '—'}</td>
                    <td className="py-3 px-3">
                      {row.publish === 'published' ? (
                        <Check className="w-5 h-5 text-emerald-600" strokeWidth={2.5} aria-label="Published" />
                      ) : (
                        <X className="w-5 h-5 text-slate-400" strokeWidth={2.5} aria-label="Draft" />
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {Array.isArray(row.categories) ? row.categories.length : 0}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition-colors"
                        aria-label="Edit product"
                      >
                        <Pencil className="w-4 h-4" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && (
              <p className="py-8 text-center text-slate-500">No parent products found.</p>
            )}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => {
                  setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }));
                  fetchParents(Math.max(1, pagination.page - 1));
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => {
                  setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }));
                  fetchParents(Math.min(pagination.totalPages, pagination.page + 1));
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {message && (
        <Notification type={message.type} text={message.text} onDismiss={() => setMessage(null)} />
      )}

      {/* Edit modal */}
      {editing && editForm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-parent-title"
        >
          <div className="relative flex flex-col w-full max-w-3xl max-h-[88vh] rounded-xl border border-slate-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0 border-b border-slate-200 bg-slate-50/80 px-6 py-4 rounded-t-xl">
              <h2 id="edit-parent-title" className="text-lg font-semibold text-slate-900">
                Edit product
              </h2>
              <button
                type="button"
                onClick={() => { setEditing(null); setEditForm(null); }}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-6 space-y-6">
                {/* Basics */}
                <section>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                    Basics
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="block text-sm font-medium text-slate-700 mb-1.5">Plant name</span>
                      <input
                        type="text"
                        value={editForm.plant}
                        onChange={(e) => setEditForm((f) => f ? { ...f, plant: e.target.value } : null)}
                        className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-shadow"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-sm font-medium text-slate-700 mb-1.5">Other names</span>
                      <input
                        type="text"
                        value={editForm.otherNames}
                        onChange={(e) => setEditForm((f) => f ? { ...f, otherNames: e.target.value } : null)}
                        className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-shadow"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-sm font-medium text-slate-700 mb-1.5">Variety</span>
                      <input
                        type="text"
                        value={editForm.variety}
                        onChange={(e) => setEditForm((f) => f ? { ...f, variety: e.target.value } : null)}
                        className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-shadow"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-sm font-medium text-slate-700 mb-1.5">Colour</span>
                      <input
                        type="text"
                        value={editForm.colour}
                        onChange={(e) => setEditForm((f) => f ? { ...f, colour: e.target.value } : null)}
                        className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-shadow"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-sm font-medium text-slate-700 mb-1.5">Height (feet)</span>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={editForm.height}
                        onChange={(e) =>
                          setEditForm((f) =>
                            f ? { ...f, height: e.target.value ? parseFloat(e.target.value) : '' } : null
                          )
                        }
                        className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-shadow"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-sm font-medium text-slate-700 mb-1.5">Size (inches)</span>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={editForm.size}
                        onChange={(e) =>
                          setEditForm((f) =>
                            f ? { ...f, size: e.target.value ? parseFloat(e.target.value) : '' } : null
                          )
                        }
                        className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-shadow"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <CustomSelect
                      label="Moss Stick"
                      value={editForm.mossStick}
                      onChange={(v) => setEditForm((f) => f ? { ...f, mossStick: v } : null)}
                      options={MOSS_STICK_OPTIONS}
                      placeholder="Select Moss Stick"
                    />
                    <CustomSelect
                      label="Type"
                      value={editForm.type}
                      onChange={(v) => setEditForm((f) => f ? { ...f, type: v } : null)}
                      options={PLANT_TYPES}
                      placeholder="Select Type"
                    />
                    <CustomSelect
                      label="Seller"
                      value={editForm.seller}
                      onChange={(v) => setEditForm((f) => f ? { ...f, seller: v } : null)}
                      options={sellerOptions}
                      placeholder="Select Seller"
                    />
                    <CustomSelect
                      label="Hub"
                      value={editForm.hub}
                      onChange={(v) => setEditForm((f) => f ? { ...f, hub: v } : null)}
                      options={hubOptions}
                      placeholder="Select Hub"
                    />
                  </div>
                </section>

                {/* Pricing & status */}
                <section>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                    Pricing & status
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <label className="block">
                      <span className="block text-sm font-medium text-slate-700 mb-1.5">Price</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={editForm.price}
                        onChange={(e) =>
                          setEditForm((f) =>
                            f ? { ...f, price: e.target.value ? parseFloat(e.target.value) : '' } : null
                          )
                        }
                        className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-shadow"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-sm font-medium text-slate-700 mb-1.5">Inventory quantity</span>
                      <input
                        type="number"
                        min={0}
                        value={editForm.inventoryQuantity}
                        onChange={(e) =>
                          setEditForm((f) =>
                            f
                              ? { ...f, inventoryQuantity: e.target.value ? parseInt(e.target.value, 10) : '' }
                              : null
                          )
                        }
                        className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-shadow"
                      />
                    </label>
                    <div className="flex items-end pb-2.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.publish === 'published'}
                          onChange={(e) =>
                            setEditForm((f) => (f ? { ...f, publish: e.target.checked ? 'published' : 'draft' } : null))
                          }
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-medium text-slate-700">Published</span>
                      </label>
                    </div>
                  </div>
                </section>

                {/* Categories */}
                <section>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                    Categories
                  </h3>
                  {editForm.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {editForm.categories.map((categoryId) => (
                        <span
                          key={categoryId}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 text-sm rounded-lg"
                        >
                          {getCategoryName(categories, categoryId)}
                          <button
                            type="button"
                            onClick={() =>
                              setEditForm((f) =>
                                f
                                  ? { ...f, categories: f.categories.filter((id) => id !== categoryId) }
                                  : null
                              )
                            }
                            className="hover:bg-emerald-200 rounded p-0.5 transition-colors"
                            aria-label="Remove category"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative" ref={categoryDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 h-10 border rounded-lg bg-white text-left text-sm transition-colors ${
                        categoryDropdownOpen
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                      }`}
                    >
                      <span className={editForm.categories.length > 0 ? 'text-slate-900' : 'text-slate-500'}>
                        {editForm.categories.length === 0
                          ? 'Select categories...'
                          : `${editForm.categories.length} ${editForm.categories.length === 1 ? 'category' : 'categories'} selected`}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {categoryDropdownOpen && (
                      <div className="absolute z-20 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                        <div className="p-2 border-b border-slate-100">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              value={categorySearch}
                              onChange={(e) => setCategorySearch(e.target.value)}
                              placeholder="Search categories..."
                              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                            />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto py-1">
                          {filteredCategoriesForDropdown.length === 0 ? (
                            <p className="text-slate-500 text-sm px-3 py-2">No categories found</p>
                          ) : (
                            filteredCategoriesForDropdown.map((cat) => {
                              const id = String(cat._id);
                              const selected = editForm.categories.includes(id);
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => {
                                    setEditForm((f) =>
                                      f
                                        ? {
                                            ...f,
                                            categories: selected
                                              ? f.categories.filter((c) => c !== id)
                                              : [...f.categories, id],
                                          }
                                        : null
                                    );
                                  }}
                                  className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between gap-2 ${
                                    selected ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50 text-slate-900'
                                  }`}
                                >
                                  {cat.category}
                                  {selected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 flex justify-end gap-3 border-t border-slate-200 bg-slate-50/80 px-6 py-4 rounded-b-xl">
              <button
                type="button"
                onClick={() => { setEditing(null); setEditForm(null); }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  'Save changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
