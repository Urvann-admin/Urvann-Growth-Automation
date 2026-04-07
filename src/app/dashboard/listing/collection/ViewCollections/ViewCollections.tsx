'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import type { CollectionMaster } from '@/models/collectionMaster';
import { slug } from '@/lib/utils';
import { Notification } from '@/components/ui/Notification';
import { SearchBar } from '../../shared';
import { CollectionTable, type CollectionRow } from './CollectionTable';
import { EditCollectionModal, type EditCollectionForm } from './EditCollectionModal';
import type { CollectionRuleCondition } from '../CollectionMasterForm/CollectionRuleSection';
import {
  defaultRuleState,
  parseFiltersToRuleState,
  serializeDynamicFilters,
  validateDynamicRules,
} from './collectionEditRuleUtils';

const EXTRA_META_KEYS = [
  'sort_order',
  'images',
  'SEO',
  'metafields',
  'facet_group',
  'entity_type',
  'created_on',
  'updated_on',
  '_size',
  '_created_by',
  '_updated_by',
] as const;

function pickExtraMetadataJson(d: Record<string, unknown>): string | undefined {
  const out: Record<string, unknown> = {};
  for (const k of EXTRA_META_KEYS) {
    const v = d[k];
    if (v === undefined || v === null) continue;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0) continue;
    out[k] = v;
  }
  return Object.keys(out).length ? JSON.stringify(out, null, 2) : undefined;
}

const emptyEditForm: EditCollectionForm = {
  name: '',
  alias: '',
  type: 'manual',
  publish: 0,
  description: '',
  default_sort_order: '',
  substore: [],
  ...defaultRuleState(),
};

export function ViewCollections() {
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [editing, setEditing] = useState<CollectionRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditCollectionForm>(emptyEditForm);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      params.set('limit', '500');
      const res = await fetch(`/api/collection-master?${params.toString()}`);
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        setCollections(
          json.data.map((d: CollectionMaster) => {
            const doc = d as unknown as Record<string, unknown>;
            return {
              _id: String(d._id),
              name: d.name,
              alias: d.alias,
              publish: d.publish,
              description: d.description,
              type: d.type,
              storeHippoId: d.storeHippoId,
              default_sort_order: d.default_sort_order,
              substore: d.substore,
              filters: d.filters,
              extraMetadataJson: pickExtraMetadataJson(doc),
            };
          })
        );
      } else {
        setMessage({
          type: 'error',
          text: json?.message ?? 'Failed to load collections',
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load collections' });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

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

  const openEdit = (row: CollectionRow) => {
    setEditing(row);
    const substore = row.substore;
    const substoreArr = Array.isArray(substore)
      ? (substore as string[])
      : substore != null
        ? [String(substore)]
        : [];
    const { ruleOperator, ruleItems } = parseFiltersToRuleState(row.filters);
    setEditForm({
      name: row.name ?? '',
      alias: row.alias ?? '',
      type: row.type ?? 'manual',
      publish: row.publish ?? 0,
      description: row.description ?? '',
      default_sort_order: row.default_sort_order ?? '',
      substore: substoreArr,
      ruleOperator,
      ruleItems,
    });
  };

  const handleSaveEdit = async () => {
    if (!editing?._id) return;
    const trimmedName = editForm.name.trim();
    if (!trimmedName) {
      setMessage({ type: 'error', text: 'Name is required.' });
      return;
    }
    if (editForm.type === 'dynamic' && !validateDynamicRules(editForm.ruleItems)) {
      setMessage({
        type: 'error',
        text: 'Add at least one rule condition with a value for dynamic type.',
      });
      return;
    }
    setMessage(null);
    setSaving(true);
    try {
      const aliasTrim = editForm.alias.trim();
      const payload: Record<string, unknown> = {
        name: trimmedName,
        type: editForm.type,
        publish: editForm.publish,
        description: editForm.description.trim() || undefined,
        default_sort_order: editForm.default_sort_order.trim() || undefined,
        substore: editForm.substore.length > 0 ? editForm.substore : undefined,
      };
      if (aliasTrim) {
        payload.alias = slug(aliasTrim);
      }
      if (editForm.type === 'dynamic') {
        payload.filters = serializeDynamicFilters(editForm.ruleOperator, editForm.ruleItems);
      } else {
        payload.filters = [];
      }

      const res = await fetch(`/api/collection-master/${editing._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({
          type: 'error',
          text: data.message ?? 'Failed to update collection',
        });
        setSaving(false);
        return;
      }
      setMessage({ type: 'success', text: 'Collection updated successfully.' });
      setEditing(null);
      fetchCollections();
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleSync = async () => {
    setMessage(null);
    setSyncing(true);
    try {
      const res = await fetch('/api/collection-master/sync', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({
          type: 'error',
          text: data.message ?? 'Sync failed',
        });
        setSyncing(false);
        return;
      }
      setMessage({ type: 'success', text: data.message ?? 'Sync completed.' });
      fetchCollections();
    } catch {
      setMessage({ type: 'error', text: 'Sync failed. Please try again.' });
    } finally {
      setSyncing(false);
    }
  };

  const addRuleCondition = () => {
    setEditForm((prev) => ({
      ...prev,
      ruleItems: [
        ...prev.ruleItems,
        {
          ...defaultRuleState().ruleItems[0],
        },
      ],
    }));
  };

  const removeRuleItem = (index: number) => {
    setEditForm((prev) => {
      const next = prev.ruleItems.filter((_, i) => i !== index);
      return {
        ...prev,
        ruleItems: next.length > 0 ? next : defaultRuleState().ruleItems,
      };
    });
  };

  const updateRuleItem = (index: number, updates: Partial<CollectionRuleCondition>) => {
    setEditForm((prev) => ({
      ...prev,
      ruleItems: prev.ruleItems.map((item, i) => (i === index ? { ...item, ...updates } : item)),
    }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">View Collection</h2>

      {message && (
        <Notification
          type={message.type}
          text={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            onSubmit={handleSearchSubmit}
            placeholder="Search by name or alias..."
            totalCount={collections.length}
            entityName="Collections"
          />
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Sync from StoreHippo
              </>
            )}
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
            <span className="inline-block w-8 h-8 border-2 border-[#E6007A] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading collections...</span>
          </div>
        ) : (
          <CollectionTable collections={collections} onEdit={openEdit} />
        )}
      </div>

      <EditCollectionModal
        isOpen={editing !== null}
        title="Edit Collection"
        editForm={editForm}
        extraMetadataJson={editing?.extraMetadataJson ?? null}
        saving={saving}
        onClose={() => setEditing(null)}
        onSave={handleSaveEdit}
        onChange={setEditForm}
        onRuleOperatorChange={(v) => setEditForm((p) => ({ ...p, ruleOperator: v }))}
        onAddRuleCondition={addRuleCondition}
        onRemoveRuleItem={removeRuleItem}
        onUpdateRuleItem={updateRuleItem}
      />
    </div>
  );
}
