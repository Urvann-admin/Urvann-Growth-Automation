'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import type { CollectionMaster } from '@/models/collectionMaster';
import { Notification } from '@/components/ui/Notification';
import { SearchBar } from '../../shared';
import { CollectionTable, type CollectionRow } from './CollectionTable';
import {
  EditCollectionModal,
  type EditCollectionForm,
} from './EditCollectionModal';

const emptyEditForm: EditCollectionForm = {
  name: '',
  publish: 0,
  description: '',
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
          json.data.map((d: CollectionMaster) => ({
            _id: String(d._id),
            name: d.name,
            alias: d.alias,
            publish: d.publish,
            description: d.description,
            type: d.type,
            storeHippoId: d.storeHippoId,
          }))
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
    setEditForm({
      name: row.name ?? '',
      publish: row.publish ?? 0,
      description: row.description ?? '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editing?._id) return;
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/collection-master/${editing._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          publish: editForm.publish,
          description: editForm.description.trim() || undefined,
        }),
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
          <CollectionTable
            collections={collections}
            onEdit={openEdit}
          />
        )}
      </div>

      <EditCollectionModal
        isOpen={editing !== null}
        title="Edit Collection"
        editForm={editForm}
        saving={saving}
        onClose={() => setEditing(null)}
        onSave={handleSaveEdit}
        onChange={setEditForm}
      />
    </div>
  );
}
