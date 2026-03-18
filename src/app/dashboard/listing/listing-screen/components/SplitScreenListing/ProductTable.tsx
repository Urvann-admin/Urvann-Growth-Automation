'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Trash2,
  AlertCircle,
  Check,
  ChevronDown,
  Plus,
  Package,
  Settings2,
  Building2,
  ClipboardCheck,
  Search,
  X,
  Save,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import type { ProductRow, ParentItemRow, SelectedImage } from './types';
import type { ParentMaster } from '@/models/parentMaster';
import type { ListingSection } from '@/models/listingProduct';
import { HUB_MAPPINGS } from '@/shared/constants/hubs';
import { CustomSelect } from '@/app/dashboard/listing/components/CustomSelect';

const TAG_OPTIONS = [
  { value: 'Bestseller', label: 'Bestseller' },
  { value: 'New Arrival', label: 'New Arrival' },
  { value: 'Sale', label: 'Sale' },
  { value: 'Featured', label: 'Featured' },
  { value: 'Trending', label: 'Trending' },
  { value: 'Clearance', label: 'Clearance' },
  { value: 'Limited Stock', label: 'Limited Stock' },
];

const STEPS = [
  { id: 'parent', label: 'Parent', icon: Package },
  { id: 'pricing', label: 'Pricing', icon: Settings2 },
  { id: 'hub-seller', label: 'Hub & Seller', icon: Building2 },
  { id: 'review', label: 'Review', icon: ClipboardCheck },
] as const;

