'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Category } from '@/models/category';
import { Notification } from '@/components/ui/Notification';
import { SearchBar, ConfirmDialog } from '../../shared';
import { CategoryTable } from './CategoryTable';
import {
  EditCategoryModal,
  type EditCategoryForm,
  type EditCategoryRecordMeta,
} from './EditCategoryModal';
import type { FormRuleItem, RuleConditionField } from '../CategoryMasterForm/types';
import {
  hasConditionWithValue,
  formRuleItemsToRuleItems,
  ruleToFormRuleItems,
  appendToPath,
  removeAtPath,
  getItemAtPath,
  setItemAtPath,
} from '../CategoryMasterForm/ruleFormHelpers';

function emptyEditForm(): EditCategoryForm {
  return {
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
    ruleOperator: 'AND',
    ruleItems: [{ field: 'Plant', value: '' }],
    substores: [],
  };
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
  const [editForm, setEditForm] = useState<EditCategoryForm>(emptyEditForm);
  const [ruleErrors, setRuleErrors] = useState<Record<string, string>>({});

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
        setRuleErrors({});
      }
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [editing]);

  const l1Options = useMemo(() => {
    const list = categories.filter((c) => String(c.typeOfCategory || '').toUpperCase() === 'L1');
    return list
      .map((c) => ({
        value: (c.category ?? c.categoryId ?? '').toString(),
        label: c.category || (c.categoryId ?? ''),
      }))
      .filter((o) => o.value);
  }, [categories]);

  const l2Options = useMemo(() => {
    const list = categories.filter((c) => String(c.typeOfCategory || '').toUpperCase() === 'L2');
    return list
      .map((c) => ({
        value: (c.category ?? c.categoryId ?? '').toString(),
        label: c.category || (c.categoryId ?? ''),
      }))
      .filter((o) => o.value);
  }, [categories]);

  const l3Options = useMemo(() => {
    const list = categories.filter((c) => String(c.typeOfCategory || '').toUpperCase() === 'L3');
    return list
      .map((c) => ({
        value: (c.category ?? c.categoryId ?? '').toString(),
        label: c.category || (c.categoryId ?? ''),
      }))
      .filter((o) => o.value);
  }, [categories]);

  const filtered = categories.filter(
    (c) =>
      !search.trim() ||
      (c.category ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.alias ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const recordMeta: EditCategoryRecordMeta | null = editing
    ? {
        storeHippoId: editing.categoryId != null ? String(editing.categoryId) : null,
        createdAt: editing.createdAt,
        updatedAt: editing.updatedAt,
      }
    : null;

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setRuleErrors({});
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
      type: cat.type === 'Automatic' ? 'Automatic' : 'Manual',
      ruleOperator: cat.rule?.rule_operator ?? 'AND',
      ruleItems: ruleToFormRuleItems(cat.rule),
      substores: Array.isArray(cat.substores) ? cat.substores : [],
    });
  };

  const clearRuleError = (key: string) => {
    setRuleErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const addRuleCondition = (path: number[]) => {
    setEditForm((prev) => ({
      ...prev,
      ruleItems: appendToPath(prev.ruleItems, path, { field: 'Plant', value: '' }),
    }));
  };

  const addRuleGroup = (path: number[]) => {
    setEditForm((prev) => ({
      ...prev,
      ruleItems: appendToPath(prev.ruleItems, path, {
        rule_operator: 'AND',
        items: [{ field: 'Plant', value: '' }],
      }),
    }));
  };

  const removeRuleItem = (path: number[]) => {
    setEditForm((prev) => ({
      ...prev,
      ruleItems: removeAtPath(prev.ruleItems, path),
    }));
  };

  const updateRuleItem = (
    path: number[],
    updates: Partial<{ field: RuleConditionField; value: string }> | { rule_operator: 'AND' | 'OR' }
  ) => {
    setEditForm((prev) => {
      const current = getItemAtPath(prev.ruleItems, path);
      if (!current) return prev;
      const newItem: FormRuleItem =
        'field' in current
          ? { ...current, ...(updates as Partial<{ field: RuleConditionField; value: string }>) }
          : { ...current, ...('rule_operator' in updates ? { rule_operator: updates.rule_operator } : {}) };
      return {
        ...prev,
        ruleItems: setItemAtPath(prev.ruleItems, path, newItem),
      };
    });
  };

  const handleSaveEdit = async () => {
    if (!editing?._id) return;
    setSaving(true);
    setMessage(null);
    setRuleErrors({});

    if (editForm.type === 'Automatic' && !hasConditionWithValue(editForm.ruleItems)) {
      setRuleErrors({ rule: 'Add at least one condition with a value when assignment type is Automatic.' });
      setMessage({
        type: 'error',
        text: 'Add at least one condition with a value when assignment type is Automatic.',
      });
      setSaving(false);
      return;
    }

    const id = String(editing._id);
    const ruleItemsConverted = formRuleItemsToRuleItems(editForm.ruleItems);
    const rule =
      editForm.type === 'Automatic' && ruleItemsConverted.length > 0
        ? { rule_operator: editForm.ruleOperator, items: ruleItemsConverted }
        : null;

    const typeUpper = String(editForm.typeOfCategory || '').toUpperCase();
    const isL1 = typeUpper === 'L1';
    const isL2 = typeUpper === 'L2';

    const payload = {
      category: String(editForm.category ?? '').trim(),
      alias: String(editForm.alias ?? '').trim(),
      typeOfCategory: String(editForm.typeOfCategory ?? '').trim(),
      description: String(editForm.description ?? '').trim(),
      l1Parent: isL1 ? '' : String(editForm.l1Parent ?? '').trim(),
      l2Parent: isL1 || isL2 ? '' : String(editForm.l2Parent ?? '').trim(),
      l3Parent: isL1 || isL2 ? '' : String(editForm.l3Parent ?? '').trim(),
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
      setRuleErrors({});
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
        text: data.warnings
          ? `Category deleted with warnings: ${data.warnings.join('; ')}`
          : 'Category deleted successfully from all systems',
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
          text={message.text}
          onDismiss={() => setMessage(null)}
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
        recordMeta={recordMeta}
        saving={saving}
        l1Options={l1Options}
        l2Options={l2Options}
        l3Options={l3Options}
        ruleErrors={ruleErrors}
        onClose={() => {
          setEditing(null);
          setRuleErrors({});
        }}
        onSave={handleSaveEdit}
        onChange={setEditForm}
        onClearRuleError={clearRuleError}
        onAddRuleCondition={addRuleCondition}
        onAddRuleGroup={addRuleGroup}
        onRemoveRuleItem={removeRuleItem}
        onUpdateRuleItem={updateRuleItem}
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
