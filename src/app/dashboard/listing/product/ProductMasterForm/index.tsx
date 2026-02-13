'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check, Save } from 'lucide-react';
import type { ParentMaster } from '@/models/parentMaster';
import type { Category } from '@/models/category';
import type { SellerMaster } from '@/models/sellerMaster';
import { Notification } from '@/components/ui/Notification';
import { HUB_MAPPINGS } from '@/shared/constants/hubs';
import {
  STEPS,
  initialFormData,
  type StepId,
  type ProductFormData,
} from './types';
import { StepBasics, StepPricing, StepCategoriesAndImages, StepReview } from './steps';

function validateStep(stepId: StepId, data: ProductFormData): Record<string, string> {
  const err: Record<string, string> = {};
  switch (stepId) {
    case 'basics':
      if (!data.plant.trim()) err.plant = 'Plant name is required';
      break;
    case 'pricing':
      if (!data.price || data.price <= 0) err.price = 'Price must be greater than 0';
      if (data.inventoryQuantity === '' || data.inventoryQuantity < 0) {
        err.inventoryQuantity = 'Inventory quantity must be 0 or greater';
      }
      if (
        typeof data.compare_price === 'number' &&
        typeof data.price === 'number' &&
        data.compare_price > 0 &&
        data.compare_price < data.price
      ) {
        err.compare_price = 'Compare price must be greater than or equal to Price (original price ≥ sale price)';
      }
      break;
    case 'categories-images':
      if (data.categories.length === 0) err.categories = 'Select at least one category';
      break;
    case 'review':
      break;
  }
  return err;
}

function computeFinalName(data: ProductFormData): string {
  const parts: string[] = [];
  if (data.plant?.trim()) parts.push(data.plant.trim());
  if (data.otherNames?.trim()) parts.push(data.otherNames.trim());
  if (data.variety?.trim()) parts.push(data.variety.trim());
  if (data.colour?.trim()) parts.push(data.colour.trim());
  if (data.size !== '' && data.size !== undefined) {
    parts.push('in', String(data.size), 'inch');
  }
  if (data.type?.trim()) parts.push(data.type.trim());
  return parts.join(' ');
}

