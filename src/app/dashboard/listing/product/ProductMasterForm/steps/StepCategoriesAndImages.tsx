'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Search, ChevronDown, Check, Image as ImageIcon, Upload, ZoomIn, FolderTree, Sparkles } from 'lucide-react';
import type { Category } from '@/models/category';
import type { CollectionMaster } from '@/models/collectionMaster';
import { ImagePreviewModal } from '../../../shared';
import { CategoryHierarchyPickerModal } from './CategoryHierarchyPickerModal';

/** Snapshot of parent product fields used by `/api/categories/evaluate-rules` (`potType` is sent as `type`). */
export interface CategoryRuleEvalFields {
  plant: string;
  variety: string;
  colour: string;
  height: number | '';
  size: number | '';
  potType: string;
}

export interface StepCategoriesAndImagesProps {
  categories: Category[];
  collections: CollectionMaster[];
  selectedCategoryIds: string[];
  selectedCollectionIds: string[];
  selectedImages: File[];
  uploadedImageUrls: string[];
  errors: Record<string, string>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onCategoryToggle: (categoryId: string) => void;
  onRemoveCategory: (categoryId: string) => void;
  onCollectionToggle: (collectionId: string) => void;
  onRemoveCollection: (collectionId: string) => void;
  onImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveSelectedImage: (index: number) => void;
  onRemoveUploadedImage: (index: number) => void;
  onClearError: (key: string) => void;
  /** When set, loads rule-based category suggestions (debounced). Omit for flows without rules. */
  categoryRuleEval?: CategoryRuleEvalFields | null;
  /** Single state update when applying all rule suggestions; falls back to repeated toggle if omitted. */
  onMergeRuleCategoryAliases?: (aliases: string[]) => void;
}

function getCategoryName(categories: Category[], categoryAlias: string): string {
  const cat = categories.find((c) => c.alias === categoryAlias);
  return cat?.category || categoryAlias;
}

