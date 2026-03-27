'use client';

import { useMemo, useState, useEffect } from 'react';
import { Search, X, Check, Image as ImageIcon, Upload, ZoomIn } from 'lucide-react';
import type { ParentMaster } from '@/models/parentMaster';
import type { ProcurementSellerMaster } from '@/models/procurementSellerMaster';
import type { NonParentFormData, ProductFlowType } from '../types';
import { CustomSelect } from '../../../components/CustomSelect';
import { ImagePreviewModal } from '../../../shared';

export interface StepNonParentProductInfoProps {
  productFlowType: Exclude<ProductFlowType, 'parent'>;
  data: NonParentFormData;
  vendors: ProcurementSellerMaster[];
  baseParents: ParentMaster[];
  errors: Record<string, string>;
  selectedFiles: File[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFieldChange: (field: keyof NonParentFormData, value: string) => void;
  onClearError: (key: string) => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveSelectedFile: (index: number) => void;
}

export function StepNonParentProductInfo({
  productFlowType,
  data,
  vendors,
  baseParents,
  errors,
  selectedFiles,
  fileInputRef,
  onFieldChange,
  onClearError,
  onImageSelect,
  onRemoveSelectedFile,
}: StepNonParentProductInfoProps) {
  const [parentQuery, setParentQuery] = useState('');
  const [parentOpen, setParentOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewImages, setPreviewImages] = useState<string[]>([]);

  const selectedObjectUrls = useMemo(
    () => selectedFiles.map((file) => URL.createObjectURL(file)),
    [selectedFiles]
  );

  useEffect(() => {
    return () => {
      selectedObjectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [selectedObjectUrls]);

  const vendorOptions = useMemo(
    () => [
      { value: '', label: 'Select primary vendor' },
      ...vendors.map((v) => ({
        value: String(v._id),
        label: v.vendorCode ? `${v.seller_name} (${v.vendorCode})` : v.seller_name,
      })),
    ],
    [vendors]
  );

  const filteredParents = useMemo(() => {
    const q = parentQuery.trim().toLowerCase();
    if (!q) return baseParents.slice(0, 80);
    return baseParents
      .filter((p) => {
        const sku = (p.sku ?? '').toLowerCase();
        const name = (p.plant ?? '').toLowerCase();
        const fn = (p.finalName ?? '').toLowerCase();
        return sku.includes(q) || name.includes(q) || fn.includes(q);
      })
      .slice(0, 80);
  }, [baseParents, parentQuery]);

  const selectedParentLabel = useMemo(() => {
    if (!data.parentSku) return '';
    const p = baseParents.find((x) => (x.sku ?? '').trim() === data.parentSku.trim());
    if (!p) return data.parentSku;
    return `${p.sku ?? '—'} — ${p.finalName || p.plant || '—'}`;
  }, [baseParents, data.parentSku]);

  const inputBase =
    'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';
  const inputError = 'border-red-300';
  const inputNormal = 'border-slate-300';

  const vendorRequired = productFlowType === 'growing_product';
  const parentRequired = productFlowType === 'growing_product';

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)
    );

    if (files.length > 0 && fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      files.forEach((file) => dataTransfer.items.add(file));
      fileInputRef.current.files = dataTransfer.files;

      const event = new Event('change', { bubbles: true });
      fileInputRef.current.dispatchEvent(event);
    }
  };

  const handleImageZoneClick = () => {
    fileInputRef.current?.click();
  };

