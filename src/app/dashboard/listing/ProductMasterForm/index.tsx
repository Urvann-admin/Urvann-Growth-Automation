'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, X, Plus, Trash2, Save, AlertCircle, CheckCircle, Image as ImageIcon, ChevronDown, Search } from 'lucide-react';
import type { ParentMaster } from '@/models/parentMaster';
import type { Category } from '@/models/category';
import type { SellerMaster } from '@/models/sellerMaster';

interface ProductFormData {
  plant: string;
  otherNames: string;
  variety: string;
  colour: string;
  height: number | '';
  mossStick: string;
  size: number | '';
  type: string;
  seller: string;
  categories: string[];
  price: number | '';
  publish: string;
  inventoryQuantity: number | '';
  images: string[];
}

const initialFormData: ProductFormData = {
  plant: '',
  otherNames: '',
  variety: '',
  colour: '',
  height: '',
  mossStick: '',
  size: '',
  type: '',
  seller: '',
  categories: [],
  price: '',
  publish: 'draft',
  inventoryQuantity: '',
  images: [],
};

const MOSS_STICK_OPTIONS = [
  { value: '', label: 'Select Moss Stick' },
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
  { value: 'Optional', label: 'Optional' },
];

const PLANT_TYPES = [
  { value: '', label: 'Select Type' },
  { value: 'Black Nursery Pot', label: 'Black Nursery Pot' },
  { value: 'Black Square Nursery Pot', label: 'Black Square Nursery Pot' },
  { value: 'Black Super Nursery Pot', label: 'Black Super Nursery Pot' },
  { value: 'Glass Bowl', label: 'Glass Bowl' },
  { value: 'Hanging Basket', label: 'Hanging Basket' },
  { value: 'Hanging Pot', label: 'Hanging Pot' },
  { value: 'Nursery Bag', label: 'Nursery Bag' },
  { value: 'Nursery Pot', label: 'Nursery Pot' },
  { value: 'White Nursery Pot', label: 'White Nursery Pot' },
];

