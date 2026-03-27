'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Download, Upload, X } from 'lucide-react';
import { slug } from '@/lib/utils';
import { HUB_MAPPINGS, getSubstoresByHub, getSelectedHubsFromSubstores } from '@/shared/constants/hubs';
import { Notification } from '@/components/ui/Notification';
import { CustomSelect } from '../../components/CustomSelect';
import { SubstoreMultiPicker } from '@/app/dashboard/listing/category/CategoryMasterForm/shared/SubstoreMultiPicker';
import {
  CollectionRuleSection,
  type CollectionRuleCondition,
  COLLECTION_RULE_FIELDS,
  COLLECTION_RULE_OPERATORS,
  MULTI_VALUE_FIELDS,
} from './CollectionRuleSection';

const TYPE_OPTIONS = [
  { value: 'manual', label: 'manual' },
  { value: 'dynamic', label: 'dynamic' },
];

const DEFAULT_SORT_OPTIONS = [
  { value: 'Manually', label: 'Manually' },
  { value: 'Alphabetically: A-Z', label: 'Alphabetically: A-Z' },
  { value: 'Alphabetically: Z-A', label: 'Alphabetically: Z-A' },
  { value: 'By price: Highest to lowest', label: 'By price: Highest to lowest' },
  { value: 'By price: Lowest to highest', label: 'By price: Lowest to highest' },
  { value: 'By date: Oldest to newest', label: 'By date: Oldest to newest' },
  { value: 'By date: Newest to oldest', label: 'By date: Newest to oldest' },
  { value: 'By best seller', label: 'By best seller' },
];

const initialRuleCondition: CollectionRuleCondition = {
  field: COLLECTION_RULE_FIELDS[0],
  operator: COLLECTION_RULE_OPERATORS[0],
  value: '',
  values: undefined,
};

export function CollectionMasterForm() {
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [type, setType] = useState<'manual' | 'dynamic'>('manual');
  const [publish, setPublish] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [defaultSortOrder, setDefaultSortOrder] = useState('');
  const [substores, setSubstores] = useState<string[]>([]);
  const [ruleOperator, setRuleOperator] = useState<'AND' | 'OR'>('AND');
  const [ruleItems, setRuleItems] = useState<CollectionRuleCondition[]>([
    { ...initialRuleCondition },
  ]);
  const [saving, setSaving] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const bulkImportInputRef = useRef<HTMLInputElement>(null);
  const aliasManuallyEditedRef = useRef(false);

  // Auto-fill alias from name (lowercase slug) when name changes, unless user has edited alias
  useEffect(() => {
    if (aliasManuallyEditedRef.current) return;
    setAlias(name.trim() ? slug(name) : '');
  }, [name]);

  const hubOptions = HUB_MAPPINGS.map((m) => ({
    value: m.hub,
    label: m.hub,
  }));

  const handleAddCondition = useCallback(() => {
    setRuleItems((prev) => [...prev, { ...initialRuleCondition }]);
  }, []);

  const handleRemoveRuleItem = useCallback((index: number) => {
    setRuleItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateRuleItem = useCallback((index: number, updates: Partial<CollectionRuleCondition>) => {
    setRuleItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setMessage({ type: 'error', text: 'Name is required.' });
      return;
    }
    if (type === 'dynamic') {
      const isMulti = (f: string) =>
        MULTI_VALUE_FIELDS.includes(f as (typeof MULTI_VALUE_FIELDS)[number]);
      const validItems = ruleItems.filter((c) => {
        if (!c.field || !c.operator) return false;
        if (isMulti(c.field)) return Array.isArray(c.values) && c.values.length > 0;
        return Boolean(String(c.value).trim());
      });
      if (validItems.length === 0) {
        setMessage({ type: 'error', text: 'Add at least one rule condition with a value for dynamic type.' });
        return;
      }
    }
    setMessage(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: trimmedName,
        alias: alias.trim() || undefined,
        type,
        publish,
        description: description.trim() || undefined,
        default_sort_order: defaultSortOrder || undefined,
        substore: substores.length > 0 ? substores : undefined,
      };
      if (type === 'dynamic') {
        const isMulti = (f: string) =>
          MULTI_VALUE_FIELDS.includes(f as (typeof MULTI_VALUE_FIELDS)[number]);
        const validItems = ruleItems
          .filter((c) => {
            if (!c.field || !c.operator) return false;
            if (isMulti(c.field)) return Array.isArray(c.values) && c.values.length > 0;
            return Boolean(String(c.value).trim());
          })
          .map((c) => {
            if (isMulti(c.field)) {
              return { field: c.field, operator: c.operator, values: c.values! };
            }
            return { field: c.field, operator: c.operator, value: c.value.trim() };
          });
        body.filters = [{ rule_operator: ruleOperator, items: validItems }];
      }
      const res = await fetch('/api/collection-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({
          type: 'error',
          text: data.message ?? 'Failed to create collection',
        });
        setSaving(false);
        return;
      }
      setMessage({ type: 'success', text: 'Collection created successfully.' });
      setName('');
      setAlias('');
      aliasManuallyEditedRef.current = false;
      setType('manual');
      setPublish(0);
      setDescription('');
      setDefaultSortOrder('');
      setSubstores([]);
      setRuleOperator('AND');
      setRuleItems([{ ...initialRuleCondition }]);
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

  const handleRemoveHub = (hub: string) => {
    const hubSubstores = getSubstoresByHub(hub);
    setSubstores((prev) =>
      prev.filter((s) => !hubSubstores.includes(s))
    );
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
            <label className="block sm:col-span-2">
              <span className="block text-sm font-medium text-slate-700 mb-1.5">
                Alias
              </span>
              <input
                type="text"
                value={alias}
                onChange={(e) => {
                  aliasManuallyEditedRef.current = true;
                  setAlias(e.target.value);
                }}
                className={inputClass}
                placeholder="Auto-filled from name (editable)"
              />
            </label>
            <div className="block">
              <CustomSelect
                label="Type"
                value={type}
                onChange={(v) => setType(v as 'manual' | 'dynamic')}
                options={TYPE_OPTIONS}
                searchable={false}
                placeholder="Choose..."
              />
            </div>
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
            {type === 'dynamic' && (
              <div className="sm:col-span-2">
                <CollectionRuleSection
                  ruleOperator={ruleOperator}
                  ruleItems={ruleItems}
                  onRuleOperatorChange={setRuleOperator}
                  onAddCondition={handleAddCondition}
                  onRemoveRuleItem={handleRemoveRuleItem}
                  onUpdateRuleItem={handleUpdateRuleItem}
                />
              </div>
            )}
            <div className="block sm:col-span-2">
              <CustomSelect
                label="Default sort order"
                value={defaultSortOrder}
                onChange={setDefaultSortOrder}
                options={DEFAULT_SORT_OPTIONS}
                searchable={true}
                placeholder="Choose..."
              />
            </div>
            <div className="block sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Substore
              </label>
              <SubstoreMultiPicker
                value={substores}
                options={hubOptions}
                onChange={setSubstores}
                optionToSubstores={getSubstoresByHub}
              />
              {getSelectedHubsFromSubstores(substores).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {getSelectedHubsFromSubstores(substores).map((hub) => (
                    <span
                      key={hub}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F4F6F8] px-2.5 py-1 text-sm text-slate-800 shadow-sm"
                    >
                      {hub}
                      <button
                        type="button"
                        onClick={() => handleRemoveHub(hub)}
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                        aria-label={`Remove ${hub}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
