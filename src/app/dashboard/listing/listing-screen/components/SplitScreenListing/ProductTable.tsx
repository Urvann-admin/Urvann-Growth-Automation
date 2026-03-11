'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
  ChevronRight,
  ChevronLeft,
  Search,
  X,
} from 'lucide-react';
import type { ProductRow, ParentItemRow } from './types';
import type { ParentMaster } from '@/models/parentMaster';
import type { ListingSection } from '@/models/listingProduct';
import { HUB_MAPPINGS } from '@/shared/constants/hubs';
const TAG_OPTIONS = [
  { value: 'Bestseller', label: 'Bestseller' },
  { value: 'New Arrival', label: 'New Arrival' },
  { value: 'Sale', label: 'Sale' },
  { value: 'Featured', label: 'Featured' },
  { value: 'Trending', label: 'Trending' },
  { value: 'Clearance', label: 'Clearance' },
  { value: 'Limited Stock', label: 'Limited Stock' },
];
import { CustomSelect } from '@/app/dashboard/listing/components/CustomSelect';

interface ProductTableProps {
  productRows: ProductRow[];
  availableParents: ParentMaster[];
  onUpdateRow: (rowId: string, updates: Partial<ProductRow>) => void;
  onRemoveRow: (rowId: string) => void;
  section: ListingSection;
  isLoading: boolean;
  /** When provided, active row is controlled by parent (e.g. for Save & Next flow). */
  activeRowId?: string | null;
  onActiveRowChange?: (rowId: string | null) => void;
}

const STEPS = [
  { id: 'parent', label: 'Parent', icon: Package },
  { id: 'pricing', label: 'Pricing', icon: Settings2 },
  { id: 'hub-seller', label: 'Hub & Seller', icon: Building2 },
  { id: 'review', label: 'Review', icon: ClipboardCheck },
] as const;

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
      {label && (
        <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      )}
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
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
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
          <div className="max-h-52 overflow-y-auto">
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
        </div>
      )}
    </div>
  );
}