export function StepCategoriesAndImages({
  categories,
  collections,
  selectedCategoryIds,
  selectedCollectionIds,
  selectedImages,
  uploadedImageUrls,
  errors,
  fileInputRef,
  onCategoryToggle,
  onRemoveCategory,
  onCollectionToggle,
  onRemoveCollection,
  onImageSelect,
  onRemoveSelectedImage,
  onRemoveUploadedImage,
  onClearError,
  categoryRuleEval,
  onMergeRuleCategoryAliases,
}: StepCategoriesAndImagesProps) {
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [collectionDropdownOpen, setCollectionDropdownOpen] = useState(false);
  const [collectionSearch, setCollectionSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [autoCategories, setAutoCategories] = useState<string[]>([]);
  const [loadingAutoCategories, setLoadingAutoCategories] = useState(false);
  const collectionDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!categoryRuleEval) {
      setAutoCategories([]);
      setLoadingAutoCategories(false);
      return;
    }
    const plant = categoryRuleEval.plant.trim();
    if (!plant) {
      setAutoCategories([]);
      setLoadingAutoCategories(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingAutoCategories(true);
      try {
        const { variety, colour, height, size, potType } = categoryRuleEval;
        const productData: Record<string, unknown> = {
          plant,
          categories: selectedCategoryIds,
        };
        if (variety.trim()) productData.variety = variety.trim();
        if (colour.trim()) productData.colour = colour.trim();
        if (height !== '' && Number.isFinite(Number(height))) productData.height = Number(height);
        if (size !== '' && Number.isFinite(Number(size))) productData.size = Number(size);
        if (potType.trim()) productData.type = potType.trim();

        const response = await fetch('/api/categories/evaluate-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
          signal: controller.signal,
        });
        if (cancelled) return;
        if (!response.ok) {
          setAutoCategories([]);
          return;
        }
        const result = await response.json();
        if (cancelled) return;
        setAutoCategories(
          result.success && Array.isArray(result.categories) ? result.categories : []
        );
      } catch (e) {
        if ((e as Error).name === 'AbortError' || cancelled) return;
        setAutoCategories([]);
      } finally {
        if (!cancelled) setLoadingAutoCategories(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [
    categoryRuleEval?.plant,
    categoryRuleEval?.variety,
    categoryRuleEval?.colour,
    categoryRuleEval?.height,
    categoryRuleEval?.size,
    categoryRuleEval?.potType,
    selectedCategoryIds.join(','),
  ]);

  const notYetSelectedRuleCategories = autoCategories.filter((a) => !selectedCategoryIds.includes(a));

  const handleApplyAutoCategories = () => {
    if (notYetSelectedRuleCategories.length === 0) return;
    if (onMergeRuleCategoryAliases) {
      onMergeRuleCategoryAliases(notYetSelectedRuleCategories);
    } else {
      notYetSelectedRuleCategories.forEach((alias) => onCategoryToggle(alias));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (collectionDropdownRef.current && !collectionDropdownRef.current.contains(event.target as Node)) {
        setCollectionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCollections = collections.filter(
    (col) =>
      col.name?.toLowerCase().includes(collectionSearch.toLowerCase()) ||
      col.alias?.toLowerCase().includes(collectionSearch.toLowerCase())
  );

  function getCollectionName(collectionId: string): string {
    const col = collections.find((c) => String(c._id) === collectionId);
    return col?.name ?? collectionId;
  }

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

  const handleContainerClick = () => {
    fileInputRef.current?.click();
  };

  const openPreview = (images: string[], index: number) => {
    setPreviewImages(images);
    setPreviewIndex(index);
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Categories */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Categories *</label>
        {selectedCategoryIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedCategoryIds.map((categoryId) => (
              <span
                key={categoryId}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-sm rounded-full"
              >
                {getCategoryName(categories, categoryId)}
                <button
                  type="button"
                  onClick={() => onRemoveCategory(categoryId)}
                  className="hover:bg-emerald-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setCategoryModalOpen(true)}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 border rounded-lg bg-white text-left transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.categories ? 'border-red-300' : 'border-slate-300'
          }`}
        >
          <span className="flex items-center gap-2 min-w-0">
            <FolderTree className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
            <span className={selectedCategoryIds.length > 0 ? 'text-slate-900' : 'text-slate-500 truncate'}>
              {selectedCategoryIds.length === 0
                ? 'Browse categories…'
                : `${selectedCategoryIds.length} ${selectedCategoryIds.length > 1 ? 'categories' : 'category'} selected`}
            </span>
          </span>
          <span className="text-xs font-medium text-blue-600 shrink-0">Open</span>
        </button>
        <CategoryHierarchyPickerModal
          isOpen={categoryModalOpen}
          onClose={() => setCategoryModalOpen(false)}
          categories={categories}
          selectedCategoryIds={selectedCategoryIds}
          onCategoryToggle={onCategoryToggle}
          onClearError={onClearError}
        />
        {errors.categories && <p className="text-red-500 text-xs mt-1">{errors.categories}</p>}

        {categoryRuleEval && !categoryRuleEval.plant.trim() && (
          <p className="text-xs text-slate-500 mt-2">
            Add a plant name on the Product info step to preview categories from your rules.
          </p>
        )}

        {categoryRuleEval &&
          categoryRuleEval.plant.trim() &&
          (loadingAutoCategories || autoCategories.length > 0) && (
            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
                  Auto-suggested categories (rules)
                  {loadingAutoCategories && <span className="text-blue-600">Loading…</span>}
                </div>
                {!loadingAutoCategories && notYetSelectedRuleCategories.length > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyAutoCategories}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full hover:bg-emerald-100"
                  >
                    <Sparkles className="h-3 w-3" />
                    Add all ({notYetSelectedRuleCategories.length})
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {autoCategories.map((alias) => {
                  const isSelected = selectedCategoryIds.includes(alias);
                  return (
                    <button
                      key={alias}
                      type="button"
                      onClick={() => onCategoryToggle(alias)}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border transition-colors ${
                        isSelected
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                      }`}
                    >
                      <Sparkles className="h-3 w-3 shrink-0 opacity-70" />
                      {getCategoryName(categories, alias)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
      </div>

      {/* Collections */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Collections</label>
        {selectedCollectionIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedCollectionIds.map((collectionId) => (
              <span
                key={collectionId}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-sm rounded-full"
              >
                {getCollectionName(collectionId)}
                <button
                  type="button"
                  onClick={() => onRemoveCollection(collectionId)}
                  className="hover:bg-emerald-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="relative" ref={collectionDropdownRef}>
          <button
            type="button"
            onClick={() => setCollectionDropdownOpen(!collectionDropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-left transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <span className={selectedCollectionIds.length > 0 ? 'text-slate-900' : 'text-slate-500'}>
              {selectedCollectionIds.length === 0
                ? 'Select collections (optional)...'
                : `${selectedCollectionIds.length} ${selectedCollectionIds.length === 1 ? 'collection' : 'collections'} selected`}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-2 ${collectionDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {collectionDropdownOpen && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              <div className="p-2 border-b border-slate-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={collectionSearch}
                    onChange={(e) => setCollectionSearch(e.target.value)}
                    placeholder="Search collections..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto">
                {filteredCollections.length === 0 ? (
                  <p className="text-slate-500 text-sm p-3 text-center">No collections found</p>
                ) : (
                  filteredCollections.map((col) => {
                    const colId = String(col._id);
                    const isSelected = selectedCollectionIds.includes(colId);
                    return (
                      <button
                        key={colId}
                        type="button"
                        onClick={() => {
                          onCollectionToggle(colId);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                          isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-sm font-medium">{col.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Images */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-slate-700">Product Images</label>
          {(selectedImages.length > 0 || uploadedImageUrls.length > 0) && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
              <Check className="w-3.5 h-3.5" />
              {selectedImages.length + uploadedImageUrls.length} {selectedImages.length + uploadedImageUrls.length === 1 ? 'image' : 'images'} added
            </span>
          )}
        </div>
        <div
          onClick={handleContainerClick}
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
              <div className="absolute inset-0 bg-emerald-100 rounded-full blur-xl opacity-50"></div>
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
                    <span className="text-emerald-600 hover:text-emerald-700 font-semibold">
                      Click to upload
                    </span>
                    <span className="text-slate-600"> or drag and drop</span>
                  </>
                )}
              </p>
              <p className="text-sm text-slate-500">PNG, JPG, WebP up to 5MB each</p>
            </div>
          </div>
        </div>
        {selectedImages.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Selected Images ({selectedImages.length})</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {selectedImages.map((file, index) => {
                const objectUrl = URL.createObjectURL(file);
                return (
                  <div
                    key={index}
                    className="group relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50 hover:border-emerald-400 transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- blob URL from File, not static asset */}
                    <img
                      src={objectUrl}
                      alt={`Selected ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openPreview([objectUrl], 0)}
                        className="absolute inset-0 flex items-center justify-center"
                        aria-label="View full size"
                      >
                        <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 hover:bg-white transition-colors">
                          <ZoomIn className="w-5 h-5 text-slate-700" />
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveSelectedImage(index)}
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
        {uploadedImageUrls.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Uploaded Images ({uploadedImageUrls.length})</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {uploadedImageUrls.map((url, index) => (
                <div
                  key={index}
                  className="group relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50 hover:border-emerald-400 transition-all"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- dynamic preview URL */}
                  <img
                    src={url}
                    alt={`Uploaded ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => openPreview(uploadedImageUrls, index)}
                      className="absolute inset-0 flex items-center justify-center"
                      aria-label="View full size"
                    >
                      <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 hover:bg-white transition-colors">
                        <ZoomIn className="w-5 h-5 text-slate-700" />
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveUploadedImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-lg transition-colors"
                      aria-label="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
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
