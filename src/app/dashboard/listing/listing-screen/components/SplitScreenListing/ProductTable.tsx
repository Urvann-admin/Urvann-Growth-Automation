'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Trash2, AlertCircle, Check, ChevronDown, Plus } from 'lucide-react';
import type { ProductRow, ParentItemRow } from './types';
import type { ParentMaster } from '@/models/parentMaster';
import type { ListingSection } from '@/models/listingProduct';
import { HUB_MAPPINGS } from '@/shared/constants/hubs';
import { POT_TYPES_WITH_PRICING, getPotPrice } from '@/shared/constants/pots';
import { CustomSelect } from '@/app/dashboard/listing/components/CustomSelect';

interface ProductTableProps {
  productRows: ProductRow[];
  availableParents: ParentMaster[];
  onUpdateRow: (rowId: string, updates: Partial<ProductRow>) => void;
  onRemoveRow: (rowId: string) => void;
  section: ListingSection;
  isLoading: boolean;
}

interface EditableFieldProps {
  value: string | number;
  onChange: (value: string | number) => void;
  type?: 'text' | 'number';
  placeholder?: string;
  className?: string;
  error?: string;
}

function EditableField({ value, onChange, type = 'text', placeholder, className = '', error }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(String(value || ''));

  const handleSave = () => {
    const newValue = type === 'number' ? (tempValue ? parseFloat(tempValue) : '') : tempValue;
    onChange(newValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(String(value || ''));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="relative">
        <input
          type={type}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
            error ? 'border-red-300' : 'border-slate-300'
          } ${className}`}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`px-2 py-1 text-sm cursor-text hover:bg-slate-50 rounded min-h-[28px] flex items-center ${
        error ? 'text-red-600' : 'text-slate-900'
      } ${className}`}
    >
      {value || <span className="text-slate-400">{placeholder}</span>}
    </div>
  );
}

interface ParentSelectProps {
  value: string;
  onChange: (parentSku: string, parent?: ParentMaster) => void;
  availableParents: ParentMaster[];
  section: ListingSection;
  error?: string;
}

function ParentSelect({ value, onChange, availableParents, section, error }: ParentSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedParent = availableParents.find(p => p.sku === value);
  
  const filteredParents = useMemo(() => {
    if (!searchQuery.trim()) return availableParents;
    const query = searchQuery.toLowerCase();
    return availableParents.filter(parent => 
      parent.plant.toLowerCase().includes(query) ||
      (parent.sku && parent.sku.toLowerCase().includes(query))
    );
  }, [availableParents, searchQuery]);

  const handleSelect = (parent: ParentMaster) => {
    onChange(parent.sku || '', parent);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-2 py-1 text-sm text-left border rounded hover:bg-slate-50 flex items-center justify-between ${
          error ? 'border-red-300' : 'border-slate-300'
        }`}
      >
        <span className={selectedParent ? 'text-slate-900' : 'text-slate-400'}>
          {selectedParent ? selectedParent.plant : 'Select parent...'}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-slate-200">
            <input
              type="text"
              placeholder="Search parents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div className="max-h-40 overflow-y-auto">
            {filteredParents.length === 0 ? (
              <div className="p-2 text-sm text-slate-600">No parents found</div>
            ) : (
              filteredParents.map(parent => (
                <button
                  key={parent.sku}
                  type="button"
                  onClick={() => handleSelect(parent)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{parent.plant}</div>
                    <div className="text-xs text-slate-600">
                      {parent.sku} • ₹{parent.price} • {(parent.inventory_quantity ?? 0)} available
                    </div>
                  </div>
                </button>
              ))
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
  isLoading 
}: ProductTableProps) {
  const hubOptions = useMemo(() => 
    HUB_MAPPINGS.map(mapping => ({ value: mapping.hub, label: mapping.hub })),
    []
  );

  const potTypeOptions = useMemo(() => {
    const seen = new Set<string>();
    return POT_TYPES_WITH_PRICING.filter(c => {
      if (seen.has(c.value)) return false;
      seen.add(c.value);
      return true;
    }).map(c => ({ value: c.value, label: c.value }));
  }, []);

  const [sellerOptions, setSellerOptions] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/procurement-seller-master?limit=500')
      .then(res => res.json())
      .then(data => {
        if (cancelled || !data.success || !Array.isArray(data.data)) return;
        setSellerOptions(data.data.map((s: { _id: string; seller_name: string }) => ({
          value: String(s._id),
          label: s.seller_name || String(s._id),
        })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const [collectionNames, setCollectionNames] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    fetch('/api/collection-master?limit=500')
      .then(res => res.json())
      .then(data => {
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

  // SKU preview: key = hub|plant|setQuantity, value = sku or 'loading'
  const [skuPreviews, setSkuPreviews] = useState<Record<string, string>>({});
  const skuRequestedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    productRows.forEach((row) => {
      if (row.sku || !row.hub?.trim() || !row.plant?.trim()) return;
      const key = `${row.hub}|${row.plant}|${row.setQuantity ?? 1}`;
      if (skuRequestedRef.current.has(key)) return;
      skuRequestedRef.current.add(key);
      const params = new URLSearchParams({ hub: row.hub, plant: row.plant, setQuantity: String(row.setQuantity ?? 1) });
      fetch(`/api/listing-product/preview-sku?${params}`)
        .then((r) => r.json())
        .then((data) => {
          setSkuPreviews((prev) => ({ ...prev, [key]: data.success ? data.sku : '—' }));
        })
        .catch(() => setSkuPreviews((prev) => ({ ...prev, [key]: '—' })));
    });
  }, [productRows]);

  /** Name: when setQty=1: parent1 & parent2 in size inch type; when setQty>1: Set of N parent1 & parent2 in size inch type */
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

    const potSize = typeof row.size === 'number' ? row.size : Number(row.size) || 0;
    const potPricePerUnit = getPotPrice(row.type || undefined, potSize || undefined);
    const potQty = row.potQuantity ?? 0;
    totalPrice += potPricePerUnit * potQty;

    return {
      price: totalPrice,
      inventory: minInventory === Infinity ? 0 : minInventory,
    };
  };

  const handleParentItemChange = (
    row: ProductRow,
    itemIndex: number,
    updates: Partial<ParentItemRow>
  ) => {
    const updatedItems = row.parentItems.map((item, index) =>
      index === itemIndex ? { ...item, ...updates } : item
    );

    const cleanedItems = updatedItems.filter((item) => item.parentSku && item.quantity > 0);
    const { price, inventory } = recalculatePriceAndInventory({ ...row, parentItems: cleanedItems });

    onUpdateRow(row.id, {
      parentItems: cleanedItems,
      parentSkus: cleanedItems.map((i) => i.parentSku),
      price,
      inventory_quantity: inventory,
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

      // Auto-populate from first parent only (excluding pot info – user fills manually)
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
              categories: Array.from(new Set([...(row.categories || []), ...(parent.categories || [])])),
              collectionIds: Array.from(
                new Set([
                  ...(row.collectionIds || []),
                  ...(parent.collectionIds?.map((id) => String(id)) || []),
                ])
              ),
            }
          : {};

      const tempRow: ProductRow = {
        ...row,
        parentItems: row.parentItems.map((item, index) =>
          index === itemIndex ? { ...item, ...updatedItem } : item
        ),
        ...baseUpdates,
      };

      const { price, inventory } = recalculatePriceAndInventory(tempRow);

      onUpdateRow(row.id, {
        ...baseUpdates,
        parentItems: tempRow.parentItems,
        parentSkus: tempRow.parentItems.map((i) => i.parentSku),
        price,
        inventory_quantity: inventory,
      });
    } else {
      handleParentItemChange(row, itemIndex, { parentSku });
    }
  };

  if (productRows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-slate-900 mb-2">No line items yet</h3>
          <p className="text-sm text-slate-600">
            Click "Add Row" to create line items for your listings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm" style={{ minWidth: '1560px' }}>
        <thead className="bg-slate-50 border-b-2 border-slate-200 sticky top-0 z-10">
          <tr>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-700 w-10">#</th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-700" style={{ minWidth: '200px' }}>Parents</th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-700" style={{ minWidth: '150px' }}>Pot Type</th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-700 w-24">Pot Size</th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-700 w-24">Pot Qty</th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-700 w-24">Set Qty</th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-700 w-28">Price</th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-700" style={{ minWidth: '120px' }}>Hub</th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-700" style={{ minWidth: '160px' }}>Seller</th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-700" style={{ minWidth: '140px' }}>Categories</th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-700" style={{ minWidth: '120px' }}>Collections</th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-700 w-24">Inventory</th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-700 w-24">Status</th>
            <th className="text-right py-3.5 px-4 font-semibold text-slate-700 w-16">Actions</th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-700" style={{ minWidth: '220px' }}>Name & SKU</th>
          </tr>
        </thead>
        <tbody>
          {productRows.map((row) => (
            <tr 
              key={row.id} 
              className={`border-b border-slate-100 hover:bg-slate-50/50 ${
                !row.isValid ? 'bg-red-50/30' : row.isSaved ? 'bg-green-50/30' : ''
              }`}
            >
              {/* Serial */}
              <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                {row.serial}
              </td>

              {/* Parents composition */}
              <td className="py-3 px-4 align-top">
                <div className="space-y-1">
                  {row.parentItems.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <div className="flex-1">
                        <ParentSelect
                          value={item.parentSku}
                          onChange={(parentSku, parent) =>
                            handleParentChange(row, index, parentSku, parent)
                          }
                          availableParents={availableParents}
                          section={section}
                          error={row.validationErrors.parent}
                        />
                      </div>
                      <div className="w-16">
                        <EditableField
                          value={item.quantity}
                          onChange={(value) =>
                            handleParentItemChange(row, index, {
                              quantity: Number(value) || 1,
                            })
                          }
                          type="number"
                          placeholder="Qty"
                        />
                      </div>
                      <div className="w-20 text-xs text-slate-600">
                        ₹{(item.unitPrice || 0) * (item.quantity || 0)}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddParentItem(row)}
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 mt-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add parent
                  </button>
                </div>
              </td>

              {/* Pot Type */}
              <td className="py-3 px-4 min-w-[140px]">
                <CustomSelect
                  value={row.type ?? ''}
                  onChange={(value) => {
                    const updatedRow = { ...row, type: value };
                    const { price, inventory } = recalculatePriceAndInventory(updatedRow);
                    onUpdateRow(row.id, { type: value, price, inventory_quantity: inventory });
                  }}
                  options={potTypeOptions}
                  placeholder="Select pot type"
                  searchable={true}
                />
              </td>

              {/* Pot Size */}
              <td className="py-3 px-4 min-w-[80px] whitespace-nowrap">
                <EditableField
                  value={row.size}
                  onChange={(value) => {
                    const sizeVal = value === '' ? '' : Number(value);
                    const updatedRow = { ...row, size: sizeVal };
                    const { price, inventory } = recalculatePriceAndInventory(updatedRow);
                    onUpdateRow(row.id, { size: sizeVal, price, inventory_quantity: inventory });
                  }}
                  type="number"
                  placeholder="Size"
                />
              </td>

              {/* Pot Quantity */}
              <td className="py-3 px-4 min-w-[72px] whitespace-nowrap">
                <EditableField
                  value={row.potQuantity}
                  onChange={(value) => {
                    const potQty = Number(value) || 0;
                    const updatedRow = { ...row, potQuantity: potQty };
                    const { price, inventory } = recalculatePriceAndInventory(updatedRow);
                    onUpdateRow(row.id, { potQuantity: potQty, price, inventory_quantity: inventory });
                  }}
                  type="number"
                  placeholder="0"
                />
              </td>

              {/* Set Quantity */}
              <td className="py-3 px-4 whitespace-nowrap">
                <EditableField
                  value={row.setQuantity}
                  onChange={(value) => {
                    const setQty = Number(value) || 1;
                    onUpdateRow(row.id, { setQuantity: setQty, quantity: setQty });
                  }}
                  type="number"
                  placeholder="1"
                  error={row.validationErrors.quantity}
                />
              </td>

              {/* Price */}
              <td className="py-3 px-4 whitespace-nowrap">
                <EditableField
                  value={row.price}
                  onChange={(value) => onUpdateRow(row.id, { price: Number(value) || 0 })}
                  type="number"
                  placeholder="Price"
                />
              </td>

              {/* Hub */}
              <td className="py-3 px-4 min-w-[120px]">
                <CustomSelect
                  value={row.hub ?? ''}
                  onChange={(value) => onUpdateRow(row.id, { hub: value })}
                  options={hubOptions}
                  placeholder="Select hub"
                  error={row.validationErrors.hub}
                  searchable={true}
                />
              </td>

              {/* Seller */}
              <td className="py-3 px-4 min-w-[160px]">
                <CustomSelect
                  value={row.seller ?? ''}
                  onChange={(value) => onUpdateRow(row.id, { seller: value })}
                  options={sellerOptions}
                  placeholder="Select seller"
                  searchable={true}
                />
              </td>

              {/* Categories */}
              <td className="py-3 px-4 text-sm text-slate-700 min-w-[140px]">
                {(row.categories?.length ?? 0) > 0
                  ? (row.categories || []).join(', ')
                  : '—'}
              </td>

              {/* Collections */}
              <td className="py-3 px-4 text-sm text-slate-700 min-w-[120px]">
                {(row.collectionIds?.length ?? 0) > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {(row.collectionIds || []).map((id) => {
                      const fullName = collectionNames[String(id)] ?? String(id);
                      const firstWord = fullName.trim().split(/\s+/)[0] || fullName;
                      return (
                        <span
                          key={id}
                          title={fullName}
                          className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 cursor-help"
                        >
                          {firstWord}
                        </span>
                      );
                    })}
                  </span>
                ) : (
                  '—'
                )}
              </td>

              {/* Inventory */}
              <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                {row.inventory_quantity}
              </td>

              {/* Status */}
              <td className="py-3 px-4 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  {row.isSaved ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <Check className="w-4 h-4" />
                      <span className="text-xs">Saved</span>
                    </div>
                  ) : row.isValid ? (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <Check className="w-4 h-4" />
                      <span className="text-xs">Valid</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs">Invalid</span>
                    </div>
                  )}
                </div>
              </td>

              {/* Actions */}
              <td className="py-3 px-4 text-right whitespace-nowrap">
                <button
                  onClick={() => onRemoveRow(row.id)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded"
                  title="Remove row"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>

              {/* Name & SKU (last column) */}
              <td className="py-3 px-4 text-sm min-w-[220px] align-top">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-slate-900">{getFinalName(row)}</span>
                  <span className="text-slate-600 font-mono text-xs">
                    {row.sku || (row.hub?.trim() && row.plant?.trim()
                      ? skuPreviews[`${row.hub}|${row.plant}|${row.setQuantity ?? 1}`] ?? '…'
                      : '—')}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}