'use client';

import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Notification } from '@/components/ui/Notification';
import { CustomSelect } from '../../components/CustomSelect';

export function CollectionMasterForm() {
  const [name, setName] = useState('');
  const [publish, setPublish] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const bulkImportInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setMessage({ type: 'error', text: 'Name is required.' });
      return;
    }
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch('/api/collection-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          publish,
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message ?? 'Failed to create collection' });
        setSaving(false);
        return;
      }
      setMessage({ type: 'success', text: 'Collection created successfully.' });
      setName('');
      setPublish(0);
      setDescription('');
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setMessage(null);
    try {
      const res = await fetch('/api/collection-master/template');
      if (!res.ok) throw new Error('Failed to download template');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'collection-master-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage({ type: 'error', text: 'Failed to download template.' });
    }
  };

  const handleBulkImportClick = () => {
    bulkImportInputRef.current?.click();
  };

  const handleBulkImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setMessage(null);
    setBulkImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/collection-master/bulk-import', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (result.success) {
        setMessage({
          type: 'success',
          text: result.message ?? `Imported ${result.insertedCount} collection(s).`,
        });
      } else {
        setMessage({ type: 'error', text: result.message ?? 'Bulk import failed.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Bulk import failed. Please try again.' });
    } finally {
      setBulkImporting(false);
    }
  };

  const inputClass =
    'w-full h-11 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-shadow';

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Add Collection</h2>

      {message && (
        <Notification
          type={message.type}
          text={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        {/* Import file block */}
        <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-slate-200">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-4 h-4" />
            Download CSV template
          </button>
          <input
            ref={bulkImportInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleBulkImportFile}
          />
          <button
            type="button"
            onClick={handleBulkImportClick}
            disabled={bulkImporting}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bulkImporting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Bulk import
              </>
            )}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <label className="block sm:col-span-2">
              <span className="block text-sm font-medium text-slate-700 mb-1.5">
                Name
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Collection name"
                required
              />
            </label>
            <div className="block">
              <CustomSelect
                label="Publish"
                value={String(publish)}
                onChange={(v) => setPublish(Number(v))}
                options={[
                  { value: '0', label: '0' },
                  { value: '1', label: '1' },
                ]}
                searchable={false}
                placeholder="Choose..."
              />
            </div>
            <label className="block sm:col-span-2">
              <span className="block text-sm font-medium text-slate-700 mb-1.5">
                Description (optional)
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${inputClass} min-h-[80px] py-3`}
                placeholder="Optional description"
                rows={3}
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
                'Add Collection'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