export function ProductMasterForm() {
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sellers, setSellers] = useState<SellerMaster[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch categories on mount from categoryList collection
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) {
          setCategories(json.data);
        }
      })
      .catch((error) => console.error('Error fetching categories:', error));
  }, []);

  // Fetch sellers on mount from sellerMaster collection
  useEffect(() => {
    fetch('/api/sellers')
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) {
          setSellers(json.data);
        }
      })
      .catch((error) => console.error('Error fetching sellers:', error));
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate final name: plant + other names + variety + colour + 'in' + size + 'inch' + Type
  const finalName = (() => {
    const parts: string[] = [];
    if (formData.plant?.trim()) parts.push(formData.plant.trim());
    if (formData.otherNames?.trim()) parts.push(formData.otherNames.trim());
    if (formData.variety?.trim()) parts.push(formData.variety.trim());
    if (formData.colour?.trim()) parts.push(formData.colour.trim());
    if (formData.size !== '' && formData.size !== undefined) {
      parts.push('in', String(formData.size), 'inch');
    }
    if (formData.type?.trim()) parts.push(formData.type.trim());
    return parts.join(' ');
  })();

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId]
    }));
    // Clear error when user selects a category
    if (errors.categories) {
      setErrors(prev => ({ ...prev, categories: '' }));
    }
  };

  const handleRemoveCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter(id => id !== categoryId)
    }));
  };

  // Get category name by ID
  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c._id === categoryId || c.categoryId === categoryId);
    return cat?.category || categoryId;
  };

  // Filter categories based on search
  const filteredCategories = categories.filter(cat => 
    cat.category?.toLowerCase().includes(categorySearch.toLowerCase()) ||
    cat.alias?.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      setMessage({
        type: 'error',
        text: `Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}. Only JPEG, PNG, and WebP are allowed.`
      });
      return;
    }

    // Validate file sizes (max 5MB per file)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      setMessage({
        type: 'error',
        text: `Files too large: ${oversizedFiles.map(f => f.name).join(', ')}. Maximum size is 5MB per file.`
      });
      return;
    }

    setSelectedImages(prev => [...prev, ...files]);
    setMessage(null);
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeUploadedImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (selectedImages.length === 0) return [];

    setUploading(true);
    try {
      const formData = new FormData();
      selectedImages.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to upload images');
      }

      setSelectedImages([]); // Clear selected images after successful upload
      return result.urls || [];
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.plant.trim()) {
      newErrors.plant = 'Plant name is required';
    }

    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (!formData.inventoryQuantity || formData.inventoryQuantity < 0) {
      newErrors.inventoryQuantity = 'Inventory quantity must be 0 or greater';
    }

    if (formData.categories.length === 0) {
      newErrors.categories = 'Select at least one category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Please fix the errors above' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      // Upload images first
      let uploadedImageUrls: string[] = [];
      if (selectedImages.length > 0) {
        uploadedImageUrls = await uploadImages();
      }

      // Combine existing and new image URLs
      const allImageUrls = [...formData.images, ...uploadedImageUrls];

      // Prepare data for submission
      const submitData: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'> = {
        plant: formData.plant.trim(),
        otherNames: formData.otherNames.trim() || undefined,
        variety: formData.variety.trim() || undefined,
        colour: formData.colour.trim() || undefined,
        height: typeof formData.height === 'number' ? formData.height : undefined,
        mossStick: formData.mossStick || undefined,
        size: typeof formData.size === 'number' ? formData.size : undefined,
        type: formData.type || undefined,
        seller: formData.seller || undefined,
        finalName: finalName || undefined,
        categories: formData.categories,
        price: Number(formData.price),
        publish: formData.publish,
        inventoryQuantity: Number(formData.inventoryQuantity),
        images: allImageUrls,
      };

      const response = await fetch('/api/parent-master', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: result.warning 
            ? `Product created with warning: ${result.warning}`
            : 'Product created successfully!' 
        });
        
        // Reset form
        setFormData(initialFormData);
        setSelectedImages([]);
        setCategorySearch('');
        setCategoryDropdownOpen(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to create product' });
      }
    } catch (error) {
      console.error('Submit error:', error);
      setMessage({ type: 'error', text: 'Failed to create product. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Create New Product</h2>
          <p className="text-sm text-slate-600 mt-1">
            Add a new product to the catalog. All fields marked with * are required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Plant Name *
              </label>
              <input
                type="text"
                value={formData.plant}
                onChange={(e) => handleInputChange('plant', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errors.plant ? 'border-red-300' : 'border-slate-300'
                }`}
                placeholder="Enter plant name"
              />
              {errors.plant && (
                <p className="text-red-500 text-xs mt-1">{errors.plant}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Other Names
              </label>
              <input
                type="text"
                value={formData.otherNames}
                onChange={(e) => handleInputChange('otherNames', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Alternative names"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Variety
              </label>
              <input
                type="text"
                value={formData.variety}
                onChange={(e) => handleInputChange('variety', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Plant variety"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Colour
              </label>
              <input
                type="text"
                value={formData.colour}
                onChange={(e) => handleInputChange('colour', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Plant colour"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Height (feet)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.height}
                onChange={(e) => handleInputChange('height', e.target.value ? parseFloat(e.target.value) : '')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Height in feet"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Moss Stick
              </label>
              <select
                value={formData.mossStick}
                onChange={(e) => handleInputChange('mossStick', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {MOSS_STICK_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Size (inches)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.size}
                onChange={(e) => handleInputChange('size', e.target.value ? parseFloat(e.target.value) : '')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Size in inches"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {PLANT_TYPES.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Seller Name
              </label>
              <select
                value={formData.seller}
                onChange={(e) => handleInputChange('seller', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Select Seller</option>
                {sellers.map((seller) => (
                  <option key={seller._id?.toString()} value={seller.seller_id}>
                    {seller.seller_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Final Name - auto-generated */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Final Name
            </label>
            <input
              type="text"
              value={finalName}
              readOnly
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
              placeholder="Auto-generated from plant name, other names, variety, colour, size and type"
            />
            <p className="text-xs text-slate-500 mt-1">
              Generated from: plant + other names + variety + colour + in + size + inch + type
            </p>
          </div>

          {/* Pricing and Inventory */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Price *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value ? parseFloat(e.target.value) : '')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errors.price ? 'border-red-300' : 'border-slate-300'
                }`}
                placeholder="0.00"
              />
              {errors.price && (
                <p className="text-red-500 text-xs mt-1">{errors.price}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Inventory Quantity *
              </label>
              <input
                type="number"
                min="0"
                value={formData.inventoryQuantity}
                onChange={(e) => handleInputChange('inventoryQuantity', e.target.value ? parseInt(e.target.value) : '')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errors.inventoryQuantity ? 'border-red-300' : 'border-slate-300'
                }`}
                placeholder="0"
              />
              {errors.inventoryQuantity && (
                <p className="text-red-500 text-xs mt-1">{errors.inventoryQuantity}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.publish === 'published'}
                  onChange={(e) => handleInputChange('publish', e.target.checked ? 'published' : 'draft')}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-slate-700">Published</span>
              </label>
              <p className="text-xs text-slate-500">Tick to publish, leave unticked for draft</p>
            </div>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Categories *
            </label>
            
            {/* Selected Categories Tags */}
            {formData.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.categories.map((categoryId) => (
                  <span
                    key={categoryId}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-sm rounded-full"
                  >
                    {getCategoryName(categoryId)}
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(categoryId)}
                      className="hover:bg-emerald-200 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Dropdown */}
            <div className="relative" ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errors.categories ? 'border-red-300' : 'border-slate-300'
                }`}
              >
                <span className="text-slate-500">
                  {formData.categories.length === 0 
                    ? 'Select categories...' 
                    : `${formData.categories.length} ${formData.categories.length > 1 ? 'categories' : 'category'} selected`}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {categoryDropdownOpen && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
                  {/* Search Input */}
                  <div className="p-2 border-b border-slate-200">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        placeholder="Search categories..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Category List */}
                  <div className="max-h-48 overflow-y-auto">
                    {filteredCategories.length === 0 ? (
                      <p className="text-slate-500 text-sm p-3 text-center">No categories found</p>
                    ) : (
                      filteredCategories.map((category) => {
                        const categoryIdStr = String(category._id);
                        const isSelected = formData.categories.includes(categoryIdStr);
                        return (
                          <button
                            key={categoryIdStr}
                            type="button"
                            onClick={() => handleCategoryToggle(categoryIdStr)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors ${
                              isSelected ? 'bg-emerald-50' : ''
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-700">{category.category}</span>
                              {category.typeOfCategory && (
                                <span className="text-xs text-slate-400">{category.typeOfCategory}</span>
                              )}
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
            {errors.categories && (
              <p className="text-red-500 text-xs mt-1">{errors.categories}</p>
            )}
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Product Images
            </label>
            
            {/* Upload Area */}
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-emerald-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageSelect}
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

            {/* Selected Images Preview */}
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
                        onClick={() => removeSelectedImage(index)}
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

            {/* Uploaded Images */}
            {formData.images.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Uploaded Images</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {formData.images.map((url, index) => (
                    <div key={index} className="relative">
                      <img
                        src={url}
                        alt={`Uploaded ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeUploadedImage(index)}
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

          {/* Message */}
          {message && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || uploading}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting || uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  {uploading ? 'Uploading...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Create Product
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}