export function ProductMasterForm() {
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sellers, setSellers] = useState<SellerMaster[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createButtonClickedRef = useRef(false);

  const currentStep = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const finalName = useMemo(() => computeFinalName(formData), [formData]);

  const fetchCategories = useCallback(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) setCategories(json.data);
      })
      .catch((e) => console.error('Error fetching categories:', e));
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetch('/api/sellers')
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) setSellers(json.data);
      })
      .catch((e) => console.error('Error fetching sellers:', e));
  }, []);

  const setField = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const clearError = (key: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleFieldChange = (field: string, value: string | number | '' | boolean) => {
    setField(field as keyof ProductFormData, value as ProductFormData[keyof ProductFormData]);
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((id) => id !== categoryId)
        : [...prev.categories, categoryId],
    }));
    clearError('categories');
  };

  const handleRemoveCategory = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.filter((id) => id !== categoryId),
    }));
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter((f) => !allowedTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      setMessage({
        type: 'error',
        text: `Invalid file types: ${invalidFiles.map((f) => f.name).join(', ')}. Only JPEG, PNG, and WebP allowed.`,
      });
      return;
    }
    const maxSize = 5 * 1024 * 1024;
    const oversized = files.filter((f) => f.size > maxSize);
    if (oversized.length > 0) {
      setMessage({
        type: 'error',
        text: `Files too large: ${oversized.map((f) => f.name).join(', ')}. Max 5MB each.`,
      });
      return;
    }
    setSelectedImages((prev) => [...prev, ...files]);
    setMessage(null);
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeUploadedImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (selectedImages.length === 0) return [];
    setUploading(true);
    try {
      const fd = new FormData();
      selectedImages.forEach((file) => fd.append('images', file));
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Upload failed');
      setSelectedImages([]);
      return result.urls || [];
    } catch (e) {
      console.error('Image upload error:', e);
      throw e;
    } finally {
      setUploading(false);
    }
  };

  const goNext = () => {
    const stepErrors = validateStep(currentStep.id, formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setErrors({});
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep.id !== 'review') return;
    if (!createButtonClickedRef.current) return;
    createButtonClickedRef.current = false;
    setMessage(null);

    const allErrors: Record<string, string> = {};
    STEPS.forEach((s) => Object.assign(allErrors, validateStep(s.id, formData)));
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setStepIndex(0);
      return;
    }
    setSubmitting(true);

    try {
      let uploadedUrls: string[] = [];
      if (selectedImages.length > 0) uploadedUrls = await uploadImages();
      const allImageUrls = [...formData.images, ...uploadedUrls];

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
        sort_order: typeof formData.sort_order === 'number' ? formData.sort_order : undefined,
        finalName: finalName || undefined,
        categories: formData.categories,
        price: Number(formData.price),
        compare_price: typeof formData.compare_price === 'number' ? formData.compare_price : undefined,
        publish: formData.publish,
        inventoryQuantity: Number(formData.inventoryQuantity),
        inventory_management: formData.inventory_management || undefined,
        inventory_management_level: formData.inventory_management_level || undefined,
        inventory_allow_out_of_stock:
          typeof formData.inventory_allow_out_of_stock === 'number' ? formData.inventory_allow_out_of_stock : undefined,
        images: allImageUrls,
        hub: formData.hub?.trim() || undefined,
      };

      const response = await fetch('/api/parent-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });
      const result = await response.json();

      if (result.success) {
        setMessage({
          type: 'success',
          text: result.warning ? `Product created with warning: ${result.warning}` : 'Product created successfully!',
        });
        setFormData(initialFormData);
        setSelectedImages([]);
        setErrors({});
        setStepIndex(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to create product' });
      }
    } catch (err) {
      console.error('Submit error:', err);
      setMessage({ type: 'error', text: 'Failed to create product. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const sellerOptions = useMemo(
    () => [{ value: '', label: 'Select Seller' }, ...sellers.map((s) => ({ value: s.seller_id, label: s.seller_name }))],
    [sellers]
  );

  const hubOptions = useMemo(
    () => [{ value: '', label: 'Select Hub' }, ...HUB_MAPPINGS.map((m) => ({ value: m.hub, label: m.hub }))],
    []
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Step tracker – outside the card, like category-add */}
      <div className="relative">
        <div
          className="absolute top-5 h-0.5 bg-slate-200 rounded-full"
          style={{
            left: `${100 / (STEPS.length * 2)}%`,
            width: `${(100 * (STEPS.length - 1)) / STEPS.length}%`,
          }}
          aria-hidden
        />
        <div
          className="absolute top-5 h-0.5 bg-emerald-500 rounded-full transition-all duration-300 ease-out"
          style={{
            left: `${100 / (STEPS.length * 2)}%`,
            width:
              stepIndex === 0
                ? '0%'
                : `${((100 * (STEPS.length - 1)) / STEPS.length) * (stepIndex / (STEPS.length - 1))}%`,
          }}
          aria-hidden
        />
        <div className="relative flex justify-between px-2">
          {STEPS.map((step, i) => {
            const isCompleted = i < stepIndex;
            const isCurrent = i === stepIndex;
            return (
              <div key={step.id} className="flex flex-col items-center flex-1 min-w-0">
                <div
                  className={`flex items-center justify-center rounded-full w-10 h-10 text-sm font-semibold shrink-0 transition-colors ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                        ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 ring-offset-2'
                        : 'bg-slate-200 text-slate-500'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? <Check className="w-5 h-5" strokeWidth={2.5} /> : i + 1}
                </div>
                <span
                  className={`text-xs font-medium mt-1.5 text-center truncate w-full max-w-[4.5rem] sm:max-w-none ${
                    isCurrent ? 'text-slate-900' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-4 space-y-5">
          {/* Step content */}
          <div className="min-h-[200px]">
            {currentStep.id === 'basics' && (
              <StepBasics
                plant={formData.plant}
                otherNames={formData.otherNames}
                variety={formData.variety}
                colour={formData.colour}
                height={formData.height}
                mossStick={formData.mossStick}
                size={formData.size}
                type={formData.type}
                seller={formData.seller}
                sort_order={formData.sort_order}
                finalName={finalName}
                sellerOptions={sellerOptions}
                errors={errors}
                onFieldChange={handleFieldChange}
                onClearError={clearError}
              />
            )}
            {currentStep.id === 'pricing' && (
              <StepPricing
                price={formData.price}
                compare_price={formData.compare_price}
                inventoryQuantity={formData.inventoryQuantity}
                inventory_management={formData.inventory_management}
                inventory_management_level={formData.inventory_management_level}
                inventory_allow_out_of_stock={formData.inventory_allow_out_of_stock}
                publish={formData.publish}
                hub={formData.hub}
                hubOptions={hubOptions}
                errors={errors}
                onFieldChange={handleFieldChange}
                onClearError={clearError}
              />
            )}
            {currentStep.id === 'categories-images' && (
              <StepCategoriesAndImages
                categories={categories}
                selectedCategoryIds={formData.categories}
                selectedImages={selectedImages}
                uploadedImageUrls={formData.images}
                errors={errors}
                fileInputRef={fileInputRef}
                onCategoryToggle={handleCategoryToggle}
                onRemoveCategory={handleRemoveCategory}
                onImageSelect={handleImageSelect}
                onRemoveSelectedImage={removeSelectedImage}
                onRemoveUploadedImage={removeUploadedImage}
                onClearError={clearError}
              />
            )}
            {currentStep.id === 'review' && (
              <StepReview data={formData} finalName={finalName} categories={categories} />
            )}
          </div>

          {message && (
            <Notification type={message.type} text={message.text} onDismiss={() => setMessage(null)} />
          )}

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 pb-2 border-t border-slate-200">
            <div className="flex items-center gap-3 ml-auto">
              {!isFirst && (
                <button
                  type="button"
                  onClick={goBack}
                  className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              )}
              {isLast ? (
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  onClick={() => { createButtonClickedRef.current = true; }}
                  className="min-w-[160px] flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting || uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      {uploading ? 'Uploading...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Create product
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white shadow-md flex items-center gap-1.5"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