export function ProductTable({
  productRows,
  availableParents,
  onUpdateRow,
  onRemoveRow,
  section,
  isLoading,
  activeRowId: controlledActiveRowId,
  onActiveRowChange,
}: ProductTableProps) {
  const [internalActiveRowId, setInternalActiveRowId] = useState<string | null>(null);
  const activeRowId = controlledActiveRowId !== undefined ? controlledActiveRowId : internalActiveRowId;
  const setActiveRowId = onActiveRowChange ?? setInternalActiveRowId;
  const [stepByRow, setStepByRow] = useState<Record<string, number>>({});

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
    return () => {
      cancelled = true;
    };
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
    return () => {
      cancelled = true;
    };
  }, []);

  const collectionOptions = useMemo(
    () =>
      Object.entries(collectionNames).map(([value, label]) => ({
        value,
        label: label || value,
      })),
    [collectionNames]
  );

  const [skuPreviews, setSkuPreviews] = useState<Record<string, string>>({});
  const skuRequestedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    productRows.forEach((row) => {
      if (row.sku || !row.hub?.trim() || !row.plant?.trim()) return;
      const key = `${row.hub}|${row.plant}|${row.setQuantity ?? 1}`;
      if (skuRequestedRef.current.has(key)) return;
      skuRequestedRef.current.add(key);
      const params = new URLSearchParams({
        hub: row.hub,
        plant: row.plant,
        setQuantity: String(row.setQuantity ?? 1),
      });
      fetch(`/api/listing-product/preview-sku?${params}`)
        .then((r) => r.json())
        .then((data) => {
          setSkuPreviews((prev) => ({ ...prev, [key]: data.success ? data.sku : '—' }));
        })
        .catch(() => setSkuPreviews((prev) => ({ ...prev, [key]: '—' })));
    });
  }, [productRows]);

  useEffect(() => {
    if (productRows.length > 0 && !activeRowId) {
      setActiveRowId(productRows[0].id);
    }
    if (activeRowId && !productRows.find((r) => r.id === activeRowId)) {
      setActiveRowId(productRows[0]?.id ?? null);
    }
  }, [productRows, activeRowId]);

  const activeRow = productRows.find((r) => r.id === activeRowId) ?? null;
  const currentStep = activeRow ? (stepByRow[activeRow.id] ?? 0) : 0;

  const setStep = (step: number) => {
    if (!activeRow) return;
    setStepByRow((prev) => ({ ...prev, [activeRow.id]: step }));
  };

  const getFinalName = (row: ProductRow): string => {
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

  const recalculatePriceAndInventory = (row: ProductRow): { price: number; inventory: number } => {
    let totalPrice = 0;
    let minInventory = Infinity;

    row.parentItems.forEach((item) => {
      const parent = item.parent;
      if (!parent || !item.quantity) return;
      const unitPrice = item.unitPrice || parent.price || 0;
      totalPrice += unitPrice * item.quantity;
      const availableUnits = parent.inventory_quantity ?? 0;
      const possibleSets = Math.floor(availableUnits / item.quantity);
      minInventory = Math.min(minInventory, possibleSets);
    });

    return {
      price: totalPrice,
      inventory: minInventory === Infinity ? 0 : minInventory,
    };
  };

  const calcSetQuantity = (items: ParentItemRow[]): number =>
    items.reduce((sum, i) => sum + (i.quantity || 0), 0) || 1;

  const handleParentItemChange = (row: ProductRow, itemIndex: number, updates: Partial<ParentItemRow>) => {
    const updatedItems = row.parentItems.map((item, index) =>
      index === itemIndex ? { ...item, ...updates } : item
    );
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

  const handleAddParentItem = (row: ProductRow) => {
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

  /** When row has no parent items yet, add the selected parent in a single update (avoids race with placeholder). */
  const handleSelectFirstParent = (row: ProductRow, parent: ParentMaster) => {
    const newItem: ParentItemRow = {
      id: `parent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      parentSku: parent.sku || '',
      quantity: 1,
      unitPrice: parent.price || 0,
      parent,
    };
    const updatedItems = [newItem];
    const { price, inventory } = recalculatePriceAndInventory({ ...row, parentItems: updatedItems });
    const setQty = calcSetQuantity(updatedItems);
    onUpdateRow(row.id, {
      parentItems: updatedItems,
      parentSkus: [parent.sku || ''],
      plant: parent.plant || row.plant,
      otherNames: parent.otherNames || row.otherNames,
      variety: parent.variety || row.variety,
      colour: parent.colour || row.colour,
      height: parent.height ?? row.height,
      hub: row.hub || parent.hub || '',
      seller: row.seller || parent.seller || '',
      categories: Array.from(new Set([...(row.categories || []), ...(parent.categories || [])])),
      collectionIds: Array.from(
        new Set([
          ...(row.collectionIds || []),
          ...(parent.collectionIds?.map((id) => String(id)) || []),
        ])
      ),
      price,
      inventory_quantity: inventory,
      setQuantity: setQty,
      quantity: setQty,
    });
  };

  const handleRemoveParentItem = (row: ProductRow, itemIndex: number) => {
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

  const handleParentChange = (
    row: ProductRow,
    itemIndex: number,
    parentSku: string,
    parent?: ParentMaster
  ) => {
    if (parent) {
      const updatedItem: Partial<ParentItemRow> = {
        parentSku: parent.sku || '',
        unitPrice: parent.price || 0,
        parent,
      };
      const updatedItems = row.parentItems.map((item, index) =>
        index === itemIndex ? { ...item, ...updatedItem } : item
      );

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
              hub: row.hub || parent.hub || '',
              seller: row.seller || parent.seller || '',
              categories: Array.from(combinedCategories),
              collectionIds: Array.from(combinedCollectionIds),
            }
          : {
              categories: Array.from(combinedCategories),
              collectionIds: Array.from(combinedCollectionIds),
            };

      const tempRow: ProductRow = {
        ...row,
        parentItems: updatedItems,
        ...baseUpdates,
      };
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
      handleParentItemChange(row, itemIndex, { parentSku });
    }
  };

  if (productRows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center px-6">
          <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-pink-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 mb-1">No products yet</h3>
          <p className="text-sm text-slate-500">
            Click &ldquo;+ Add Row&rdquo; to start creating products
          </p>
        </div>
      </div>
    );
  }

  if (!activeRow) return null;

  const stepComplete = (row: ProductRow, step: number): boolean => {
    switch (step) {
      case 0:
        return row.parentItems.length > 0 && row.parentItems.some((i) => i.parentSku);
      case 1:
        return row.price > 0;
      case 2:
        return Boolean(row.hub);
      case 3:
        return row.isValid;
      default:
        return false;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Row tabs */}
      <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 overflow-x-auto shrink-0">
        {productRows.map((row, idx) => {
          const isActive = row.id === activeRowId;
          const plantLabel = row.plant ? row.plant.slice(0, 16) : `Product ${idx + 1}`;
          return (
            <button
              key={row.id}
              onClick={() => setActiveRowId(row.id)}
              className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'text-white shadow-md shadow-pink-200'
                  : 'bg-white text-slate-600 hover:bg-pink-50 border border-slate-200 hover:border-pink-200'
              }`}
              style={isActive ? { backgroundColor: '#E6007A' } : undefined}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {idx + 1}
              </span>
              <span className="max-w-[100px] truncate">{plantLabel}</span>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                row.isSaved ? 'bg-green-400' : row.isValid ? 'bg-emerald-400' : 'bg-amber-400'
              } ${isActive ? '' : ''}`} />
              {productRows.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveRow(row.id);
                  }}
                  className={`ml-0.5 p-0.5 rounded-full transition-opacity ${
                    isActive
                      ? 'text-white/60 hover:text-white hover:bg-white/20'
                      : 'text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </button>
          );
        })}
      </div>

      {/* Stepper */}
      <div className="px-4 py-3 shrink-0">
        <div className="flex items-center">
          {STEPS.map((step, idx) => {
            const isActive = currentStep === idx;
            const isCompleted = stepComplete(activeRow, idx);
            const StepIcon = step.icon;
            return (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => setStep(idx)}
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
                    {isCompleted && !isActive ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <StepIcon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-1 ${
                    stepComplete(activeRow, idx) ? 'bg-pink-200' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content - fills remaining space */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 pb-4">
        <div className="flex-1 min-h-0 overflow-auto bg-white rounded-2xl border border-slate-200 p-5">
          {/* Step 0: Parent Selection */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Parent Products</h3>
                <p className="text-xs text-slate-500 mt-0.5">Add parent products and specify quantities</p>
              </div>

              <div className="space-y-3">
                {(activeRow.parentItems.length === 0
                  ? [{ id: 'empty_0', parentSku: '', quantity: 1, unitPrice: 0 } as ParentItemRow]
                  : activeRow.parentItems
                ).map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex-1 min-w-0">
                      <ParentSearchSelect
                        value={item.parentSku}
                        onChange={(parentSku, parent) =>
                          activeRow.parentItems.length === 0 && index === 0 && parent
                            ? handleSelectFirstParent(activeRow, parent)
                            : handleParentChange(activeRow, index, parentSku, parent)
                        }
                        availableParents={availableParents}
                        error={index === 0 ? activeRow.validationErrors.parent : undefined}
                      />
                    </div>
                    <div className="w-[1px] self-stretch min-h-6 bg-slate-200 shrink-0" aria-hidden />
                    <div className="min-w-[140px] shrink-0 text-xs text-slate-500 flex items-center gap-2">
                      {item.parent ? (
                        <>
                          <span className="font-mono text-slate-700 truncate" title={item.parentSku}>{item.parentSku}</span>
                          <span className="text-slate-400">·</span>
                          <span>{item.parent.inventory_quantity ?? 0} in stock</span>
                          {((item.unitPrice || 0) * (item.quantity || 0)) > 0 && (
                            <>
                              <span className="text-slate-400">·</span>
                              <span className="text-slate-700 font-medium">
                                ₹{((item.unitPrice || 0) * (item.quantity || 0)).toLocaleString()}
                              </span>
                            </>
                          )}
                        </>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Qty</span>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleParentItemChange(activeRow, index, {
                            quantity: Number(e.target.value) || 1,
                          })
                        }
                        className="w-16 px-2 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                        min={1}
                      />
                    </div>
                    {activeRow.parentItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveParentItem(activeRow, index)}
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
                onClick={() => handleAddParentItem(activeRow)}
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

              {/* Calculated Price */}
              <div className="p-4 bg-pink-50 rounded-xl border border-pink-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#E6007A]">Calculated Price</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-[#330033]">
                      ₹{activeRow.price.toLocaleString()}
                    </span>
                    <input
                      type="number"
                      value={activeRow.price || ''}
                      onChange={(e) => onUpdateRow(activeRow.id, { price: Number(e.target.value) || 0 })}
                      className="w-24 px-2 py-1 text-sm border border-pink-200 rounded-lg bg-white text-right focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                      placeholder="Override"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InlineInput
                  value={activeRow.compare_at_price ?? ''}
                  onChange={(value) => {
                    onUpdateRow(activeRow.id, { compare_at_price: value === '' ? undefined : Number(value) });
                  }}
                  type="number"
                  placeholder="Compare at price"
                  label="Compare at Price (₹)"
                />

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(activeRow.tags || []).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateRow(activeRow.id, {
                              tags: (activeRow.tags || []).filter((t) => t !== tag),
                            })
                          }
                          className="p-0.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700"
                          aria-label="Remove tag"
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
                      const tags = activeRow.tags || [];
                      if (tags.includes(value)) return;
                      onUpdateRow(activeRow.id, { tags: [...tags, value] });
                    }}
                    options={TAG_OPTIONS.filter((opt) => !(activeRow.tags || []).includes(opt.value))}
                    placeholder="Add tag..."
                    searchable={false}
                  />
                </div>

                <InlineInput
                  value={activeRow.sort_order ?? 3000}
                  onChange={(value) => {
                    onUpdateRow(activeRow.id, { sort_order: value === '' ? 3000 : Number(value) });
                  }}
                  type="number"
                  placeholder="3000"
                  label="Sort Order"
                />

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Set Quantity</label>
                  <div className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-medium">
                    {activeRow.setQuantity ?? 1}
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
                <p className="text-xs text-slate-500 mt-0.5">Assign hub and seller for this product</p>
              </div>

              <div className="grid grid-cols-1 gap-4 max-w-md">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Hub</label>
                  <CustomSelect
                    value={activeRow.hub ?? ''}
                    onChange={(value) => onUpdateRow(activeRow.id, { hub: value })}
                    options={hubOptions}
                    placeholder="Hub"
                    error={activeRow.validationErrors.hub}
                    searchable={true}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Seller</label>
                  <CustomSelect
                    value={activeRow.seller ?? ''}
                    onChange={(value) => onUpdateRow(activeRow.id, { seller: value })}
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

              {/* Status badge */}
              <div className="flex items-center gap-2">
                {activeRow.isSaved ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                    <Check className="w-3.5 h-3.5" /> Saved
                  </span>
                ) : activeRow.isValid ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-50 text-[#E6007A] text-xs font-medium">
                    <Check className="w-3.5 h-3.5" /> Ready to save
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-xs font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> Incomplete
                  </span>
                )}
              </div>

              {/* Read-only computed fields */}
              <div className="grid grid-cols-2 gap-3">
                <ReviewField label="Product Name" value={getFinalName(activeRow)} />
                <ReviewField
                  label="SKU"
                  value={
                    activeRow.sku ||
                    (activeRow.hub?.trim() && activeRow.plant?.trim()
                      ? skuPreviews[`${activeRow.hub}|${activeRow.plant}|${activeRow.setQuantity ?? 1}`] ?? 'Generating...'
                      : '—')
                  }
                  mono
                />
                <ReviewField
                  label="Parents"
                  value={
                    activeRow.parentItems.length > 0
                      ? activeRow.parentItems
                          .filter((i) => i.parent)
                          .map((i) => `${i.parent!.plant} ×${i.quantity}`)
                          .join(', ') || '—'
                      : '—'
                  }
                />
                <ReviewField label="Set Qty" value={String(activeRow.setQuantity ?? 1)} />
                <ReviewField label="Inventory" value={String(activeRow.inventory_quantity)} highlight />
                <ReviewField
                  label="Categories"
                  value={activeRow.categories?.length ? activeRow.categories.join(', ') : '—'}
                />
              </div>

              {/* Editable fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Hub <span className="text-red-400">*</span></label>
                  <CustomSelect
                    value={activeRow.hub ?? ''}
                    onChange={(value) => onUpdateRow(activeRow.id, { hub: value })}
                    options={hubOptions}
                    placeholder="Hub"
                    error={activeRow.validationErrors.hub}
                    searchable={true}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Seller</label>
                  <CustomSelect
                    value={activeRow.seller ?? ''}
                    onChange={(value) => onUpdateRow(activeRow.id, { seller: value })}
                    options={sellerOptions}
                    placeholder="Seller"
                    searchable={true}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Price (₹)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#330033]">₹{activeRow.price.toLocaleString()}</span>
                    <input
                      type="number"
                      value={activeRow.price || ''}
                      onChange={(e) => onUpdateRow(activeRow.id, { price: Number(e.target.value) || 0 })}
                      className="flex-1 px-2 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                      placeholder="Override"
                    />
                  </div>
                </div>
                <InlineInput
                  value={activeRow.compare_at_price ?? ''}
                  onChange={(value) => {
                    onUpdateRow(activeRow.id, { compare_at_price: value === '' ? undefined : Number(value) });
                  }}
                  type="number"
                  placeholder="Compare at price"
                  label="Compare at Price (₹)"
                />

                <InlineInput
                  value={activeRow.sort_order ?? 3000}
                  onChange={(value) => {
                    onUpdateRow(activeRow.id, { sort_order: value === '' ? 3000 : Number(value) });
                  }}
                  type="number"
                  placeholder="3000"
                  label="Sort Order"
                />
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(activeRow.tags || []).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateRow(activeRow.id, {
                              tags: (activeRow.tags || []).filter((t) => t !== tag),
                            })
                          }
                          className="p-0.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700"
                          aria-label="Remove tag"
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
                      const tags = activeRow.tags || [];
                      if (tags.includes(value)) return;
                      onUpdateRow(activeRow.id, { tags: [...tags, value] });
                    }}
                    options={TAG_OPTIONS.filter((opt) => !(activeRow.tags || []).includes(opt.value))}
                    placeholder="Add tag..."
                    searchable={false}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Collections</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(activeRow.collectionIds || []).map((id) => (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium"
                      >
                        {collectionNames[id] ?? id}
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateRow(activeRow.id, {
                              collectionIds: (activeRow.collectionIds || []).filter((cid) => cid !== id),
                            })
                          }
                          className="p-0.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700"
                          aria-label="Remove collection"
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
                      const ids = activeRow.collectionIds || [];
                      if (ids.includes(value)) return;
                      onUpdateRow(activeRow.id, { collectionIds: [...ids, value] });
                    }}
                    options={collectionOptions.filter((opt) => !(activeRow.collectionIds || []).includes(opt.value))}
                    placeholder="Add collection..."
                    searchable={true}
                  />
                </div>
              </div>

              {/* Validation errors */}
              {Object.keys(activeRow.validationErrors).length > 0 && !activeRow.isValid && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-xs font-medium text-red-700 mb-1">Missing fields:</p>
                  <ul className="space-y-0.5">
                    {Object.entries(activeRow.validationErrors).map(([key, msg]) => (
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

      {/* Navigation */}
      <div className="px-4 py-3 border-t border-slate-200 bg-white shrink-0 flex items-center justify-between">
        <button
          onClick={() => setStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-1">
          {STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setStep(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentStep ? 'w-6' : 'bg-slate-300 hover:bg-slate-400'
              }`}
              style={idx === currentStep ? { backgroundColor: '#E6007A' } : undefined}
            />
          ))}
        </div>

        <button
          onClick={() => setStep(Math.min(STEPS.length - 1, currentStep + 1))}
          disabled={currentStep === STEPS.length - 1}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          style={{ backgroundColor: '#E6007A' }}
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
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
