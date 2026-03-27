'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Check, ChevronDown, Search } from 'lucide-react';
import type { Category } from '@/models/category';
import type { ProcurementSellerMaster } from '@/models/procurementSellerMaster';
import type { ProductType } from '@/models/parentMaster';
import { CustomSelect } from '../../components/CustomSelect';
import { MOSS_STICK_OPTIONS, POT_TYPE_OPTIONS, COLOUR_OPTIONS, FEATURES_OPTIONS, REDIRECTS_OPTIONS } from '../ProductMasterForm/types';
import { ModalContainer, ModalHeader, ModalFooter, ModalSection } from '../../shared';

interface EditParentForm {
  productType: ProductType;
  sku: string;
  productCode: string;
  vendorMasterId: string;
  parentSku: string;
  plant: string;
  otherNames: string;
  variety: string;
  colour: string;
  height: number | '';
  mossStick: string;
  size: number | '';
  potType: string;
  seller: string;
  features: string;
  redirects: string;
  categories: string[];
  sellingPrice: number | '';
  compare_at: number | '';
  images: string[];
}

interface EditParentModalProps {
  isOpen: boolean;
  editForm: EditParentForm | null;
  saving: boolean;
  categories: Category[];
  sellers: ProcurementSellerMaster[];
  onClose: () => void;
  onSave: () => void;
  onChange: (form: EditParentForm) => void;
}

function getCategoryName(categories: Category[], categoryId: string): string {
  const cat = categories.find((c) => c._id === categoryId || c.categoryId === categoryId);
  return cat?.category || categoryId;
}

function productTypeTitle(t: ProductType | undefined): string {
  if (!t || t === 'parent') return 'Parent';
  if (t === 'growing_product') return 'Growing product';
  return 'Consumable';
}