  const openPreview = (images: string[], index: number) => {
    setPreviewImages(images);
    setPreviewIndex(index);
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
        <input
          type="text"
          value={data.plant}
          onChange={(e) => {
            onFieldChange('plant', e.target.value);
            onClearError('plant');
          }}
          className={`${inputBase} ${errors.plant ? inputError : inputNormal}`}
          placeholder="Product name"
        />
        {errors.plant && <p className="text-red-500 text-xs mt-1">{errors.plant}</p>}
      </div>

      <CustomSelect
        label={vendorRequired ? 'Primary vendor *' : 'Primary vendor (optional)'}
        value={data.vendorMasterId}
        onChange={(v) => {
          onFieldChange('vendorMasterId', v);
          onClearError('vendorMasterId');
        }}
        options={vendorOptions}
        placeholder="Select vendor"
      />
      {errors.vendorMasterId && <p className="text-red-500 text-xs mt-1">{errors.vendorMasterId}</p>}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Product code *</label>
        <input
          type="text"
          value={data.productCode}
          onChange={(e) => {
            onFieldChange('productCode', e.target.value);
            onClearError('productCode');
          }}
          className={`${inputBase} ${errors.productCode ? inputError : inputNormal}`}
          placeholder="Enter product code"
        />
        {errors.productCode && <p className="text-red-500 text-xs mt-1">{errors.productCode}</p>}
      </div>

      <div className="relative">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {parentRequired ? 'Parent SKU *' : 'Parent SKU (optional)'}
        </label>
        <button
          type="button"
          onClick={() => setParentOpen((o) => !o)}
          className={`w-full flex items-center gap-2 px-3 py-2 border rounded-lg text-left text-sm ${
            errors.parentSku ? inputError : inputNormal
          } ${inputBase}`}
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className={selectedParentLabel ? 'text-slate-900' : 'text-slate-400'}>
            {selectedParentLabel || 'Search and select a base parent…'}
          </span>
        </button>
        {errors.parentSku && <p className="text-red-500 text-xs mt-1">{errors.parentSku}</p>}

        {parentOpen && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-72 flex flex-col">
            <input
              type="text"
              value={parentQuery}
              onChange={(e) => setParentQuery(e.target.value)}
              placeholder="Filter by SKU or name…"
              className="m-2 px-3 py-2 border border-slate-200 rounded-lg text-sm"
              autoFocus
            />
            <ul className="overflow-y-auto flex-1 px-2 pb-2 space-y-0.5">
              {filteredParents.length === 0 ? (
                <li className="px-2 py-3 text-sm text-slate-500">No matches</li>
              ) : (
                filteredParents.map((p) => {
                  const sku = (p.sku ?? '').trim();
                  const label = `${sku} — ${p.finalName || p.plant || '—'}`;
                  return (
                    <li key={String(p._id)}>
                      <button
                        type="button"
                        className="w-full text-left px-2 py-2 rounded-md text-sm hover:bg-emerald-50 text-slate-800"
                        onClick={() => {
                          onFieldChange('parentSku', sku);
                          onClearError('parentSku');
                          setParentOpen(false);
                          setParentQuery('');
                        }}
                      >
                        {label}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-slate-700">Product images (optional)</label>
          {selectedFiles.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
              <Check className="w-3.5 h-3.5" />
              {selectedFiles.length} {selectedFiles.length === 1 ? 'image' : 'images'} added
            </span>
          )}
        </div>
        <div
          onClick={handleImageZoneClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50 scale-[1.02]'
              : 'border-slate-300 bg-gradient-to-br from-slate-50 to-white hover:border-emerald-400 hover:bg-emerald-50/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={onImageSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className={`relative ${isDragging ? 'scale-110' : ''} transition-transform duration-200`}>
              <div className="absolute inset-0 bg-emerald-100 rounded-full blur-xl opacity-50" />
              <div className="relative bg-gradient-to-br from-emerald-100 to-emerald-50 p-4 rounded-full">
                {isDragging ? (
                  <Upload className="w-10 h-10 text-emerald-600 animate-bounce" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-emerald-600" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-base font-medium text-slate-700">
                {isDragging ? (
                  <span className="text-emerald-600">Drop images here</span>
                ) : (
                  <>
                    <span className="text-emerald-600 hover:text-emerald-700 font-semibold">Click to upload</span>
                    <span className="text-slate-600"> or drag and drop</span>
                  </>
                )}
              </p>
              <p className="text-sm text-slate-500">PNG, JPG, WebP up to 5MB each</p>
            </div>
          </div>
        </div>
        {selectedFiles.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-slate-700 mb-3">
              Selected images ({selectedFiles.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {selectedFiles.map((file, index) => {
                const objectUrl = selectedObjectUrls[index];
                if (!objectUrl) return null;
                return (
                  <div
                    key={`${file.name}-${index}`}
                    className="group relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50 hover:border-emerald-400 transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- blob URL from File */}
                    <img
                      src={objectUrl}
                      alt={`Selected ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPreview([objectUrl], 0);
                        }}
                        className="absolute inset-0 flex items-center justify-center"
                        aria-label="View full size"
                      >
                        <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 hover:bg-white transition-colors">
                          <ZoomIn className="w-5 h-5 text-slate-700" />
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveSelectedFile(index);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-lg transition-colors"
                        aria-label="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-xs text-white font-medium truncate">{file.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <ImagePreviewModal
        isOpen={previewOpen}
        images={previewImages}
        currentIndex={previewIndex}
        onClose={() => setPreviewOpen(false)}
        onNavigate={setPreviewIndex}
      />
    </div>
  );
}
