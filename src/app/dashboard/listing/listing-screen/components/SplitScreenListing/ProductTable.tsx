'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  ChevronRight,
} from 'lucide-react';
import type {
  ProductRow,
  ParentItemRow,
  SelectedImage,
  ListingScreenMode,
  ListingSourcedParentOption,
} from './types';
import type { ParentMaster } from '@/models/parentMaster';
import { HUB_MAPPINGS } from '@/shared/constants/hubs';
import { CustomSelect } from '@/app/dashboard/listing/components/CustomSelect';
import { compareAtFromCalculatedChildListingPrice } from '@/lib/childListingCompareAt';
import { childListingSetQuantityFromParentItems } from '@/lib/childListingSetQuantity';
import { buildChildListingAutoProductName } from '@/lib/childListingProductName';
import { mergeParentDescriptionsForChildListing } from '@/lib/childListingDescription';
import { computeProductDisplayName } from '@/lib/productListingDisplayName';
import { redirectOptionTokenToUrl } from '@/lib/redirectOptionTokens';
import {
  buildDefaultSeoTitle,
  buildDefaultSeoDescription,
} from '@/app/dashboard/listing/listing-screen/components/ListingProductForm/types';
import { PRODUCT_TAG_OPTIONS } from '@/lib/productTagOptions';

const STEPS = [
  { id: 'parent', label: 'Parent', icon: Package },
  { id: 'pricing', label: 'Pricing', icon: Settings2 },
  { id: 'hub-seller', label: 'Hub & Seller', icon: Building2 },
  { id: 'review', label: 'Review', icon: ClipboardCheck },
] as const;

const REVIEW_STEP_INDEX = STEPS.length - 1;

const proxyImageUrl = (url: string) =>
  url.startsWith('/') ? url : `/api/image-collection/proxy?url=${encodeURIComponent(url)}`;