const proxyImageUrl = (url: string) =>
  url.startsWith('/') ? url : `/api/image-collection/proxy?url=${encodeURIComponent(url)}`;

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function InlineInput({
  value,
  onChange,
  type = 'text',
  placeholder,
  label,
  error,
}: {
  value: string | number;
  onChange: (value: string | number) => void;
  type?: 'text' | 'number';
  placeholder?: string;
  label?: string;
  error?: string;
}) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => {
          const v = type === 'number' ? (e.target.value ? parseFloat(e.target.value) : '') : e.target.value;
          onChange(v);
        }}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-white transition-colors focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none ${
          error ? 'border-red-300' : 'border-slate-200 hover:border-slate-300'
        }`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HubMultiSelect – multi-select hub picker with Select All / Deselect All
// ---------------------------------------------------------------------------

function HubMultiSelect({
  selectedHubs,
  hubOptions,
  onChange,
  error,
}: {
  selectedHubs: string[];
  hubOptions: { value: string; label: string }[];
  onChange: (hubs: string[]) => void;
  error?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (isOpen) updatePosition();
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? hubOptions.filter((o) => o.label.toLowerCase().includes(q)) : hubOptions;
  }, [hubOptions, search]);

  const allSelected = hubOptions.length > 0 && hubOptions.every((o) => selectedHubs.includes(o.value));

  const toggle = (hub: string) => {
    if (selectedHubs.includes(hub)) {
      onChange(selectedHubs.filter((h) => h !== hub));
    } else {
      onChange([...selectedHubs, hub]);
    }
  };

  const selectAll = () => onChange(hubOptions.map((o) => o.value));
  const deselectAll = () => onChange([]);

  const dropdownContent = isOpen && typeof document !== 'undefined' && createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
      style={{ top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px`, width: `${dropdownPosition.width}px` }}
    >
      {/* Search */}
      <div className="p-2 border-b border-slate-100">
        <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-lg">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hubs…"
            className="flex-1 text-xs bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
          />
        </div>
      </div>
      {/* Select All / Deselect All */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50">
        <button
          type="button"
          onClick={selectAll}
          disabled={allSelected}
          className="text-xs font-medium text-[#E6007A] hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Select All
        </button>
        <span className="text-slate-300">·</span>
        <button
          type="button"
          onClick={deselectAll}
          disabled={selectedHubs.length === 0}
          className="text-xs font-medium text-slate-500 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Deselect All
        </button>
      </div>
      {/* Options */}
      <div className="max-h-52 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No hubs found</p>
        ) : (
          filtered.map((option) => {
            const checked = selectedHubs.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggle(option.value)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors hover:bg-pink-50 ${
                  checked ? 'bg-pink-50/60 text-[#E6007A]' : 'text-slate-700'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    checked ? 'bg-[#E6007A] border-[#E6007A]' : 'border-slate-300'
                  }`}
                >
                  {checked && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
                {option.label}
              </button>
            );
          })
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-slate-500 mb-1.5">
        Hub <span className="text-red-400">*</span>
        {selectedHubs.length > 0 && (
          <span className="ml-2 text-[#E6007A] font-semibold">
            {selectedHubs.length} selected
            {selectedHubs.length > 1 && <span className="font-normal text-slate-400"> → {selectedHubs.length} listings will be created</span>}
          </span>
        )}
      </label>

      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm border rounded-xl bg-white transition-colors focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none text-left ${
          error ? 'border-red-300' : isOpen ? 'border-pink-400' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className={selectedHubs.length === 0 ? 'text-slate-400' : 'text-slate-800'}>
          {selectedHubs.length === 0
            ? 'Select hubs…'
            : selectedHubs.length === hubOptions.length
            ? 'All hubs'
            : selectedHubs.join(', ')}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      {dropdownContent}
    </div>
  );
}

function ParentSearchSelect({
  value,
  onChange,
  availableParents,
  error,
}: {
  value: string;
  onChange: (parentSku: string, parent?: ParentMaster) => void;
  availableParents: ParentMaster[];
  error?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedParent = availableParents.find((p) => p.sku === value);

  const filteredParents = useMemo(() => {
    if (!searchQuery.trim()) return availableParents;
    const query = searchQuery.toLowerCase();
    return availableParents.filter(
      (parent) =>
        parent.plant.toLowerCase().includes(query) ||
        (parent.sku && parent.sku.toLowerCase().includes(query))
    );
  }, [availableParents, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = buttonRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideTrigger && !insideDropdown) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateDropdownPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) updateDropdownPosition();
  }, [isOpen, updateDropdownPosition]);

  // Keep dropdown aligned with the field when page or any scrollable container scrolls
  useEffect(() => {
    if (!isOpen) return;
    // Use capture so we hear scroll from any scrollable ancestor (scroll doesn't always bubble in all browsers)
    window.addEventListener('scroll', updateDropdownPosition, true);
    window.addEventListener('resize', updateDropdownPosition);
    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [isOpen, updateDropdownPosition]);

  const dropdownContent = isOpen && typeof document !== 'undefined' && (
    createPortal(
      <div
        ref={dropdownRef}
        className="fixed z-[9999] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
        }}
      >
        <div className="p-2 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search parents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filteredParents.length === 0 ? (
            <div className="p-3 text-sm text-slate-500 text-center">No parents found</div>
          ) : (
            filteredParents.map((parent) => {
              const isSelected = parent.sku === value;
              return (
                <button
                  key={parent.sku}
                  type="button"
                  onClick={() => {
                    onChange(parent.sku || '', parent);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full px-3 py-2.5 text-left text-sm transition-colors flex items-center justify-between ${
                    isSelected ? 'bg-pink-50 text-[#E6007A]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-medium">{parent.plant}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {parent.sku} · ₹{parent.price} · {parent.inventory_quantity ?? 0} available
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#E6007A] shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </div>,
      document.body
    )
  );

  return (
    <div className="relative flex-1">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2.5 text-sm text-left border rounded-xl bg-white hover:border-slate-300 transition-colors flex items-center justify-between ${
          error ? 'border-red-300' : isOpen ? 'border-pink-500 ring-2 ring-pink-500' : 'border-slate-200'
        }`}
      >
        <span className={selectedParent ? 'text-slate-900 font-medium' : 'text-slate-400'}>
          {selectedParent ? selectedParent.plant : 'Parent...'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {dropdownContent}
    </div>
  );
}

function ReviewField({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="p-3 bg-slate-50 rounded-xl">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div
        className={`text-sm ${highlight ? 'font-semibold text-[#E6007A]' : 'text-slate-800'} ${
          mono ? 'font-mono text-xs' : ''
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProductTable – wrapper that loads shared data and renders cards
// ---------------------------------------------------------------------------

interface ProductTableProps {
  productRows: ProductRow[];
  availableParents: ParentMaster[];
  onUpdateRow: (rowId: string, updates: Partial<ProductRow>) => void;
  onRemoveRow: (rowId: string) => void;
  section: ListingSection;
  isLoading: boolean;
  isSaving: boolean;
  allImages: SelectedImage[];
  onAssignImage: (rowId: string, image: SelectedImage) => void;
  onSaveRow: (rowId: string) => void;
}

export function ProductTable({
  productRows,
  availableParents,
  onUpdateRow,
  onRemoveRow,
  section,
  isLoading,
  isSaving,
  allImages,
  onAssignImage,
  onSaveRow,
}: ProductTableProps) {
  const hubOptions = useMemo(
    () => HUB_MAPPINGS.map((mapping) => ({ value: mapping.hub, label: mapping.hub })),
    []
  );

  const [sellerOptions, setSellerOptions] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/procurement-seller-master?limit=500')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success || !Array.isArray(data.data)) return;
        setSellerOptions(
          data.data.map((s: { _id: string; seller_name: string }) => ({
            value: String(s._id),
            label: s.seller_name || String(s._id),
          }))
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const [collectionNames, setCollectionNames] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    fetch('/api/collection-master?limit=500')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success || !Array.isArray(data.data)) return;
        const map: Record<string, string> = {};
        data.data.forEach((c: { _id: string; name?: string }) => {
          map[String(c._id)] = c.name || String(c._id);
        });
        setCollectionNames(map);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const collectionOptions = useMemo(
    () => Object.entries(collectionNames).map(([value, label]) => ({ value, label: label || value })),
    [collectionNames]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
      </div>
    );
  }

  if (productRows.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center px-6">
          <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-pink-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 mb-1">No products yet</h3>
          <p className="text-sm text-slate-500">Click &ldquo;+ Add Row&rdquo; to start creating products</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {productRows.map((row, index) => {
        const displayImage = row.taggedImages?.[0] ?? allImages[index] ?? null;
        return (
          <ProductCard
            key={row.id}
            row={row}
            index={index}
            displayImage={displayImage}
            allImages={allImages}
            onAssignImage={onAssignImage}
            availableParents={availableParents}
            onUpdateRow={onUpdateRow}
            onRemoveRow={onRemoveRow}
            onSaveRow={onSaveRow}
            section={section}
            isSaving={isSaving}
            hubOptions={hubOptions}
            sellerOptions={sellerOptions}
            collectionOptions={collectionOptions}
            collectionNames={collectionNames}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProductCard – single product card with photo, steps, and save
// ---------------------------------------------------------------------------

interface ProductCardProps {
  row: ProductRow;
  index: number;
  displayImage: SelectedImage | null;
  allImages: SelectedImage[];
  onAssignImage: (rowId: string, image: SelectedImage) => void;
  availableParents: ParentMaster[];
  onUpdateRow: (rowId: string, updates: Partial<ProductRow>) => void;
  onRemoveRow: (rowId: string) => void;
  onSaveRow: (rowId: string) => void;
  section: ListingSection;
  isSaving: boolean;
  hubOptions: { value: string; label: string }[];
  sellerOptions: { value: string; label: string }[];
  collectionOptions: { value: string; label: string }[];
  collectionNames: Record<string, string>;
}

function ProductCard({
  row,
  index,
  displayImage,
  allImages,
  onAssignImage,
  availableParents,
  onUpdateRow,
  onRemoveRow,
  onSaveRow,
  section,
  isSaving,
  hubOptions,
  sellerOptions,
  collectionOptions,
  collectionNames,
}: ProductCardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showImagePicker, setShowImagePicker] = useState(false);

  // Per-card SKU preview for all selected hubs
  const selectedHubs = row.hubs ?? [];
  const [skuPreviews, setSkuPreviews] = useState<Record<string, string>>({});
  const skuRequestedRef = useRef<string>('');
  useEffect(() => {
    if (row.sku || selectedHubs.length === 0 || !row.plant?.trim()) return;
    const key = `${selectedHubs.join('|')}|${row.plant}|${row.setQuantity ?? 1}`;
    if (skuRequestedRef.current === key) return;
    skuRequestedRef.current = key;
    const setQty = String(row.setQuantity ?? 1);
    Promise.all(
      selectedHubs.map((hub) =>
        fetch(`/api/listing-product/preview-sku?${new URLSearchParams({ hub, plant: row.plant!, setQuantity: setQty })}`)
          .then((r) => r.json())
          .then((data) => ({ hub, sku: data.success ? data.sku : '—' }))
          .catch(() => ({ hub, sku: '—' }))
      )
    ).then((results) => {
      setSkuPreviews(Object.fromEntries(results.map((r) => [r.hub, r.sku])));
    });
  }, [row.sku, row.plant, row.setQuantity, selectedHubs.join(',')]);

  // Per-card rule-based categories (loaded when reaching review step)
  const [ruleBasedCategories, setRuleBasedCategories] = useState<string[]>([]);
  useEffect(() => {
    if (currentStep !== 3 || !row.plant?.trim()) return;
    const payload = {
      plant: row.plant.trim(),
      variety: row.variety?.trim() || undefined,
      colour: row.colour?.trim() || undefined,
      height: typeof row.height === 'number' ? row.height : undefined,
      size: typeof row.size === 'number' ? row.size : undefined,
      type: row.type?.trim() || undefined,
    };
    fetch('/api/categories/evaluate-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.categories)) setRuleBasedCategories(data.categories);
      })
      .catch(() => {});
  }, [currentStep, row.plant, row.variety, row.colour, row.height, row.size, row.type]);

  // --- Helpers ---

  const recalculatePriceAndInventory = (r: ProductRow): { price: number; inventory: number } => {
    let totalPrice = 0;
    let minInventory = Infinity;
    r.parentItems.forEach((item) => {
      const parent = item.parent;
      if (!parent || !item.quantity) return;
      totalPrice += (item.unitPrice || parent.price || 0) * item.quantity;
      const possibleSets = Math.floor((parent.inventory_quantity ?? 0) / item.quantity);
      minInventory = Math.min(minInventory, possibleSets);
    });
    return { price: totalPrice, inventory: minInventory === Infinity ? 0 : minInventory };
  };

  const calcSetQuantity = (items: ParentItemRow[]): number =>
    items.reduce((sum, i) => sum + (i.quantity || 0), 0) || 1;

  const getFinalName = (): string => {
    const parentNames = row.parentItems
      .filter((item) => item.parent)
      .map((item) => {
        const name = String((item.parent!.finalName || item.parent!.plant || '').trim());
        const idx = name.toLowerCase().indexOf(' in ');
        return idx >= 0 ? name.slice(0, idx).trim() : name;
      })
      .filter(Boolean);
    const size = typeof row.size === 'number' ? row.size : Number(row.size);
    const setQty = row.setQuantity ?? 1;
    if (parentNames.length === 0) {
      const fallbackParts = [row.plant];
      if (size) fallbackParts.push(`in ${size} inch`);
      if (row.type) fallbackParts.push(row.type);
      return row.plant ? fallbackParts.join(' ').trim() || '—' : '—';
    }
    const parts = [parentNames.length === 1 ? parentNames[0] : parentNames.join(' & ')];
    if (size) parts.push(`in ${size} inch`);
    if (row.type) parts.push(row.type);
    const base = parts.join(' ');
    if (setQty > 1) return `Set of ${setQty} ${base}`;
    return base;
  };

  const stepComplete = (step: number): boolean => {
    switch (step) {
      case 0: return row.parentItems.length > 0 && row.parentItems.some((i) => i.parentSku);
      case 1: return row.price > 0;
      case 2: return (row.hubs ?? []).length > 0;
      case 3: return row.isValid;
      default: return false;
    }
  };

  // --- Parent item handlers ---

  const handleParentItemChange = (itemIndex: number, updates: Partial<ParentItemRow>) => {
    const updatedItems = row.parentItems.map((item, i) => (i === itemIndex ? { ...item, ...updates } : item));
    const cleanedItems = updatedItems.filter((item) => item.parentSku && item.quantity > 0);
    const { price, inventory } = recalculatePriceAndInventory({ ...row, parentItems: cleanedItems });
    const setQty = calcSetQuantity(cleanedItems);
    onUpdateRow(row.id, {
      parentItems: cleanedItems,
      parentSkus: cleanedItems.map((i) => i.parentSku),
      price,
      inventory_quantity: inventory,
      setQuantity: setQty,
      quantity: setQty,
    });
  };

  const handleAddParentItem = () => {
    const newItem: ParentItemRow = {
      id: `parent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      parentSku: '',
      quantity: 1,
      unitPrice: 0,
    };
    const updatedItems = [...row.parentItems, newItem];
    onUpdateRow(row.id, {
      parentItems: updatedItems,
      parentSkus: updatedItems.map((i) => i.parentSku).filter(Boolean),
    });
  };

  const handleSelectFirstParent = (parent: ParentMaster) => {
    const newItem: ParentItemRow = {
      id: `parent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      parentSku: parent.sku || '',
      quantity: 1,
      unitPrice: parent.price || 0,
      parent,
    };
    const { price, inventory } = recalculatePriceAndInventory({ ...row, parentItems: [newItem] });
    const setQty = calcSetQuantity([newItem]);
    onUpdateRow(row.id, {
      parentItems: [newItem],
      parentSkus: [parent.sku || ''],
      plant: parent.plant || row.plant,
      otherNames: parent.otherNames || row.otherNames,
      variety: parent.variety || row.variety,
      colour: parent.colour || row.colour,
      height: parent.height ?? row.height,
      hubs: (row.hubs ?? []).length > 0 ? row.hubs : [],
      seller: row.seller || parent.seller || '',
      categories: Array.from(new Set([...(row.categories || []), ...(parent.categories || [])])),
      collectionIds: Array.from(
        new Set([...(row.collectionIds || []), ...(parent.collectionIds?.map((id) => String(id)) || [])])
      ),
      price,
      inventory_quantity: inventory,
      setQuantity: setQty,
      quantity: setQty,
    });
  };

  const handleRemoveParentItem = (itemIndex: number) => {
    const updatedItems = row.parentItems.filter((_, i) => i !== itemIndex);
    const combinedCategories = new Set<string>();
    const combinedCollectionIds = new Set<string>();
    updatedItems.forEach((item) => {
      if (item.parent) {
        (item.parent.categories || []).forEach((c) => combinedCategories.add(c));
        (item.parent.collectionIds || []).map((id) => String(id)).forEach((c) => combinedCollectionIds.add(c));
      }
    });
    const { price, inventory } = recalculatePriceAndInventory({ ...row, parentItems: updatedItems });
    const setQty = calcSetQuantity(updatedItems);
    onUpdateRow(row.id, {
      parentItems: updatedItems,
      parentSkus: updatedItems.map((i) => i.parentSku),
      categories: Array.from(combinedCategories),
      collectionIds: Array.from(combinedCollectionIds),
      price,
      inventory_quantity: inventory,
      setQuantity: setQty,
      quantity: setQty,
    });
  };

  const handleParentChange = (itemIndex: number, parentSku: string, parent?: ParentMaster) => {
    if (parent) {
      const updatedItem: Partial<ParentItemRow> = {
        parentSku: parent.sku || '',
        unitPrice: parent.price || 0,
        parent,
      };
      const updatedItems = row.parentItems.map((item, i) => (i === itemIndex ? { ...item, ...updatedItem } : item));
      const combinedCategories = new Set<string>();
      const combinedCollectionIds = new Set<string>();
      updatedItems.forEach((item) => {
        if (item.parent) {
          (item.parent.categories || []).forEach((c) => combinedCategories.add(c));
          (item.parent.collectionIds || []).map((id) => String(id)).forEach((c) => combinedCollectionIds.add(c));
        }
      });
      const baseUpdates: Partial<ProductRow> =
        itemIndex === 0
          ? {
              plant: parent.plant || row.plant,
              otherNames: parent.otherNames || row.otherNames,
              variety: parent.variety || row.variety,
              colour: parent.colour || row.colour,
              height: parent.height ?? row.height,
              hubs: (row.hubs ?? []).length > 0 ? row.hubs : [],
              seller: row.seller || parent.seller || '',
              categories: Array.from(combinedCategories),
              collectionIds: Array.from(combinedCollectionIds),
            }
          : { categories: Array.from(combinedCategories), collectionIds: Array.from(combinedCollectionIds) };
      const tempRow: ProductRow = { ...row, parentItems: updatedItems, ...baseUpdates };
      const { price, inventory } = recalculatePriceAndInventory(tempRow);
      const setQty = calcSetQuantity(tempRow.parentItems);
      onUpdateRow(row.id, {
        ...baseUpdates,
        parentItems: tempRow.parentItems,
        parentSkus: tempRow.parentItems.map((i) => i.parentSku),
        price,
        inventory_quantity: inventory,
        setQuantity: setQty,
        quantity: setQty,
      });
    } else {
      handleParentItemChange(itemIndex, { parentSku });
    }
  };

  // --- Render ---

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex min-h-[280px]">
        {/* Left: Photo */}
        <div className="w-52 shrink-0 border-r border-slate-100 bg-slate-50 p-4 flex flex-col">
          <div
            className="aspect-square w-full rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center cursor-pointer relative group"
            onClick={() => setShowImagePicker((v) => !v)}
          >
            {displayImage ? (
              <img src={proxyImageUrl(displayImage.url)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-slate-300 flex flex-col items-center gap-1">
                <ImageIcon className="w-10 h-10" />
                <span className="text-[10px]">No photo</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 px-2 py-1 rounded-lg">
                Change
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 text-center mt-2 truncate">
            #{index + 1}{displayImage ? ` · ${displayImage.filename}` : ''}
          </p>

          {/* Mini image picker */}
          {showImagePicker && allImages.length > 0 && (
            <div className="mt-3 border border-slate-200 rounded-xl bg-white max-h-40 overflow-y-auto">
              <div className="p-1.5 grid grid-cols-3 gap-1">
                {allImages.slice(0, 30).map((img) => {
                  const isCurrent = displayImage?.url === img.url;
                  return (
                    <button
                      key={img.url}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssignImage(row.id, img);
                        setShowImagePicker(false);
                      }}
                      className={`aspect-square rounded-md overflow-hidden border-2 transition-all ${
                        isCurrent ? 'border-[#E6007A] ring-1 ring-[#E6007A]' : 'border-transparent hover:border-pink-200'
                      }`}
                    >
                      <img src={proxyImageUrl(img.url)} alt="" className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Steps */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Stepper */}
          <div className="px-4 py-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center">
              {STEPS.map((step, idx) => {
                const isActive = currentStep === idx;
                const isCompleted = stepComplete(idx);
                const StepIcon = step.icon;
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <button
                      onClick={() => setCurrentStep(idx)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-pink-100 text-[#E6007A]'
                          : isCompleted
                          ? 'text-[#E6007A] hover:bg-pink-50'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          isActive
                            ? 'text-white'
                            : isCompleted
                            ? 'bg-pink-100 text-[#E6007A]'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                        style={isActive ? { backgroundColor: '#E6007A' } : undefined}
                      >
                        {isCompleted && !isActive ? <Check className="w-3.5 h-3.5" /> : <StepIcon className="w-3.5 h-3.5" />}
                      </div>
                      <span className="hidden md:inline">{step.label}</span>
                    </button>
                    {idx < STEPS.length - 1 && (
                      <div className={`flex-1 h-px mx-1 ${stepComplete(idx) ? 'bg-pink-200' : 'bg-slate-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step content */}
          <div className="flex-1 min-h-0 overflow-auto p-5">
            {/* Step 0: Parent Selection */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Parent Products</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Add parent products and specify quantities</p>
                </div>
                <div className="space-y-3">
                  {(row.parentItems.length === 0
                    ? [{ id: 'empty_0', parentSku: '', quantity: 1, unitPrice: 0 } as ParentItemRow]
                    : row.parentItems
                  ).map((item, itemIdx) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex-1 min-w-0">
                        <ParentSearchSelect
                          value={item.parentSku}
                          onChange={(parentSku, parent) =>
                            row.parentItems.length === 0 && itemIdx === 0 && parent
                              ? handleSelectFirstParent(parent)
                              : handleParentChange(itemIdx, parentSku, parent)
                          }
                          availableParents={availableParents}
                          error={itemIdx === 0 ? row.validationErrors.parent : undefined}
                        />
                      </div>
                      <div className="w-[1px] self-stretch min-h-6 bg-slate-200 shrink-0" aria-hidden />
                      <div className="min-w-[120px] shrink-0 text-xs text-slate-500 flex items-center gap-2">
                        {item.parent && (
                          <>
                            <span className="font-mono text-slate-700 truncate" title={item.parentSku}>{item.parentSku}</span>
                            <span className="text-slate-400">·</span>
                            <span>{item.parent.inventory_quantity ?? 0} in stock</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Qty</span>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleParentItemChange(itemIdx, { quantity: Number(e.target.value) || 1 })}
                          className="w-16 px-2 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                          min={1}
                        />
                      </div>
                      {row.parentItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveParentItem(itemIdx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                          title="Remove parent"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddParentItem}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E6007A] hover:bg-pink-50 px-3 py-2 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add another parent
                </button>
              </div>
            )}

            {/* Step 1: Pricing & Details */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Pricing & Details</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Set pricing and additional product details</p>
                </div>
                <div className="p-4 bg-pink-50 rounded-xl border border-pink-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#E6007A]">Calculated Price</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-[#330033]">₹{row.price.toLocaleString()}</span>
                      <input
                        type="number"
                        value={row.price || ''}
                        onChange={(e) => onUpdateRow(row.id, { price: Number(e.target.value) || 0 })}
                        className="w-24 px-2 py-1 text-sm border border-pink-200 rounded-lg bg-white text-right focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                        placeholder="Override"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InlineInput
                    value={row.compare_at_price ?? ''}
                    onChange={(value) => onUpdateRow(row.id, { compare_at_price: value === '' ? undefined : Number(value) })}
                    type="number"
                    placeholder="Compare at price"
                    label="Compare at Price (₹)"
                  />
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Tags</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(row.tags || []).map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium">
                          {tag}
                          <button
                            type="button"
                            onClick={() => onUpdateRow(row.id, { tags: (row.tags || []).filter((t) => t !== tag) })}
                            className="p-0.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <CustomSelect
                      value=""
                      onChange={(value) => {
                        if (!value) return;
                        const tags = row.tags || [];
                        if (tags.includes(value)) return;
                        onUpdateRow(row.id, { tags: [...tags, value] });
                      }}
                      options={TAG_OPTIONS.filter((opt) => !(row.tags || []).includes(opt.value))}
                      placeholder="Add tag..."
                      searchable={false}
                      closeOnSelect={false}
                    />
                  </div>
                  <InlineInput
                    value={row.sort_order ?? 3000}
                    onChange={(value) => onUpdateRow(row.id, { sort_order: value === '' ? 3000 : Number(value) })}
                    type="number"
                    placeholder="3000"
                    label="Sort Order"
                  />
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Set Quantity</label>
                    <div className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-medium">
                      {row.setQuantity ?? 1}
                      <span className="ml-2 text-xs text-slate-400 font-normal">(auto from parents)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Hub & Seller */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Hub & Seller</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Select one or more hubs — a separate listing with its own SKU will be created for each hub</p>
                </div>
                <div className="grid grid-cols-1 gap-4 max-w-md">
                  <HubMultiSelect
                    selectedHubs={row.hubs ?? []}
                    hubOptions={hubOptions}
                    onChange={(hubs) => onUpdateRow(row.id, { hubs })}
                    error={row.validationErrors.hub}
                  />
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Seller</label>
                    <CustomSelect
                      value={row.seller ?? ''}
                      onChange={(value) => onUpdateRow(row.id, { seller: value })}
                      options={sellerOptions}
                      placeholder="Seller"
                      searchable={true}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Review</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Review and edit all details before saving</p>
                </div>

                <div className="flex items-center gap-2">
                  {row.isSaved ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                      <Check className="w-3.5 h-3.5" /> Saved
                    </span>
                  ) : row.isValid ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-50 text-[#E6007A] text-xs font-medium">
                      <Check className="w-3.5 h-3.5" /> Ready to save
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-xs font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> Incomplete
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <ReviewField label="Product Name" value={getFinalName()} />
                  <ReviewField
                    label="SKU"
                    value={
                      row.sku
                        ? row.sku
                        : selectedHubs.length > 0 && row.plant?.trim()
                        ? Object.keys(skuPreviews).length > 0
                          ? selectedHubs.map((h) => `${h}: ${skuPreviews[h] ?? '—'}`).join(', ')
                          : 'Generating…'
                        : '—'
                    }
                    mono
                  />
                  <ReviewField
                    label="Parents"
                    value={
                      row.parentItems.length > 0
                        ? row.parentItems.filter((i) => i.parent).map((i) => `${i.parent!.plant} ×${i.quantity}`).join(', ') || '—'
                        : '—'
                    }
                  />
                  <ReviewField label="Set Qty" value={String(row.setQuantity ?? 1)} />
                  <ReviewField label="Inventory" value={String(row.inventory_quantity)} highlight />
                  <ReviewField
                    label="Categories"
                    value={(() => {
                      const combined = Array.from(new Set([...(row.categories || []), ...ruleBasedCategories]));
                      return combined.length ? combined.join(', ') : '—';
                    })()}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <HubMultiSelect
                      selectedHubs={row.hubs ?? []}
                      hubOptions={hubOptions}
                      onChange={(hubs) => onUpdateRow(row.id, { hubs })}
                      error={row.validationErrors.hub}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Seller</label>
                    <CustomSelect
                      value={row.seller ?? ''}
                      onChange={(value) => onUpdateRow(row.id, { seller: value })}
                      options={sellerOptions}
                      placeholder="Seller"
                      searchable={true}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Price (₹)</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#330033]">₹{row.price.toLocaleString()}</span>
                      <input
                        type="number"
                        value={row.price || ''}
                        onChange={(e) => onUpdateRow(row.id, { price: Number(e.target.value) || 0 })}
                        className="flex-1 px-2 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                        placeholder="Override"
                      />
                    </div>
                  </div>
                  <InlineInput
                    value={row.compare_at_price ?? ''}
                    onChange={(value) => onUpdateRow(row.id, { compare_at_price: value === '' ? undefined : Number(value) })}
                    type="number"
                    placeholder="Compare at price"
                    label="Compare at Price (₹)"
                  />
                  <InlineInput
                    value={row.sort_order ?? 3000}
                    onChange={(value) => onUpdateRow(row.id, { sort_order: value === '' ? 3000 : Number(value) })}
                    type="number"
                    placeholder="3000"
                    label="Sort Order"
                  />
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Tags</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(row.tags || []).map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium">
                          {tag}
                          <button
                            type="button"
                            onClick={() => onUpdateRow(row.id, { tags: (row.tags || []).filter((t) => t !== tag) })}
                            className="p-0.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <CustomSelect
                      value=""
                      onChange={(value) => {
                        if (!value) return;
                        const tags = row.tags || [];
                        if (tags.includes(value)) return;
                        onUpdateRow(row.id, { tags: [...tags, value] });
                      }}
                      options={TAG_OPTIONS.filter((opt) => !(row.tags || []).includes(opt.value))}
                      placeholder="Add tag..."
                      searchable={false}
                      closeOnSelect={false}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Collections</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(row.collectionIds || []).map((id) => (
                        <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium">
                          {collectionNames[id] ?? id}
                          <button
                            type="button"
                            onClick={() => onUpdateRow(row.id, { collectionIds: (row.collectionIds || []).filter((cid) => cid !== id) })}
                            className="p-0.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <CustomSelect
                      value=""
                      onChange={(value) => {
                        if (!value) return;
                        const ids = row.collectionIds || [];
                        if (ids.includes(value)) return;
                        onUpdateRow(row.id, { collectionIds: [...ids, value] });
                      }}
                      options={collectionOptions.filter((opt) => !(row.collectionIds || []).includes(opt.value))}
                      placeholder="Add collection..."
                      searchable={true}
                      closeOnSelect={false}
                    />
                  </div>
                </div>

                {Object.keys(row.validationErrors).length > 0 && !row.isValid && (
                  <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                    <p className="text-xs font-medium text-red-700 mb-1">Missing fields:</p>
                    <ul className="space-y-0.5">
                      {Object.entries(row.validationErrors).map(([key, msg]) => (
                        <li key={key} className="text-xs text-red-600 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                          {msg}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between bg-slate-50/50">
        <button
          onClick={() => onRemoveRow(row.id)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Remove
        </button>

        <div className="flex items-center gap-2">
          {STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`w-2 h-2 rounded-full transition-all ${idx === currentStep ? 'w-5' : 'bg-slate-300 hover:bg-slate-400'}`}
              style={idx === currentStep ? { backgroundColor: '#E6007A' } : undefined}
            />
          ))}
        </div>

        <button
          onClick={() => onSaveRow(row.id)}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          style={{ backgroundColor: '#E6007A' }}
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>
      </div>
    </div>
  );
}
