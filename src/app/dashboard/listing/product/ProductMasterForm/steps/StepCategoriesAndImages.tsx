'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Search, ChevronDown, Check, Image as ImageIcon } from 'lucide-react';
import type { Category } from '@/models/category';

export interface StepCategoriesAndImagesProps {
  categories: Category[];
  selectedCategoryIds: string[];
  selectedImages: File[];
  uploadedImageUrls: string[];
  errors: Record<string, string>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onCategoryToggle: (categoryId: string) => void;
  onRemoveCategory: (categoryId: string) => void;
  onImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveSelectedImage: (index: number) => void;
  onRemoveUploadedImage: (index: number) => void;
  onClearError: (key: string) => void;
}

function getCategoryName(categories: Category[], categoryId: string): string {
  const cat = categories.find((c) => c._id === categoryId || c.categoryId === categoryId);
  return cat?.category || categoryId;
}

export function StepCategoriesAndImages({
  categories,
  selectedCategoryIds,
  selectedImages,
  uploadedImageUrls,
  errors,
  fileInputRef,
  onCategoryToggle,
  onRemoveCategory,
  onImageSelect,
  onRemoveSelectedImage,
  onRemoveUploadedImage,
  onClearError,
}: StepCategoriesAndImagesProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCategories = categories.filter(
    (cat) =>
      cat.category?.toLowerCase().includes(search.toLowerCase()) ||
      cat.alias?.toLowerCase().includes(search.toLowerCase())
  );

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
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-lg bg-white text-left transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.categories ? 'border-red-300' : 'border-slate-300'
            } ${dropdownOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
          >
            <span className={selectedCategoryIds.length > 0 ? 'text-slate-900' : 'text-slate-500'}>
              {selectedCategoryIds.length === 0
                ? 'Select categories...'
                : `${selectedCategoryIds.length} ${selectedCategoryIds.length > 1 ? 'categories' : 'category'} selected`}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-2 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              <div className="p-2 border-b border-slate-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search categories..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto">
                {filteredCategories.length === 0 ? (
                  <p className="text-slate-500 text-sm p-3 text-center">No categories found</p>
                ) : (
                  filteredCategories.map((category) => {
                    const categoryIdStr = String(category._id);
                    const isSelected = selectedCategoryIds.includes(categoryIdStr);
                    return (
                      <button
                        key={categoryIdStr}
                        type="button"
                        onClick={() => {
                          onCategoryToggle(categoryIdStr);
                          onClearError('categories');
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                          isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{category.category}</span>
                          {category.typeOfCategory && (
                            <span className="text-xs text-slate-400">{category.typeOfCategory}</span>
                          )}
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        {errors.categories && <p className="text-red-500 text-xs mt-1">{errors.categories}</p>}
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Product Images</label>
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-emerald-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={onImageSelect}
            className="hidden"
          />
          <ImageIcon className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-2 text-sm text-slate-600">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="font-medium text-emerald-600 hover:text-emerald-500"
            >
              Click to upload
            </button>
            {' '}or drag and drop
          </p>
          <p className="text-xs text-slate-500">PNG, JPG, WebP up to 5MB each</p>
        </div>
        {selectedImages.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Selected Images</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {selectedImages.map((file, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Selected ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveSelectedImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <p className="text-xs text-slate-500 mt-1 truncate">{file.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {uploadedImageUrls.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Uploaded Images</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {uploadedImageUrls.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`Uploaded ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveUploadedImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