export function EditParentModal({
  isOpen,
  editForm,
  saving,
  categories,
  sellers,
  onClose,
  onSave,
  onChange,
}: EditParentModalProps) {
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!editForm) return null;

  const sellerOptions = [
    { value: '', label: 'Select Procurement Seller' },
    ...sellers.map((s) => ({ value: String(s._id), label: s.seller_name })),
  ];

  const primaryVendorOptions = [
    { value: '', label: 'Select primary vendor' },
    ...sellers.map((s) => ({
      value: String(s._id),
      label: s.vendorCode ? `${s.seller_name} (${s.vendorCode})` : s.seller_name,
    })),
  ];

  const isParentProduct = !editForm.productType || editForm.productType === 'parent';

  const filteredCategories = categories.filter((cat) =>
    categorySearch.trim()
      ? (cat.category ?? '').toLowerCase().includes(categorySearch.toLowerCase())
      : true
  );

  const inputClass =
    'w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-shadow';

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Edit product" onClose={onClose} />

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6 space-y-6">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <span className="font-medium text-slate-700">Product type: </span>
            <span className="text-slate-900">{productTypeTitle(editForm.productType)}</span>
            <span className="text-slate-500"> (cannot be changed here)</span>
          </div>

          {!isParentProduct && (
            <ModalSection title="Identifiers">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block sm:col-span-2">
                  <span className="block text-sm font-medium text-slate-700 mb-1.5">Name</span>
                  <input
                    type="text"
                    value={editForm.plant}
                    onChange={(e) => onChange({ ...editForm, plant: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-slate-700 mb-1.5">Product code</span>
                  <input
                    type="text"
                    value={editForm.productCode}
                    onChange={(e) => onChange({ ...editForm, productCode: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <CustomSelect
                  label="Primary vendor (Vendor Master)"
                  value={editForm.vendorMasterId}
                  onChange={(v) => onChange({ ...editForm, vendorMasterId: v })}
                  options={primaryVendorOptions}
                  placeholder="Select vendor"
                />
                <label className="block sm:col-span-2">
                  <span className="block text-sm font-medium text-slate-700 mb-1.5">Parent SKU</span>
                  <input
                    type="text"
                    value={editForm.parentSku}
                    onChange={(e) => onChange({ ...editForm, parentSku: e.target.value })}
                    className={inputClass}
                    placeholder="Base parent product SKU"
                  />
                </label>
              </div>
            </ModalSection>
          )}

          <ModalSection title={isParentProduct ? 'Basics' : 'Optional attributes'}>
            {isParentProduct ? (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Plant name</span>
                <input
                  type="text"
                  value={editForm.plant}
                  onChange={(e) => onChange({ ...editForm, plant: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Other names</span>
                <input
                  type="text"
                  value={editForm.otherNames}
                  onChange={(e) => onChange({ ...editForm, otherNames: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Variety</span>
                <input
                  type="text"
                  value={editForm.variety}
                  onChange={(e) => onChange({ ...editForm, variety: e.target.value })}
                  className={inputClass}
                />
              </label>
              <CustomSelect
                label="Colour"
                value={editForm.colour}
                onChange={(v) => onChange({ ...editForm, colour: v })}
                options={COLOUR_OPTIONS}
                placeholder="Select Colour"
              />
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Height (feet)</span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={editForm.height}
                  onChange={(e) =>
                    onChange({
                      ...editForm,
                      height: e.target.value ? parseFloat(e.target.value) : '',
                    })
                  }
                  className={inputClass}
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
                    onChange({
                      ...editForm,
                      size: e.target.value ? parseFloat(e.target.value) : '',
                    })
                  }
                  className={inputClass}
                />
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <CustomSelect
                label="Moss Stick"
                value={editForm.mossStick}
                onChange={(v) => onChange({ ...editForm, mossStick: v })}
                options={MOSS_STICK_OPTIONS}
                placeholder="Select Moss Stick"
              />
              <CustomSelect
                label="Pot Type"
                value={editForm.potType}
                onChange={(v) => onChange({ ...editForm, potType: v })}
                options={POT_TYPE_OPTIONS}
                placeholder="Select Pot Type"
              />
              <CustomSelect
                label="Procurement Seller"
                value={editForm.seller}
                onChange={(v) => onChange({ ...editForm, seller: v })}
                options={sellerOptions}
                placeholder="Select Procurement Seller"
              />
              <CustomSelect
                label="Features"
                value={editForm.features}
                onChange={(v) => onChange({ ...editForm, features: v })}
                options={FEATURES_OPTIONS}
                placeholder="Select Features"
                multiSelect
              />
              <CustomSelect
                label="Redirects"
                value={editForm.redirects}
                onChange={(v) => onChange({ ...editForm, redirects: v })}
                options={REDIRECTS_OPTIONS}
                placeholder="Select Redirects"
              />
            </div>
            </>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-4">
                  Optional plant-style attributes and procurement seller (if this product uses them).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-sm font-medium text-slate-700 mb-1.5">Other names</span>
                    <input
                      type="text"
                      value={editForm.otherNames}
                      onChange={(e) => onChange({ ...editForm, otherNames: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium text-slate-700 mb-1.5">Variety</span>
                    <input
                      type="text"
                      value={editForm.variety}
                      onChange={(e) => onChange({ ...editForm, variety: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <CustomSelect
                    label="Colour"
                    value={editForm.colour}
                    onChange={(v) => onChange({ ...editForm, colour: v })}
                    options={COLOUR_OPTIONS}
                    placeholder="Select Colour"
                  />
                  <CustomSelect
                    label="Moss Stick"
                    value={editForm.mossStick}
                    onChange={(v) => onChange({ ...editForm, mossStick: v })}
                    options={MOSS_STICK_OPTIONS}
                    placeholder="Select Moss Stick"
                  />
                  <CustomSelect
                    label="Pot Type"
                    value={editForm.potType}
                    onChange={(v) => onChange({ ...editForm, potType: v })}
                    options={POT_TYPE_OPTIONS}
                    placeholder="Select Pot Type"
                  />
                  <CustomSelect
                    label="Procurement Seller"
                    value={editForm.seller}
                    onChange={(v) => onChange({ ...editForm, seller: v })}
                    options={sellerOptions}
                    placeholder="Select Procurement Seller"
                  />
                  <CustomSelect
                    label="Features"
                    value={editForm.features}
                    onChange={(v) => onChange({ ...editForm, features: v })}
                    options={FEATURES_OPTIONS}
                    placeholder="Select Features"
                    multiSelect
                  />
                  <CustomSelect
                    label="Redirects"
                    value={editForm.redirects}
                    onChange={(v) => onChange({ ...editForm, redirects: v })}
                    options={REDIRECTS_OPTIONS}
                    placeholder="Select Redirects"
                  />
                </div>
              </>
            )}
          </ModalSection>

          <ModalSection title="Pricing">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Selling Price</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editForm.sellingPrice}
                  onChange={(e) =>
                    onChange({
                      ...editForm,
                      sellingPrice: e.target.value ? parseFloat(e.target.value) : '',
                    })
                  }
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Compare-at price</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editForm.compare_at}
                  onChange={(e) =>
                    onChange({
                      ...editForm,
                      compare_at: e.target.value ? parseFloat(e.target.value) : '',
                    })
                  }
                  className={inputClass}
                  placeholder="Optional"
                />
              </label>
              <p className="text-xs text-slate-500 sm:col-span-2">
                Listing price is computed on save (selling price × procurement seller factor).
              </p>
            </div>
          </ModalSection>

          <ModalSection title="Categories">
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
                        onChange({
                          ...editForm,
                          categories: editForm.categories.filter((id) => id !== categoryId),
                        })
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
                    {filteredCategories.length === 0 ? (
                      <p className="text-slate-500 text-sm px-3 py-2">No categories found</p>
                    ) : (
                      filteredCategories.map((cat) => {
                        const id = String(cat._id);
                        const selected = editForm.categories.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              onChange({
                                ...editForm,
                                categories: selected
                                  ? editForm.categories.filter((c) => c !== id)
                                  : [...editForm.categories, id],
                              });
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
          </ModalSection>
        </div>
      </div>

      <ModalFooter onCancel={onClose} onSave={onSave} saving={saving} />
    </ModalContainer>
  );
}
