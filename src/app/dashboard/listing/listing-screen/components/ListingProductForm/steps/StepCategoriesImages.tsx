'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Tag, Sparkles } from 'lucide-react';
import type { ListingFormData } from '../types';
import type { ListingSection } from '@/models/listingProduct';
import type { ParentMaster } from '@/models/parentMaster';
import { ImageCollectionDropdown } from '../../ImageCollectionDropdown';

export interface StepCategoriesImagesProps {
  formData: ListingFormData;
  updateFormData: (updates: Partial<ListingFormData>) => void;
  validationErrors: Record<string, string>;
  selectedParents: ParentMaster[];
  section: ListingSection;
}

export function StepCategoriesImages({
  formData,
  updateFormData,
  validationErrors,
  selectedParents,
}: StepCategoriesImagesProps) {
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [autoCategories, setAutoCategories] = useState<string[]>([]);
  const [loadingAutoCategories, setLoadingAutoCategories] = useState(false);
  const [availableCollections, setAvailableCollections] = useState<{ _id: string; name: string; alias?: string }[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [newCollectionId, setNewCollectionId] = useState('');

  // Fetch available categories
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const response = await fetch('/api/categories?limit=200');
        const result = await response.json();
        if (result.success) {
          setAvailableCategories(result.data || []);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Fetch available collections
  useEffect(() => {
    const fetchCollections = async () => {
      setLoadingCollections(true);
      try {
        const response = await fetch('/api/collection-master?limit=200');
        const result = await response.json();
        if (result.success) {
          const items = (result.data || []).map((c: any) => ({
            _id: String(c._id),
            name: c.name || c.alias || String(c._id),
            alias: c.alias,
          }));
          setAvailableCollections(items);
        }
      } catch (error) {
        console.error('Error fetching collections:', error);
      } finally {
        setLoadingCollections(false);
      }
    };

    fetchCollections();
  }, []);

  // Get auto categories when product details change
  useEffect(() => {
    const getAutoCategories = async () => {
      if (!formData.plant.trim()) return;

      setLoadingAutoCategories(true);
      try {
        const productData = {
          plant: formData.plant,
          variety: formData.variety || undefined,
          colour: formData.colour || undefined,
          height: formData.height ? Number(formData.height) : undefined,
          size: formData.size ? Number(formData.size) : undefined,
          type: formData.type || undefined,
        };

        // This would call a category rules evaluation API
        // For now, we'll simulate it
        const response = await fetch('/api/categories/evaluate-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setAutoCategories(result.categories || []);
          }
        }
      } catch (error) {
        console.error('Error getting auto categories:', error);
        setAutoCategories([]);
      } finally {
        setLoadingAutoCategories(false);
      }
    };

    getAutoCategories();
  }, [formData.plant, formData.variety, formData.colour, formData.height, formData.size, formData.type]);

  const handleCategoryToggle = (categoryAlias: string) => {
    const currentCategories = formData.categories;
    if (currentCategories.includes(categoryAlias)) {
      updateFormData({
        categories: currentCategories.filter(cat => cat !== categoryAlias)
      });
    } else {
      updateFormData({
        categories: [...currentCategories, categoryAlias]
      });
    }
  };

  const handleAddCustomCategory = () => {
    if (newCategory.trim() && !formData.categories.includes(newCategory.trim())) {
      updateFormData({
        categories: [...formData.categories, newCategory.trim()]
      });
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (categoryAlias: string) => {
    updateFormData({
      categories: formData.categories.filter(cat => cat !== categoryAlias)
    });
  };

  const handleApplyAutoCategories = () => {
    const combinedCategories = [...new Set([...formData.categories, ...autoCategories])];
    updateFormData({ categories: combinedCategories });
  };

  const collectionIdToName = (id: string) =>
    availableCollections.find(c => String(c._id) === String(id))?.name ?? id;

  const handleAddCollection = () => {
    if (newCollectionId.trim() && !formData.collectionIds.includes(newCollectionId.trim())) {
      updateFormData({
        collectionIds: [...formData.collectionIds, newCollectionId.trim()],
      });
      setNewCollectionId('');
    }
  };

  const handleRemoveCollection = (id: string) => {
    updateFormData({
      collectionIds: formData.collectionIds.filter(cid => cid !== id),
    });
  };

  const handleCollectionToggle = (id: string) => {
    const idStr = String(id);
    if (formData.collectionIds.includes(idStr)) {
      updateFormData({ collectionIds: formData.collectionIds.filter(cid => cid !== idStr) });
    } else {
      updateFormData({ collectionIds: [...formData.collectionIds, idStr] });
    }
  };

  const handleImageSelectionChange = (imageUrls: string[]) => {
    updateFormData({ images: imageUrls });
  };

  const parentCategories = selectedParents.flatMap(parent => parent.categories || []);
  const parentCollectionIds = selectedParents.flatMap(parent => (parent.collectionIds || []).map(id => String(id)));
  const uniqueParentCollectionIds = [...new Set(parentCollectionIds)];
  const uniqueParentCategories = [...new Set(parentCategories)];

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-base font-medium text-gray-900 mb-2">
          Categories & Images
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Select categories and images for your listing product. Categories are auto-populated from parent products and rules.
        </p>
      </div>

      {/* Categories Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h5 className="text-sm font-medium text-gray-700">
            Product Categories <span className="text-red-500">*</span>
          </h5>
          {autoCategories.length > 0 && (
            <button
              type="button"
              onClick={handleApplyAutoCategories}
              disabled={loadingAutoCategories}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full hover:bg-emerald-100 disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3" />
              Apply Auto Categories ({autoCategories.length})
            </button>
          )}
        </div>

        {/* Selected Categories */}
        {formData.categories.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">
              Selected Categories ({formData.categories.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.categories.map((category) => (
                <div
                  key={category}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full"
                >
                  <Tag className="h-3 w-3" />
                  {category}
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(category)}
                    className="text-emerald-600 hover:text-emerald-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parent Categories */}
        {uniqueParentCategories.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">
              From Parent Products
            </div>
            <div className="flex flex-wrap gap-2">
              {uniqueParentCategories.map((category) => {
                const isSelected = formData.categories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategoryToggle(category)}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border transition-colors ${
                      isSelected
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Tag className="h-3 w-3" />
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Auto Categories */}
        {autoCategories.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2">
              <Sparkles className="h-3 w-3" />
              Auto-suggested Categories (based on rules)
              {loadingAutoCategories && <span className="text-emerald-600">Loading...</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {autoCategories.map((category) => {
                const isSelected = formData.categories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategoryToggle(category)}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border transition-colors ${
                      isSelected
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    <Sparkles className="h-3 w-3" />
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Categories */}
        {!loadingCategories && availableCategories.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">
              All Available Categories
            </div>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3">
              <div className="flex flex-wrap gap-1">
                {availableCategories
                  .filter(cat => !formData.categories.includes(cat.alias))
                  .slice(0, 50) // Limit display
                  .map((category) => (
                    <button
                      key={category.alias}
                      type="button"
                      onClick={() => handleCategoryToggle(category.alias)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded hover:bg-gray-100"
                    >
                      <Tag className="h-3 w-3" />
                      {category.category}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Add Custom Category - dropdown of all categories from database */}
        <div className="flex gap-2 items-center">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
          >
            <option value="">Select category to add...</option>
            {availableCategories
              .filter(cat => !formData.categories.includes(cat.alias))
              .map((category) => (
                <option key={category.alias} value={category.alias}>
                  {category.category}
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={handleAddCustomCategory}
            disabled={!newCategory.trim()}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        {validationErrors.categories && (
          <p className="text-sm text-red-600">{validationErrors.categories}</p>
        )}
      </div>

      {/* Collections Section - same pattern as categories */}
      <div className="space-y-4">
        <h5 className="text-sm font-medium text-gray-700">
          Product Collections
        </h5>

        {/* Selected Collections */}
        {formData.collectionIds.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">
              Selected Collections ({formData.collectionIds.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.collectionIds.map((id) => (
                <div
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-800 text-xs rounded-full"
                >
                  {collectionIdToName(id)}
                  <button
                    type="button"
                    onClick={() => handleRemoveCollection(id)}
                    className="text-slate-600 hover:text-slate-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* From Parent Collections */}
        {uniqueParentCollectionIds.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">
              From Parent Products
            </div>
            <div className="flex flex-wrap gap-2">
              {uniqueParentCollectionIds.map((id) => {
                const isSelected = formData.collectionIds.includes(String(id));
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleCollectionToggle(id)}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border transition-colors ${
                      isSelected
                        ? 'bg-slate-100 text-slate-800 border-slate-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {collectionIdToName(String(id))}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Collection - dropdown of all collections from database */}
        {!loadingCollections && availableCollections.length > 0 && (
          <div className="flex gap-2 items-center">
            <select
              value={newCollectionId}
              onChange={(e) => setNewCollectionId(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            >
              <option value="">Select collection to add...</option>
              {availableCollections
                .filter(c => !formData.collectionIds.includes(String(c._id)))
                .map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={handleAddCollection}
              disabled={!newCollectionId.trim()}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        )}
      </div>

      {/* Images Section */}
      <div className="space-y-4">
        <h5 className="text-sm font-medium text-gray-700">
          Product Images <span className="text-red-500">*</span>
        </h5>
        <p className="text-xs text-gray-500">
          Select images from collections: choose from your uploaded image collections. When listing a child, options are filtered by the parent&apos;s collections.
        </p>

        <ImageCollectionDropdown
          selectedImages={formData.images}
          onSelectionChange={handleImageSelectionChange}
          filterByCollectionIds={formData.collectionIds}
          maxSelections={10}
        />

        {validationErrors.images && (
          <p className="text-sm text-red-600">{validationErrors.images}</p>
        )}
      </div>

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-800 mb-2">Categories & Images Info</h5>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Categories are inherited from parent products and can be supplemented</li>
          <li>• Auto-suggested categories are based on product attributes and rules</li>
          <li>• Collections work like categories: select from parent or add from the full list</li>
          <li>• Select images from collections: choose from your uploaded image collections (filtered by parent when listing a child)</li>
          <li>• At least one category and one image are required</li>
        </ul>
      </div>
    </div>
  );
}