/** Plain text for read-only preview of rich-text description */
function stripHtmlToPlain(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCommaList(s: string | undefined): string[] {
  if (!s || typeof s !== 'string') return [];
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

/** Child listing: same label as product name snapshot (plant or auto-composed from parents). */
function childListingPreviewDisplayName(row: ProductRow): string {
  const trimmed = row.plant?.trim();
  if (trimmed) return trimmed;
  const auto = buildChildListingAutoProductName(row);
  if (auto && auto !== '—') return auto;
  return 'plant';
}

/**
 * When parent line(s) change, refresh default SEO if the user has not customized it.
 * Uses combined child name (not the first parent alone). Handles stale `row.plant` before the
 * auto-sync effect runs after parent changes.
 */
function childListingSeoPatch(
  rowBefore: ProductRow,
  rowAfter: ProductRow
): Partial<Pick<ProductRow, 'seoTitle' | 'seoDescription'>> | undefined {
  const plantBefore = rowBefore.plant?.trim() ?? '';
  const autoBefore = buildChildListingAutoProductName(rowBefore);
  const autoAfter = buildChildListingAutoProductName(rowAfter);

  const prevSeed =
    plantBefore || (autoBefore && autoBefore !== '—' ? autoBefore : 'plant');

  const nameWasSynced =
    !plantBefore ||
    (autoBefore && autoBefore !== '—' && plantBefore === autoBefore);

  const newSeed = nameWasSynced
    ? autoAfter && autoAfter !== '—'
      ? autoAfter
      : prevSeed
    : plantBefore || (autoAfter && autoAfter !== '—' ? autoAfter : 'plant');

  if (newSeed === prevSeed) return undefined;

  const oldT = buildDefaultSeoTitle(prevSeed);
  const oldD = buildDefaultSeoDescription(prevSeed);
  const stillAuto =
    (!rowBefore.seoTitle?.trim() || rowBefore.seoTitle.trim() === oldT) &&
    (!rowBefore.seoDescription?.trim() || rowBefore.seoDescription.trim() === oldD);
  if (!stillAuto) return undefined;

  return {
    seoTitle: buildDefaultSeoTitle(newSeed),
    seoDescription: buildDefaultSeoDescription(newSeed),
  };
}

/** Full product label for SEO defaults: child = combined listing name; parent = row / first parent. */
function rowDisplayNameForSeo(row: ProductRow, listingMode: ListingScreenMode): string {
  if (listingMode === 'child') {
    return childListingPreviewDisplayName(row);
  }
  const fromRow = computeProductDisplayName({
    plant: row.plant,
    otherNames: row.otherNames,
    variety: row.variety,
    colour: row.colour,
    height: row.height,
    size: row.size,
    type: row.type,
  }).trim();
  if (fromRow) return fromRow;
  const p = row.parentItems[0]?.parent;
  if (p) {
    if (p.finalName?.trim()) return p.finalName.trim();
    const fromP = computeProductDisplayName({
      plant: p.plant || '',
      otherNames: p.otherNames,
      variety: p.variety,
      colour: p.colour,
      height: p.height ?? '',
      size: p.size ?? '',
      potType: p.potType,
      type: p.type,
      mossStick: p.mossStick,
    }).trim();
    if (fromP) return fromP;
    return p.plant?.trim() || 'plant';
  }
  return row.plant?.trim() || 'plant';
}

function seoDisplayFromParentAndRow(parent: ParentMaster, row: ProductRow): string {
  const merged = computeProductDisplayName({
    plant: parent.plant || row.plant || '',
    otherNames: parent.otherNames || row.otherNames,
    variety: parent.variety || row.variety,
    colour: parent.colour || row.colour,
    height: (parent.height ?? row.height) || '',
    size: (parent.size ?? row.size) || '',
    type: parent.type || row.type,
    potType: parent.potType,
    mossStick: parent.mossStick,
  }).trim();
  return merged || parent.finalName?.trim() || parent.plant?.trim() || row.plant?.trim() || 'plant';
}

/** Single browse redirect from parents (first unique URL wins, same as Parent Master). */
function combinedRedirectsFromParents(items: ParentItemRow[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    const raw = item.parent?.redirects;
    parseCommaList(typeof raw === 'string' ? raw : undefined).forEach((x) => set.add(x));
  }
  const arr = Array.from(set);
  return arr.slice(0, 1);
}

/** Match listing API: plant parents only when mix plant+pot; else all (pot-only) parents. */
function combinedFeaturesFromParentItems(items: ParentItemRow[]): string[] {
  const parents = items.map((i) => i.parent).filter(Boolean) as ParentMaster[];
  const plantParents = parents.filter((p) => (p as { parentKind?: string }).parentKind !== 'pot');
  const source = plantParents.length > 0 ? plantParents : parents;
  const set = new Set<string>();
  for (const p of source) {
    const f = (p as { features?: string }).features;
    parseCommaList(typeof f === 'string' ? f : undefined).forEach((x) => set.add(x));
  }
  return Array.from(set);
}

/** Max tax across all parent lines (plant + pot), same as server merge. */
function maxTaxFromParentItems(items: ParentItemRow[]): number | undefined {
  let max = 0;
  for (const item of items) {
    const p = item.parent;
    if (!p || p.tax == null || String(p.tax).trim() === '') continue;
    const t = Number(p.tax);
    if (Number.isFinite(t) && t > max) max = t;
  }
  return max > 0 ? max : undefined;
}

type ParentListingDetailLine = { label: string; value: string; fullWidth?: boolean };

function buildParentListingReadOnlyLines(
  baseParent: ParentMaster,
  row: ProductRow,
  collectionNames: Record<string, string>,
  sellerOptions: { value: string; label: string }[]
): ParentListingDetailLine[] {
  const lines: ParentListingDetailLine[] = [];

  const add = (label: string, value: unknown, fullWidth?: boolean) => {
    if (value == null) return;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return;
      lines.push({ label, value: String(value), fullWidth });
      return;
    }
    if (typeof value === 'string') {
      const t = value.trim();
      if (!t) return;
      lines.push({ label, value: t, fullWidth });
      return;
    }
    if (Array.isArray(value)) {
      const t = value.map((x) => String(x).trim()).filter(Boolean);
      if (t.length === 0) return;
      lines.push({ label, value: t.join(', '), fullWidth });
    }
  };

  const addMoney = (label: string, n: unknown) => {
    if (n == null || n === '') return;
    const v = Number(n);
    if (!Number.isFinite(v)) return;
    lines.push({ label, value: `₹${v.toLocaleString()}` });
  };

  const fn = baseParent.finalName?.trim();
  const pl = baseParent.plant?.trim();
  if (fn && fn !== pl) add('Final name', baseParent.finalName);
  add('Plant', baseParent.plant);
  add('Other names', baseParent.otherNames);
  add('Variety', baseParent.variety);
  add('Colour', baseParent.colour);
  if (baseParent.height != null && Number.isFinite(Number(baseParent.height))) {
    lines.push({ label: 'Height', value: `${baseParent.height} ft` });
  }
  if (baseParent.size != null && Number.isFinite(Number(baseParent.size))) {
    lines.push({ label: 'Size', value: `${baseParent.size}" pot` });
  }
  add('Pot type', baseParent.potType || baseParent.type);
  add('Moss stick', baseParent.mossStick);

  const sku = baseParent.sku || row.parentSkus[0];
  add('SKU', sku);
  if (baseParent.base_sku?.trim()) add('Base SKU (no hub code)', baseParent.base_sku.trim());
  if (baseParent.productCode && baseParent.productCode !== sku) {
    add('Product code', baseParent.productCode);
  }

  addMoney('Selling price (Parent Master)', baseParent.sellingPrice ?? baseParent.price);
  addMoney('Listing price (Parent Master)', baseParent.listing_price);
  if (typeof baseParent.compare_at === 'number' && Number.isFinite(baseParent.compare_at)) {
    lines.push({ label: 'Compare-at (Parent Master)', value: `₹${baseParent.compare_at.toLocaleString()}` });
  }
  lines.push({ label: 'Price on this listing', value: `₹${row.price.toLocaleString()}` });
  if (row.compare_at_price != null && Number.isFinite(Number(row.compare_at_price))) {
    lines.push({
      label: 'Compare-at (this listing)',
      value: `₹${Number(row.compare_at_price).toLocaleString()}`,
    });
  }
  if (row.tags?.length) add('Tags (this listing)', row.tags);
  lines.push({ label: 'Stock (Parent Master)', value: String(baseParent.inventory_quantity ?? 0) });

  const tb = baseParent.typeBreakdown;
  if (tb && typeof tb === 'object') {
    const bits: string[] = [];
    if (tb.listing != null) bits.push(`Listing ${tb.listing}`);
    if (tb.revival != null) bits.push(`Revival ${tb.revival}`);
    if (tb.growth != null) bits.push(`Growth ${tb.growth}`);
    if (tb.consumers != null) bits.push(`Consumers ${tb.consumers}`);
    if (bits.length) lines.push({ label: 'Purchase type split', value: bits.join(' · ') });
  }

  add('Categories', baseParent.categories?.length ? baseParent.categories : row.categories);
  const collectionIdList = baseParent.collectionIds?.length
    ? baseParent.collectionIds.map((id) => String(id))
    : row.collectionIds;
  if (collectionIdList?.length) {
    const resolved = collectionIdList.map((id) => collectionNames[id] ?? id);
    lines.push({ label: 'Collections', value: resolved.join(', ') });
  }

  add('Features', baseParent.features);
  if (baseParent.tags?.length) add('Tags (Parent Master)', baseParent.tags);
  add('Redirects', baseParent.redirects);
  add('Hub (on parent)', baseParent.hub);
  add('Substores', baseParent.substores);

  const pt = baseParent.productType;
  if (pt && pt !== 'parent') add('Product type', pt);

  const imgCount = baseParent.images?.length ?? 0;
  lines.push({ label: 'Photos on parent', value: String(imgCount) });

  if (baseParent.seller) {
    const sid = String(baseParent.seller);
    const sellerLabel = sellerOptions.find((o) => o.value === sid)?.label ?? sid;
    lines.push({ label: 'Default seller (parent)', value: sellerLabel });
  }
  if (baseParent.vendorMasterId) add('Vendor master ID', baseParent.vendorMasterId);
  if (baseParent.storeHippoId) add('StoreHippo ID', String(baseParent.storeHippoId));
  if (baseParent.product_id && baseParent.product_id !== baseParent.storeHippoId) {
    add('Product ID', String(baseParent.product_id));
  }
  if (baseParent.storeHippoAlias?.trim()) {
    add('StoreHippo alias (URL slug)', baseParent.storeHippoAlias.trim());
  }

  const descSource = (baseParent.description || row.description || '').trim();
  if (descSource) {
    const plain = stripHtmlToPlain(descSource);
    if (plain) lines.push({ label: 'Description', value: plain, fullWidth: true });
  }

  return lines;
}

function resolveDisplayImage(
  row: ProductRow,
  index: number,
  listingMode: ListingScreenMode,
  allImages: SelectedImage[],
  childPhotoPool?: SelectedImage[]
): SelectedImage | null {
  const tagged = row.taggedImages?.[0];
  if (tagged) return tagged;
  const masterUrl = row.parentItems[0]?.parent?.images?.[0];
  if (masterUrl && typeof masterUrl === 'string') {
    return {
      url: masterUrl,
      filename: 'Parent master',
      collectionId: '',
      isTagged: false,
      size: 0,
      uploadedAt: new Date(0),
      serial: row.serial,
    };
  }
  if (listingMode === 'child') {
    const pool = childPhotoPool ?? allImages;
    if (pool[index]) return pool[index] ?? null;
  }
  return null;
}

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

/** Multi-select using `CustomSelect`; optional creatable row from search (features). */
function MultiSelectFromDropdown({
  label,
  hint,
  values,
  onChange,
  options,
  selectPlaceholder = 'Choose a value to add…',
  compact,
  allowCreate,
  getChipLabel,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (next: string[]) => void;
  options: { value: string; label: string }[];
  selectPlaceholder?: string;
  /** Smaller label / chips for parent listing card */
  compact?: boolean;
  allowCreate?: boolean;
  getChipLabel?: (value: string, options: { value: string; label: string }[]) => string;
}) {
  const labelFor = (v: string) =>
    getChipLabel?.(v, options) ?? options.find((o) => o.value === v)?.label ?? v;
  const labelCls = compact
    ? 'block text-[10px] font-medium text-slate-500 mb-1'
    : 'block text-xs font-medium text-slate-500 mb-1.5';
  const chipCls = compact
    ? 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-medium max-w-full break-all'
    : 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium max-w-full break-all';
  const hintCls = compact ? 'text-[10px] text-slate-500 mb-2 leading-snug' : 'text-[11px] text-slate-500 mb-2 leading-snug';

  return (
    <div>
      <label className={labelCls}>{label}</label>
      {hint ? <p className={hintCls}>{hint}</p> : null}
      <div className="flex flex-wrap gap-2 mb-2 min-h-[1.5rem]">
        {values.map((v) => (
          <span key={v} className={chipCls}>
            {labelFor(v)}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="p-0.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700 shrink-0"
              aria-label={`Remove ${labelFor(v)}`}
            >
              <X className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
            </button>
          </span>
        ))}
      </div>
      <CustomSelect
        value=""
        onChange={(value) => {
          const v = String(value ?? '').trim();
          if (!v) return;
          if (values.some((x) => x.toLowerCase() === v.toLowerCase())) return;
          onChange([...values, v]);
        }}
        options={options.filter(
          (o) => !values.some((x) => x.toLowerCase() === String(o.value).toLowerCase())
        )}
        placeholder={selectPlaceholder}
        searchable={true}
        closeOnSelect={false}
        allowCreate={allowCreate}
      />
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
  parentOptions,
  error,
}: {
  value: string;
  onChange: (parentSku: string, parent?: ParentMaster) => void;
  parentOptions: ListingSourcedParentOption[];
  error?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedOption = parentOptions.find((o) => o.parent.sku === value);
  const selectedParent = selectedOption?.parent;

  const filteredParents = useMemo(() => {
    if (!searchQuery.trim()) return parentOptions;
    const query = searchQuery.toLowerCase();
    return parentOptions.filter((opt) => {
      const p = opt.parent;
      return (
        p.plant.toLowerCase().includes(query) ||
        (p.sku && p.sku.toLowerCase().includes(query)) ||
        (opt.listingSku && opt.listingSku.toLowerCase().includes(query))
      );
    });
  }, [parentOptions, searchQuery]);

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
            <div className="p-3 text-sm text-slate-500 text-center">No listed products found</div>
          ) : (
            filteredParents.map((opt) => {
              const parent = opt.parent;
              const isSelected = parent.sku === value;
              const lineSku = opt.listingSku || parent.sku || '';
              return (
                <button
                  key={opt.listingId}
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
                      {lineSku} · ₹{parent.price ?? 0} · {parent.inventory_quantity ?? 0} available
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
  availableParents: ListingSourcedParentOption[];
  onUpdateRow: (rowId: string, updates: Partial<ProductRow>) => void;
  onRemoveRow: (rowId: string) => void;
  isLoading: boolean;
  isSaving: boolean;
  allImages: SelectedImage[];
  onAssignImage: (rowId: string, image: SelectedImage) => void;
  onSaveRow: (rowId: string) => void;
  listingMode: ListingScreenMode;
  parentListPage: number;
  parentListTotalPages: number;
  parentListLoading: boolean;
  onLoadMoreParents: () => void | Promise<void>;
  onUploadParentPhoto: (rowId: string, file: File) => void | Promise<void>;
  /** Child listing: global hub filter (parent picker options match this hub). */
  childContextHub?: string;
  /** Child listing: photos included after hub + optional collection filter (picker + row fallback). */
  childPhotoPool?: SelectedImage[];
  /** Child listing: user narrowed to one image collection — for empty-state copy. */
  childCollectionFilterActive?: boolean;
}

export function ProductTable({
  productRows,
  availableParents,
  onUpdateRow,
  onRemoveRow,
  isLoading,
  isSaving,
  allImages,
  onAssignImage,
  onSaveRow,
  listingMode,
  parentListPage,
  parentListTotalPages,
  parentListLoading,
  onLoadMoreParents,
  onUploadParentPhoto,
  childContextHub = '',
  childPhotoPool,
  childCollectionFilterActive = false,
}: ProductTableProps) {
  const hubOptions = useMemo(
    () => HUB_MAPPINGS.map((mapping) => ({ value: mapping.hub, label: mapping.hub })),
    []
  );

  /** Raw Seller Master rows — used for select options and resolving stored id → display name. */
  const [sellerRows, setSellerRows] = useState<
    { _id?: string; seller_id?: string; seller_name?: string }[]
  >([]);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/sellers')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success || !Array.isArray(data.data)) return;
        setSellerRows(data.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const sellerOptions = useMemo(
    () =>
      sellerRows
        .map((s) => ({
          value: String(s.seller_id ?? '').trim(),
          label: (s.seller_name?.trim() || String(s.seller_id ?? '')).trim() || String(s.seller_id ?? ''),
        }))
        .filter((o) => o.value),
    [sellerRows]
  );

  /** Match listing `seller` / hub map values whether stored as seller_id or Seller Master _id. */
  const sellerLabelByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sellerRows) {
      const sid = String(s.seller_id ?? '').trim();
      const name = (s.seller_name?.trim() || sid).trim() || sid;
      if (sid) m.set(sid, name);
      const oid = s._id != null ? String(s._id) : '';
      if (oid) m.set(oid, name);
    }
    return m;
  }, [sellerRows]);

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

  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success || !Array.isArray(data.data)) return;
        const seen = new Set<string>();
        const opts: { value: string; label: string }[] = [];
        for (const c of data.data as { alias?: string; category?: string }[]) {
          const value = String(c.alias ?? '').trim();
          if (!value || seen.has(value)) continue;
          seen.add(value);
          const label = String(c.category ?? c.alias ?? value).trim() || value;
          opts.push({ value, label });
        }
        opts.sort((a, b) => a.label.localeCompare(b.label));
        setCategoryOptions(opts);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const [featureDropdownOptions, setFeatureDropdownOptions] = useState<{ value: string; label: string }[]>(
    []
  );
  useEffect(() => {
    let cancelled = false;
    fetch('/api/product-feature-master')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success || !Array.isArray(data.data)) return;
        const opts: { value: string; label: string }[] = [];
        for (const row of data.data as { name?: string }[]) {
          const name = String(row.name ?? '').trim();
          if (name) opts.push({ value: name, label: name });
        }
        opts.sort((a, b) => a.label.localeCompare(b.label));
        setFeatureDropdownOptions(opts);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const [redirectDropdownOptions, setRedirectDropdownOptions] = useState<{ value: string; label: string }[]>(
    []
  );
  useEffect(() => {
    let cancelled = false;
    fetch('/api/listing-redirect-options')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success || !Array.isArray(data.data)) return;
        const opts: { value: string; label: string }[] = [];
        for (const row of data.data as { value?: string; label?: string }[]) {
          const value = String(row.value ?? '').trim();
          const label = String(row.label ?? '').trim() || value;
          if (value) opts.push({ value, label });
        }
        opts.sort((a, b) => a.label.localeCompare(b.label));
        setRedirectDropdownOptions(opts);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (redirectDropdownOptions.length === 0) return;
    for (const row of productRows) {
      const r = row.redirects;
      if (!r?.length) continue;
      let changed = false;
      const mapped = r.map((part) => {
        const p = String(part).trim();
        if (p.includes('\t')) return part;
        const opt = redirectDropdownOptions.find((o) => redirectOptionTokenToUrl(o.value) === p);
        if (opt) {
          changed = true;
          return opt.value;
        }
        return part;
      });
      const next = mapped.slice(0, 1);
      if (mapped.length > 1) changed = true;
      if (changed || next.length !== r.length || next[0] !== r[0]) {
        onUpdateRow(row.id, { redirects: next });
      }
    }
  }, [redirectDropdownOptions, productRows, onUpdateRow]);

  const parentScrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: listingMode === 'parent' ? productRows.length : 0,
    getScrollElement: () => parentScrollRef.current,
    estimateSize: () => 720,
    overscan: 2,
  });

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
          <p className="text-sm text-slate-500">
            {listingMode === 'parent'
              ? 'No base parents found in Parent Master, or still loading.'
              : childCollectionFilterActive && (childPhotoPool?.length ?? 0) === 0
                ? 'No unlisted photos in the selected image collection. Choose another collection or “All collections”, or use “+ Add Row”.'
                : 'No unlisted photos in completed image collections. Add images under Image collections, or use “+ Add Row” for a blank line.'}
          </p>
        </div>
      </div>
    );
  }

  const poolForChild = listingMode === 'child' ? (childPhotoPool ?? allImages) : allImages;

  const cardProps = {
    allImages,
    childPhotoPool: poolForChild,
    onAssignImage,
    availableParents,
    onUpdateRow,
    onRemoveRow,
    onSaveRow,
    isSaving,
    hubOptions,
    sellerOptions,
    sellerLabelByKey,
    collectionOptions,
    collectionNames,
    categoryOptions,
    featureDropdownOptions,
    redirectDropdownOptions,
    listingMode,
    onUploadParentPhoto,
    childContextHub,
  };

  if (listingMode === 'parent') {
    const virtualItems = rowVirtualizer.getVirtualItems();
    return (
      <div className="space-y-4">
        <div
          ref={parentScrollRef}
          className="h-[min(72vh,calc(100dvh-220px))] overflow-auto pr-1 rounded-xl"
        >
          <div
            className="relative w-full"
            style={{ height: rowVirtualizer.getTotalSize() }}
          >
            {virtualItems.map((vi) => {
              const row = productRows[vi.index];
              if (!row) return null;
              const displayImage = resolveDisplayImage(row, vi.index, listingMode, allImages, poolForChild);
              return (
                <div
                  key={row.id}
                  data-index={vi.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute left-0 top-0 w-full pb-6"
                  style={{ transform: `translateY(${vi.start}px)` }}
                >
                  <ProductCard
                    row={row}
                    index={vi.index}
                    displayImage={displayImage}
                    {...cardProps}
                  />
                </div>
              );
            })}
          </div>
        </div>
        {parentListPage < parentListTotalPages && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => void onLoadMoreParents()}
              disabled={parentListLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {parentListLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Load more parents
            </button>
          </div>
        )}
      </div>
    );
  }

  // Child listing: show only the queue head; next row appears after Save or Remove.
  const rowsToRender = listingMode === 'child' ? productRows.slice(0, 1) : productRows;

  return (
    <div className="space-y-6">
      {rowsToRender.map((row, sliceIndex) => {
        const index = listingMode === 'child' ? 0 : sliceIndex;
        const displayImage = resolveDisplayImage(row, index, listingMode, allImages, poolForChild);
        return (
          <ProductCard
            key={row.id}
            row={row}
            index={index}
            displayImage={displayImage}
            {...cardProps}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Child listing: seller comes from sellerMaster via hub → substore (not procurement).
// ---------------------------------------------------------------------------

function ChildListingSellerSummary({
  row,
  sellerLabelByKey,
}: {
  row: ProductRow;
  sellerLabelByKey: Map<string, string>;
}) {
  const hubs = row.hubs ?? [];
  if (hubs.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        Select listing hubs — seller_id is taken from Seller Master using each hub’s substore codes.
      </p>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Seller (Seller Master)
      </p>
      {hubs.map((h) => {
        const sid =
          row.sellersByHub?.[h] ?? (hubs.length === 1 ? row.seller : undefined);
        const raw = sid?.trim() ?? '';
        const display = raw ? sellerLabelByKey.get(raw) ?? raw : '—';
        return (
          <p key={h} className="text-xs text-slate-800">
            <span className="font-medium text-slate-600">{h}:</span>{' '}
            <span>{display}</span>
          </p>
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
  availableParents: ListingSourcedParentOption[];
  onUpdateRow: (rowId: string, updates: Partial<ProductRow>) => void;
  onRemoveRow: (rowId: string) => void;
  onSaveRow: (rowId: string) => void;
  isSaving: boolean;
  hubOptions: { value: string; label: string }[];
  sellerOptions: { value: string; label: string }[];
  sellerLabelByKey: Map<string, string>;
  collectionOptions: { value: string; label: string }[];
  collectionNames: Record<string, string>;
  categoryOptions: { value: string; label: string }[];
  featureDropdownOptions: { value: string; label: string }[];
  redirectDropdownOptions: { value: string; label: string }[];
  listingMode: ListingScreenMode;
  onUploadParentPhoto: (rowId: string, file: File) => void | Promise<void>;
  childContextHub?: string;
  /** Child: subset of `allImages` after collection filter (image swap picker). */
  childPhotoPool?: SelectedImage[];
}

function ProductCard({
  row,
  index,
  displayImage,
  allImages,
  childPhotoPool,
  onAssignImage,
  availableParents,
  onUpdateRow,
  onRemoveRow,
  onSaveRow,
  isSaving,
  hubOptions,
  sellerOptions,
  sellerLabelByKey,
  collectionOptions,
  collectionNames,
  categoryOptions,
  featureDropdownOptions,
  redirectDropdownOptions,
  listingMode,
  onUploadParentPhoto,
  childContextHub = '',
}: ProductCardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showImagePicker, setShowImagePicker] = useState(false);
  /** Child listing: after user edits product name on step 0, stop auto-overwriting `plant`. */
  const childListingNameTouchedRef = useRef(false);

  const imagesForPicker =
    listingMode === 'child' ? (childPhotoPool ?? allImages) : allImages;

  const parentPickerOptions = useMemo(() => {
    const h = childContextHub?.trim();
    if (!h) return [];
    return availableParents.filter((o) => o.listingHub === h);
  }, [availableParents, childContextHub]);

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

  useEffect(() => {
    childListingNameTouchedRef.current = false;
  }, [row.id]);

  useEffect(() => {
    if (listingMode !== 'child') return;
    if (childListingNameTouchedRef.current) return;
    const auto = buildChildListingAutoProductName(row);
    if (!auto || auto === '—') {
      if (row.plant?.trim()) onUpdateRow(row.id, { plant: '' });
      return;
    }
    if (row.plant === auto) return;
    onUpdateRow(row.id, { plant: auto });
  }, [
    listingMode,
    row.id,
    row.parentItems,
    row.size,
    row.type,
    row.setQuantity,
    row.plant,
    onUpdateRow,
  ]);

  // If SEO still matches defaults built from parent line 1 only, but the listing name is multi-parent, align SEO.
  useEffect(() => {
    if (listingMode !== 'child') return;
    const withParent = row.parentItems.filter((i) => i.parent);
    if (withParent.length < 2) return;
    const display = childListingPreviewDisplayName(row);
    const expectedT = buildDefaultSeoTitle(display);
    const expectedD = buildDefaultSeoDescription(display);
    if (row.seoTitle?.trim() === expectedT && row.seoDescription?.trim() === expectedD) return;
    const p0 = row.parentItems[0]?.parent;
    if (!p0) return;
    const wrongSeed = seoDisplayFromParentAndRow(p0, row);
    const wrongT = buildDefaultSeoTitle(wrongSeed);
    const wrongD = buildDefaultSeoDescription(wrongSeed);
    if (row.seoTitle?.trim() !== wrongT || row.seoDescription?.trim() !== wrongD) return;
    onUpdateRow(row.id, { seoTitle: expectedT, seoDescription: expectedD });
  }, [
    listingMode,
    row.id,
    row.parentItems,
    row.plant,
    row.size,
    row.type,
    row.setQuantity,
    row.seoTitle,
    row.seoDescription,
    row.otherNames,
    row.variety,
    row.colour,
    row.height,
    onUpdateRow,
  ]);

  // Per-card rule-based categories (child: review step; parent: whenever plant is set)
  const [ruleBasedCategories, setRuleBasedCategories] = useState<string[]>([]);
  useEffect(() => {
    if (!row.plant?.trim()) return;
    if (listingMode === 'child' && currentStep !== REVIEW_STEP_INDEX) return;
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
  }, [
    listingMode,
    currentStep,
    row.plant,
    row.variety,
    row.colour,
    row.height,
    row.size,
    row.type,
  ]);

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

  const calcSetQuantity = (items: ParentItemRow[]): number => {
    if (listingMode === 'child') {
      return childListingSetQuantityFromParentItems(items);
    }
    return items.reduce((sum, i) => sum + (i.quantity || 0), 0) || 1;
  };

  /** Listing product name: saved `plant`, or auto preview when empty. */
  const getFinalName = (): string => {
    const trimmed = row.plant?.trim();
    if (trimmed) return trimmed;
    const auto = buildChildListingAutoProductName(row);
    return auto && auto !== '—' ? auto : '—';
  };

  const autoProductNamePlaceholder = buildChildListingAutoProductName(row);

  const stepComplete = (step: number): boolean => {
    switch (step) {
      case 0:
        return row.parentItems.length > 0 && row.parentItems.some((i) => i.parentSku);
      case 1:
        return listingMode === 'parent' ? row.price >= 0 : row.price > 0;
      case 2:
        return (row.hubs ?? []).length > 0;
      case 3:
        return row.isValid;
      default:
        return false;
    }
  };

  const baseParent = row.parentItems[0]?.parent;
  const typeBreakdown = baseParent?.typeBreakdown;
  const pendingListingQty = Number(typeBreakdown?.listing ?? 0) || 0;
  // Parent listing only: child listing flow should not show parent-inventory receipt banner
  const showPendingListingBanner = listingMode === 'parent' && pendingListingQty > 0;
  const listingReceivedRaw = baseParent?.updatedAt;
  const listingReceivedDateLabel = (() => {
    if (listingReceivedRaw == null) return null;
    const d = new Date(listingReceivedRaw as string | number | Date);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  })();
  const hasListingPhoto = !!(
    row.taggedImages?.[0] ||
    (baseParent?.images && baseParent.images.length > 0)
  );

  // --- Parent item handlers ---

  const handleParentItemChange = (itemIndex: number, updates: Partial<ParentItemRow>) => {
    const updatedItems = row.parentItems.map((item, i) => (i === itemIndex ? { ...item, ...updates } : item));
    const cleanedItems = updatedItems.filter((item) => item.parentSku && item.quantity > 0);
    const { price, inventory } = recalculatePriceAndInventory({ ...row, parentItems: cleanedItems });
    const setQty = calcSetQuantity(cleanedItems);
    const rowAfter: ProductRow = {
      ...row,
      parentItems: cleanedItems,
      setQuantity: setQty,
      quantity: setQty,
    };
    onUpdateRow(row.id, {
      parentItems: cleanedItems,
      parentSkus: cleanedItems.map((i) => i.parentSku),
      price,
      inventory_quantity: inventory,
      setQuantity: setQty,
      quantity: setQty,
      ...(listingMode === 'child'
        ? {
            compare_at_price: compareAtFromCalculatedChildListingPrice(price),
            description: mergeParentDescriptionsForChildListing(cleanedItems),
            ...childListingSeoPatch(row, rowAfter),
          }
        : {}),
    });
  };

  const handleAddParentItem = () => {
    const newItem: ParentItemRow = {
      id: `pi_extra_${row.id}_${row.parentItems.length}`,
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
      id: `pi_${String(parent._id ?? parent.sku ?? 'p')}`,
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
      ...(listingMode !== 'child' ? { plant: parent.plant || row.plant } : {}),
      otherNames: parent.otherNames || row.otherNames,
      variety: parent.variety || row.variety,
      colour: parent.colour || row.colour,
      height: parent.height ?? row.height,
      description:
        listingMode === 'child'
          ? mergeParentDescriptionsForChildListing([newItem])
          : parent.description || row.description || '',
      hubs: (row.hubs ?? []).length > 0 ? row.hubs : [],
      seller: listingMode === 'child' ? row.seller : row.seller || parent.seller || '',
      categories: Array.from(new Set([...(row.categories || []), ...(parent.categories || [])])),
      collectionIds: Array.from(
        new Set([...(row.collectionIds || []), ...(parent.collectionIds?.map((id) => String(id)) || [])])
      ),
      features: combinedFeaturesFromParentItems([newItem]),
      redirects: combinedRedirectsFromParents([newItem]),
      tax: maxTaxFromParentItems([newItem]),
      ...(listingMode === 'child'
        ? (() => {
            const rowForSeo: ProductRow = {
              ...row,
              parentItems: [newItem],
              setQuantity: setQty,
              quantity: setQty,
            };
            const seed = childListingPreviewDisplayName(rowForSeo);
            return {
              seoTitle: buildDefaultSeoTitle(seed),
              seoDescription: buildDefaultSeoDescription(seed),
            };
          })()
        : {
            seoTitle:
              parent.SEO?.title?.trim() ||
              row.seoTitle?.trim() ||
              buildDefaultSeoTitle(seoDisplayFromParentAndRow(parent, row)),
            seoDescription:
              parent.SEO?.description?.trim() ||
              row.seoDescription?.trim() ||
              buildDefaultSeoDescription(seoDisplayFromParentAndRow(parent, row)),
          }),
      price,
      inventory_quantity: inventory,
      setQuantity: setQty,
      quantity: setQty,
      ...(listingMode === 'child' ? { compare_at_price: compareAtFromCalculatedChildListingPrice(price) } : {}),
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
    const rowAfter: ProductRow = {
      ...row,
      parentItems: updatedItems,
      setQuantity: setQty,
      quantity: setQty,
    };
    onUpdateRow(row.id, {
      parentItems: updatedItems,
      parentSkus: updatedItems.map((i) => i.parentSku),
      categories: Array.from(combinedCategories),
      collectionIds: Array.from(combinedCollectionIds),
      features: combinedFeaturesFromParentItems(updatedItems),
      redirects: combinedRedirectsFromParents(updatedItems),
      tax: maxTaxFromParentItems(updatedItems),
      price,
      inventory_quantity: inventory,
      setQuantity: setQty,
      quantity: setQty,
      ...(listingMode === 'child'
        ? {
            compare_at_price: compareAtFromCalculatedChildListingPrice(price),
            description: mergeParentDescriptionsForChildListing(updatedItems),
            ...childListingSeoPatch(row, rowAfter),
          }
        : {}),
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
              ...(listingMode !== 'child' ? { plant: parent.plant || row.plant } : {}),
              otherNames: parent.otherNames || row.otherNames,
              variety: parent.variety || row.variety,
              colour: parent.colour || row.colour,
              height: parent.height ?? row.height,
              ...(listingMode !== 'child'
                ? { description: parent.description || row.description || '' }
                : {}),
              hubs: (row.hubs ?? []).length > 0 ? row.hubs : [],
              seller: listingMode === 'child' ? row.seller : row.seller || parent.seller || '',
              categories: Array.from(combinedCategories),
              collectionIds: Array.from(combinedCollectionIds),
              ...(listingMode === 'parent'
                ? {
                    seoTitle:
                      parent.SEO?.title?.trim() ||
                      row.seoTitle?.trim() ||
                      buildDefaultSeoTitle(seoDisplayFromParentAndRow(parent, row)),
                    seoDescription:
                      parent.SEO?.description?.trim() ||
                      row.seoDescription?.trim() ||
                      buildDefaultSeoDescription(seoDisplayFromParentAndRow(parent, row)),
                  }
                : {}),
            }
          : { categories: Array.from(combinedCategories), collectionIds: Array.from(combinedCollectionIds) };
      const tempRow: ProductRow = { ...row, parentItems: updatedItems, ...baseUpdates };
      const { price, inventory } = recalculatePriceAndInventory(tempRow);
      const setQty = calcSetQuantity(tempRow.parentItems);
      const rowAfterForSeo: ProductRow = { ...tempRow, setQuantity: setQty, quantity: setQty };
      onUpdateRow(row.id, {
        ...baseUpdates,
        parentItems: tempRow.parentItems,
        parentSkus: tempRow.parentItems.map((i) => i.parentSku),
        features: combinedFeaturesFromParentItems(updatedItems),
        redirects: combinedRedirectsFromParents(updatedItems),
        tax: maxTaxFromParentItems(updatedItems),
        price,
        inventory_quantity: inventory,
        setQuantity: setQty,
        quantity: setQty,
        ...(listingMode === 'child'
          ? {
              compare_at_price: compareAtFromCalculatedChildListingPrice(price),
              description: mergeParentDescriptionsForChildListing(updatedItems),
              ...childListingSeoPatch(row, rowAfterForSeo),
            }
          : {}),
      });
    } else {
      handleParentItemChange(itemIndex, { parentSku });
    }
  };

  // --- Render ---

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {showPendingListingBanner && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b-2 border-amber-400/70 bg-gradient-to-r from-amber-50 via-amber-100 to-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-amber-400 text-amber-950 shadow-md ring-2 ring-amber-500/40">
            Pending listing
          </span>
          <p className="text-sm text-amber-950 font-medium leading-snug min-w-0">
            Inventory of{' '}
            <span className="font-semibold tabular-nums">{pendingListingQty.toLocaleString()}</span>
            {listingReceivedDateLabel ? (
              <>
                {' '}
                received on <span className="font-semibold">{listingReceivedDateLabel}</span>.
              </>
            ) : (
              <> is available to list.</>
            )}
          </p>
        </div>
      )}
      <div
        className={`flex ${listingMode === 'parent' ? 'items-start' : 'min-h-[280px]'}`}
      >
        {/* Left: Photo */}
        <div
          className={`shrink-0 border-r border-slate-100 bg-slate-50 flex flex-col ${
            listingMode === 'parent' ? 'w-[7.5rem] p-2' : 'w-52 p-4'
          }`}
        >
          <div
            className={`overflow-hidden border border-slate-200 bg-white flex items-center justify-center cursor-pointer relative group ${
              listingMode === 'parent'
                ? 'w-24 h-24 mx-auto rounded-lg shrink-0'
                : 'aspect-square w-full rounded-xl'
            }`}
            onClick={() => setShowImagePicker((v) => !v)}
          >
            {displayImage ? (
              <img src={proxyImageUrl(displayImage.url)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-slate-300 flex flex-col items-center gap-1 px-2 text-center">
                <ImageIcon className="w-10 h-10" />
                <span className="text-[10px]">
                  {listingMode === 'parent' ? 'Photo missing' : 'No photo'}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 px-2 py-1 rounded-lg">
                Change
              </span>
            </div>
          </div>
          <p
            className={`text-slate-500 text-center truncate ${
              listingMode === 'parent' ? 'text-[9px] mt-1.5 leading-tight px-0.5' : 'text-[11px] mt-2'
            }`}
            title={displayImage?.filename}
          >
            #{index + 1}
            {listingMode === 'child' && displayImage ? ` · ${displayImage.filename}` : ''}
          </p>
          {listingMode === 'parent' && !hasListingPhoto && (
            <p className="text-[9px] text-amber-800 text-center mt-1 leading-tight px-0.5">
              Photo required — tap image or upload.
            </p>
          )}
          {listingMode === 'parent' && baseParent?._id && (
            <label className="mt-1.5 flex items-center justify-center w-full py-1 text-[10px] font-medium rounded-md border border-pink-200 text-[#E6007A] bg-pink-50 hover:bg-pink-100 cursor-pointer transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onUploadParentPhoto(row.id, f);
                  e.target.value = '';
                }}
              />
              Upload to parent
            </label>
          )}

          {/* Mini image picker */}
          {showImagePicker && imagesForPicker.length > 0 && (
            <div className="mt-3 border border-slate-200 rounded-xl bg-white max-h-40 overflow-y-auto">
              <div className="p-1.5 grid grid-cols-3 gap-1">
                {imagesForPicker.slice(0, 30).map((img) => {
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

        {/* Right: multi-step wizard (child) or single-step list (parent) */}
        <div className="flex-1 min-w-0 flex flex-col">
          {listingMode === 'parent' ? (
            <div className="flex-1 min-h-0 overflow-auto px-3 py-2.5 sm:px-4 sm:py-3">
              <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 mb-2">
                <h3 className="text-sm font-semibold text-slate-900 leading-tight">List this parent</h3>
                <p className="text-[10px] text-slate-500 leading-tight max-w-[16rem] sm:max-w-none sm:text-right">
                  One SKU per hub · data from Parent Master
                </p>
              </div>

              {baseParent && (
                <div className="mb-3 rounded-lg border border-slate-200/90 bg-slate-50/90 p-2.5 sm:p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    Parent Master (read-only)
                  </p>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-2 text-[11px]">
                    {buildParentListingReadOnlyLines(baseParent, row, collectionNames, sellerOptions).map(
                      (line, idx) => (
                        <div
                          key={`${line.label}-${idx}`}
                          className={line.fullWidth ? 'sm:col-span-2 xl:col-span-3 min-w-0' : 'min-w-0'}
                        >
                          <dt className="text-slate-500 leading-tight">{line.label}</dt>
                          <dd
                            className={
                              line.fullWidth
                                ? 'mt-0.5 max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-slate-800 leading-snug font-normal'
                                : 'font-medium text-slate-900 break-words leading-snug'
                            }
                          >
                            {line.value}
                          </dd>
                        </div>
                      )
                    )}
                  </dl>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_minmax(0,14rem)] gap-2 sm:gap-3 items-start w-full">
                <HubMultiSelect
                  selectedHubs={row.hubs ?? []}
                  hubOptions={hubOptions}
                  onChange={(hubs) => onUpdateRow(row.id, { hubs })}
                  error={row.validationErrors.hub}
                />
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">Seller</label>
                  <CustomSelect
                    value={row.seller ?? ''}
                    onChange={(value) => onUpdateRow(row.id, { seller: value })}
                    options={sellerOptions}
                    placeholder="Seller"
                    searchable={true}
                  />
                </div>
              </div>

              <div className="mt-3 space-y-3 rounded-lg border border-slate-200/90 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Listing copy & metadata
                </p>
                <MultiSelectFromDropdown
                  compact
                  label="Categories"
                  hint={
                    ruleBasedCategories.length > 0
                      ? `Rule-based additions on save: ${ruleBasedCategories.join(', ')}.`
                      : 'Choose from category master (alias). Rules may add more on save.'
                  }
                  values={row.categories ?? []}
                  onChange={(categories) => onUpdateRow(row.id, { categories })}
                  options={categoryOptions}
                  selectPlaceholder="Add category…"
                />
                <MultiSelectFromDropdown
                  compact
                  label="Features"
                  hint="Same options as Parent Master. Plant+pot: only plant features prefilled."
                  values={row.features ?? []}
                  onChange={(features) => onUpdateRow(row.id, { features })}
                  options={featureDropdownOptions}
                  selectPlaceholder="Add feature…"
                  allowCreate
                />
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">Redirects</label>
                  <p className="text-[10px] text-slate-500 mb-2 leading-snug">One browse URL only (same as Parent Master).</p>
                  <CustomSelect
                    value={row.redirects?.[0] ?? ''}
                    onChange={(v) =>
                      onUpdateRow(row.id, {
                        redirects: String(v ?? '').trim() ? [String(v).trim()] : [],
                      })
                    }
                    options={redirectDropdownOptions}
                    placeholder="Select redirect…"
                    allowCreate
                    searchable
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">GST / Tax</label>
                  <select
                    value={row.tax === 5 || row.tax === 18 ? String(row.tax) : ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      onUpdateRow(row.id, { tax: v === '' ? undefined : Number(v) });
                    }}
                    className="w-full px-2.5 py-2 text-[11px] border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                  >
                    <option value="">No tax (server uses max from parents)</option>
                    <option value="5">5%</option>
                    <option value="18">18%</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Max across all parent lines (plant + pot): {maxTaxFromParentItems(row.parentItems) ?? 0}%
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">Description</label>
                  <textarea
                    value={row.description ?? ''}
                    onChange={(e) => onUpdateRow(row.id, { description: e.target.value })}
                    rows={4}
                    className="w-full px-2.5 py-2 text-[11px] border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none resize-y min-h-[5rem]"
                    placeholder="Product description (HTML allowed)"
                  />
                </div>
                <InlineInput
                  value={row.seoTitle ?? ''}
                  onChange={(v) => onUpdateRow(row.id, { seoTitle: String(v) })}
                  label="SEO title"
                  placeholder={buildDefaultSeoTitle(rowDisplayNameForSeo(row, listingMode))}
                />
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">SEO description</label>
                  <textarea
                    value={row.seoDescription ?? ''}
                    onChange={(e) => onUpdateRow(row.id, { seoDescription: e.target.value })}
                    rows={2}
                    className="w-full px-2.5 py-2 text-[11px] border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none resize-y min-h-[3.5rem]"
                    placeholder={buildDefaultSeoDescription(rowDisplayNameForSeo(row, listingMode))}
                  />
                </div>
              </div>

              {(() => {
                const otherErrs = Object.entries(row.validationErrors).filter(([k]) => k !== 'hub');
                if (otherErrs.length === 0 || row.isValid) return null;
                return (
                  <p className="mt-2 text-[11px] text-red-600 leading-snug">
                    {otherErrs.map(([, msg]) => msg).filter(Boolean).join(' · ')}
                  </p>
                );
              })()}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSaveRow(row.id)}
                  disabled={isSaving || row.isSaved}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow"
                  style={{ backgroundColor: '#E6007A' }}
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
                  {row.isSaved ? 'Listed' : 'List product'}
                </button>
                {row.isSaved && (
                  <span className="text-[11px] text-green-600 inline-flex items-center gap-1">
                    <Check className="w-3 h-3 shrink-0" /> Done for selected hubs
                  </span>
                )}
              </div>
            </div>
          ) : (
            <>
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
            {/* Step 0: Parent */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Parent Products</h3>
                </div>
                {row.validationErrors.contextHub && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {row.validationErrors.contextHub}
                  </p>
                )}
                {childContextHub && parentPickerOptions.length === 0 && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    No listing products found for this hub in this section.
                  </p>
                )}
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
                          parentOptions={parentPickerOptions}
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
                {listingMode === 'child' && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <InlineInput
                      label="Product name"
                      value={row.plant ?? ''}
                      onChange={(v) => {
                        childListingNameTouchedRef.current = true;
                        onUpdateRow(row.id, { plant: String(v) });
                      }}
                      placeholder={
                        autoProductNamePlaceholder !== '—'
                          ? autoProductNamePlaceholder
                          : 'Select a parent above to auto-generate'
                      }
                    />
                  </div>
                )}
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
                    label="Compare at Price (₹) (auto from parent)"
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
                      options={PRODUCT_TAG_OPTIONS.filter((opt) => !(row.tags || []).includes(opt.value))}
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
                    <ChildListingSellerSummary row={row} sellerLabelByKey={sellerLabelByKey} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <div className="space-y-5">
                {/* Status badge */}
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

                {/* ── Section 1: Read-only snapshot ── */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Listing snapshot (read-only)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <ReviewField label="Product name" value={getFinalName()} />
                    <ReviewField
                      label="Generated SKU (per hub)"
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
                      label="Parent SKUs"
                      value={
                        row.parentItems.length > 0
                          ? row.parentItems.map((i) => i.parentSku || '—').join(', ')
                          : '—'
                      }
                      mono
                    />
                    <ReviewField
                      label="Hubs"
                      value={(row.hubs ?? []).join(', ') || '—'}
                    />
                    <ReviewField label="Set Qty" value={String(row.setQuantity ?? 1)} />
                    <ReviewField label="Inventory" value={String(row.inventory_quantity)} highlight />
                    <ReviewField
                      label="Publish status"
                      value={(row.inventory_quantity ?? 0) > 0 ? 'Published (1)' : 'Unpublished (0)'}
                    />
                    <div className="col-span-2">
                      <p className="text-[10px] text-slate-500 mb-0.5">Seller (per hub)</p>
                      <ChildListingSellerSummary row={row} sellerLabelByKey={sellerLabelByKey} />
                    </div>
                  </div>

                </div>

                {/* ── Section 2: Editable hub & seller ── */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Hub & seller</p>
                  <HubMultiSelect
                    selectedHubs={row.hubs ?? []}
                    hubOptions={hubOptions}
                    onChange={(hubs) => onUpdateRow(row.id, { hubs })}
                    error={row.validationErrors.hub}
                  />
                </div>

                {/* ── Section 3: Pricing ── */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Pricing</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Price (₹) <span className="text-slate-400 font-normal">(auto from parents)</span></label>
                      <input
                        type="number"
                        value={row.price || ''}
                        onChange={(e) => onUpdateRow(row.id, { price: Number(e.target.value) || 0 })}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                    <InlineInput
                      value={row.compare_at_price ?? ''}
                      onChange={(value) => onUpdateRow(row.id, { compare_at_price: value === '' ? undefined : Number(value) })}
                      type="number"
                      placeholder="e.g. 499"
                      label="Compare-at price (₹) (auto from parent)"
                    />
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">GST / Tax <span className="text-slate-400 font-normal">(max from parents: {maxTaxFromParentItems(row.parentItems) ?? 0}%)</span></label>
                      <select
                        value={row.tax === 5 || row.tax === 18 ? String(row.tax) : ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          onUpdateRow(row.id, { tax: v === '' ? undefined : Number(v) });
                        }}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                      >
                        <option value="">Auto (use max from parents)</option>
                        <option value="5">5%</option>
                        <option value="18">18%</option>
                      </select>
                    </div>
                    <InlineInput
                      value={row.sort_order ?? 3000}
                      onChange={(value) => onUpdateRow(row.id, { sort_order: value === '' ? 3000 : Number(value) })}
                      type="number"
                      placeholder="3000"
                      label="Sort order"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Tags</label>
                    <div className="flex flex-wrap gap-2 mb-2 min-h-[1.5rem]">
                      {(row.tags || []).map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium">
                          {tag}
                          <button type="button" onClick={() => onUpdateRow(row.id, { tags: (row.tags || []).filter((t) => t !== tag) })} className="p-0.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700">
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
                      options={PRODUCT_TAG_OPTIONS.filter((opt) => !(row.tags || []).includes(opt.value))}
                      placeholder="Add tag…"
                      searchable={false}
                      closeOnSelect={false}
                    />
                  </div>
                </div>

                {/* ── Section 4: Listing copy & metadata (all derived from parents, all editable) ── */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Listing copy & metadata <span className="font-normal normal-case text-slate-400">(derived from parents, editable)</span></p>

                  <MultiSelectFromDropdown
                    label="Categories"
                    hint={
                      ruleBasedCategories.length > 0
                        ? `Rule-based additions on save: ${ruleBasedCategories.join(', ')}.`
                        : 'Choose from category master. Derived from parents where possible; rules may add more on save.'
                    }
                    values={row.categories ?? []}
                    onChange={(categories) => onUpdateRow(row.id, { categories })}
                    options={categoryOptions}
                    selectPlaceholder="Add category…"
                  />

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Collections <span className="text-slate-400 font-normal">(derived from parents)</span></label>
                    <div className="flex flex-wrap gap-2 mb-2 min-h-[1.5rem]">
                      {(row.collectionIds || []).map((id) => (
                        <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium">
                          {collectionNames[id] ?? id}
                          <button type="button" onClick={() => onUpdateRow(row.id, { collectionIds: (row.collectionIds || []).filter((cid) => cid !== id) })} className="p-0.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700">
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
                      placeholder="Add collection…"
                      searchable={true}
                      closeOnSelect={false}
                    />
                  </div>

                  <MultiSelectFromDropdown
                    label="Features"
                    hint="Same options as Parent Master. Plant+pot: only plant features prefilled; multiple plants merge unique values."
                    values={row.features ?? []}
                    onChange={(features) => onUpdateRow(row.id, { features })}
                    options={featureDropdownOptions}
                    selectPlaceholder="Add feature…"
                    allowCreate
                  />

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Redirects</label>
                    <p className="text-[11px] text-slate-500 mb-2 leading-snug">
                      One browse URL from category/collection masters (same as Parent Master).
                    </p>
                    <CustomSelect
                      value={row.redirects?.[0] ?? ''}
                      onChange={(v) =>
                        onUpdateRow(row.id, {
                          redirects: String(v ?? '').trim() ? [String(v).trim()] : [],
                        })
                      }
                      options={redirectDropdownOptions}
                      placeholder="Select redirect…"
                      allowCreate
                      searchable
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Description <span className="text-slate-400 font-normal">(from parent)</span></label>
                    <textarea
                      value={row.description ?? ''}
                      onChange={(e) => onUpdateRow(row.id, { description: e.target.value })}
                      rows={5}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none resize-y min-h-[6rem]"
                      placeholder="Product description (HTML allowed)"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      SEO title{' '}
                      <span className="text-slate-400 font-normal">(uses full product name)</span>
                    </label>
                    <input
                      type="text"
                      value={row.seoTitle ?? ''}
                      onChange={(e) => onUpdateRow(row.id, { seoTitle: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                      placeholder={buildDefaultSeoTitle(rowDisplayNameForSeo(row, listingMode))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      SEO description{' '}
                      <span className="text-slate-400 font-normal">(uses full product name)</span>
                    </label>
                    <textarea
                      value={row.seoDescription ?? ''}
                      onChange={(e) => onUpdateRow(row.id, { seoDescription: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none resize-y min-h-[4rem]"
                      placeholder={buildDefaultSeoDescription(rowDisplayNameForSeo(row, listingMode))}
                    />
                  </div>
                </div>

                {/* Validation errors */}
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
            </>
          )}
        </div>
      </div>

      {/* Footer: child keeps remove + step dots + save; parent uses single List button above */}
      <div
        className={`border-t border-slate-200 px-4 flex items-center justify-between bg-slate-50/50 ${
          listingMode === 'parent' ? 'py-1.5' : 'py-3'
        }`}
      >
        {listingMode === 'child' ? (
          <>
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
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${idx === currentStep ? 'w-5' : 'bg-slate-300 hover:bg-slate-400'}`}
                  style={idx === currentStep ? { backgroundColor: '#E6007A' } : undefined}
                />
              ))}
            </div>

            {currentStep < REVIEW_STEP_INDEX ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 0 && childContextHub?.trim()) {
                    const h = childContextHub.trim();
                    const merged = [...new Set([h, ...(row.hubs ?? [])])];
                    onUpdateRow(row.id, { hubs: merged });
                  }
                  setCurrentStep((s) => Math.min(REVIEW_STEP_INDEX, s + 1));
                }}
                disabled={!stepComplete(currentStep)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                style={{ backgroundColor: '#E6007A' }}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSaveRow(row.id)}
                disabled={isSaving || row.isSaved || !row.isValid}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                style={{ backgroundColor: '#E6007A' }}
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </button>
            )}
          </>
        ) : (
          <p className="text-[10px] text-slate-500 w-full text-center leading-tight">
            From Parent Master — <span className="font-medium text-slate-600">List product</span> above
          </p>
        )}
      </div>
    </div>
  );
}
