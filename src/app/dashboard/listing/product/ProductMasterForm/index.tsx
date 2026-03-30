'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check, Save, Download, Upload } from 'lucide-react';
import type { ParentMaster, ProductType } from '@/models/parentMaster';
import type { ListingSection } from '@/models/listingProduct';
import type { Category } from '@/models/category';
import type { CollectionMaster } from '@/models/collectionMaster';
import type { ProcurementSellerMaster } from '@/models/procurementSellerMaster';
import { Notification } from '@/components/ui/Notification';
import {
  clearFormStorageOnReload,
  getPersistedForm,
  setPersistedForm,
  removePersistedForm,
} from '../../hooks/useFormPersistence';
import {
  STEPS,
  SHORT_STEPS,
  initialFormData,
  initialNonParentFormData,
  buildDefaultSeoTitle,
  buildDefaultSeoDescription,
  type StepId,
  type ProductFormData,
  type NonParentFormData,
} from './types';
import {
  StepProductInfo,
  StepDetails,
  StepPricing,
  StepCategoriesAndImages,
  StepSeoFields,
  StepSelectProductType,
  StepNonParentProductInfo,
  StepNonParentReview,
} from './steps';

const FORM_STORAGE_KEY = 'listing_form_product';

type Phase = 'choose' | 'parent' | 'non-parent';

interface PersistedShape {
  phase: Phase;
  stepIndex?: number;
  formData?: ProductFormData;
  nonParentProductType?: 'growing_product' | 'consumable';
  nonParentStepIndex?: number;
  nonParentFormData?: NonParentFormData;
}

function loadInitialPersisted(): {
  phase: Phase;
  stepIndex: number;
  formData: ProductFormData;
  nonParentProductType: 'growing_product' | 'consumable';
  nonParentStepIndex: number;
  nonParentFormData: NonParentFormData;
} {
  clearFormStorageOnReload(FORM_STORAGE_KEY);
  const raw = getPersistedForm<PersistedShape>(FORM_STORAGE_KEY);
  const base = {
    stepIndex: 0,
    formData: initialFormData,
    nonParentProductType: 'growing_product' as const,
    nonParentStepIndex: 0,
    nonParentFormData: initialNonParentFormData,
  };
  if (!raw?.phase) {
    return { phase: 'choose', ...base };
  }
  if (raw.phase === 'parent') {
    return {
      phase: 'parent',
      stepIndex: raw.stepIndex ?? 0,
      formData: raw.formData ? { ...initialFormData, ...raw.formData } : initialFormData,
      nonParentProductType: 'growing_product' as const,
      nonParentStepIndex: 0,
      nonParentFormData: initialNonParentFormData,
    };
  }
  if (raw.phase === 'non-parent' && raw.nonParentProductType) {
    const np = raw.nonParentFormData;
    const mergedNp =
      np != null
        ? (() => {
            const m: NonParentFormData = { ...initialNonParentFormData, ...np };
            const legacySku = (np as { sku?: string }).sku;
            if (!m.productCode?.trim() && typeof legacySku === 'string' && legacySku.trim()) {
              m.productCode = legacySku.trim();
            }
            return m;
          })()
        : initialNonParentFormData;
    return {
      phase: 'non-parent',
      ...base,
      nonParentProductType: raw.nonParentProductType,
      nonParentStepIndex: raw.nonParentStepIndex ?? 0,
      nonParentFormData: mergedNp,
    };
  }
  return { phase: 'choose', ...base };
}

function validateStep(stepId: StepId, data: ProductFormData): Record<string, string> {
  const err: Record<string, string> = {};
  switch (stepId) {
    case 'product-info':
      if (!data.plant.trim()) err.plant = 'Plant name is required';
      break;
    case 'details':
      if (data.listingHubs.length === 0) err.listingHubs = 'Select at least one hub';
      break;
    case 'pricing':
      if (data.sellingPrice !== '' && typeof data.sellingPrice === 'number' && data.sellingPrice < 0) {
        err.sellingPrice = 'Selling price cannot be negative';
      }
      if (data.compare_at !== '' && typeof data.compare_at === 'number' && data.compare_at < 0) {
        err.compare_at = 'Compare-at price cannot be negative';
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

function validateNonParentInfo(
  productType: 'growing_product' | 'consumable',
  data: NonParentFormData
): Record<string, string> {
  const err: Record<string, string> = {};
  if (!data.plant.trim()) err.plant = 'Name is required';
  if (!data.productCode.trim()) err.productCode = 'Product code is required';
  if (productType === 'growing_product') {
    if (!data.vendorMasterId.trim()) err.vendorMasterId = 'Primary vendor is required';
    if (!data.parentSku.trim()) err.parentSku = 'Parent SKU is required';
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
  if (data.potType?.trim()) parts.push(data.potType.trim());
  return parts.join(' ');
}

export function ProductMasterForm() {
  const init = loadInitialPersisted();
  const [phase, setPhase] = useState<Phase>(init.phase);
  const [pendingProductType, setPendingProductType] = useState<ProductType | null>(null);
  const [stepIndex, setStepIndex] = useState(init.stepIndex);
  const [formData, setFormData] = useState<ProductFormData>(init.formData);
  const [nonParentProductType, setNonParentProductType] = useState<'growing_product' | 'consumable'>(
    init.nonParentProductType
  );
  const [nonParentStepIndex, setNonParentStepIndex] = useState(init.nonParentStepIndex);
  const [nonParentFormData, setNonParentFormData] = useState<NonParentFormData>(init.nonParentFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<CollectionMaster[]>([]);
  const [sellers, setSellers] = useState<ProcurementSellerMaster[]>([]);
  const [baseParents, setBaseParents] = useState<ParentMaster[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nonParentFileInputRef = useRef<HTMLInputElement>(null);
  const bulkImportInputRef = useRef<HTMLInputElement>(null);
  const createButtonClickedRef = useRef(false);

  const currentStep = STEPS[stepIndex];
  const isParentFirst = phase === 'parent' && stepIndex === 0;
  const isParentLast = phase === 'parent' && stepIndex === STEPS.length - 1;
  const isNonParentFirst = phase === 'non-parent' && nonParentStepIndex === 0;
  const isNonParentLast = phase === 'non-parent' && nonParentStepIndex === SHORT_STEPS.length - 1;
  const finalName = useMemo(() => computeFinalName(formData), [formData]);

  /** On the parent review step, copy calculated defaults into state so every field shows a real value (not placeholders). */
  useEffect(() => {
    if (phase !== 'parent' || STEPS[stepIndex]?.id !== 'review') return;
    setFormData((prev) => {
      let changed = false;
      const next = { ...prev };
      if (
        next.compare_at === '' &&
        typeof next.sellingPrice === 'number' &&
        !Number.isNaN(next.sellingPrice)
      ) {
        next.compare_at = next.sellingPrice * 4;
        changed = true;
      }
      if (next.plant.trim()) {
        if (!next.seoTitle.trim()) {
          next.seoTitle = buildDefaultSeoTitle(next.plant);
          changed = true;
        }
        if (!next.seoDescription.trim()) {
          next.seoDescription = buildDefaultSeoDescription(next.plant);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [phase, stepIndex]);

  const activeSteps = phase === 'non-parent' ? SHORT_STEPS : STEPS;
  const activeStepIndex = phase === 'non-parent' ? nonParentStepIndex : stepIndex;

  const fetchCategories = useCallback(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) setCategories(json.data);
      })
      .catch((e) => console.error('Error fetching categories:', e));
  }, []);

  useEffect(() => {
    const payload: PersistedShape =
      phase === 'choose'
        ? { phase: 'choose' }
        : phase === 'parent'
          ? { phase: 'parent', stepIndex, formData }
          : {
              phase: 'non-parent',
              nonParentProductType,
              nonParentStepIndex,
              nonParentFormData,
            };
    setPersistedForm(FORM_STORAGE_KEY, payload);
  }, [phase, stepIndex, formData, nonParentProductType, nonParentStepIndex, nonParentFormData]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetch('/api/collection-master?limit=100')
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) setCollections(json.data);
      })
      .catch((e) => console.error('Error fetching collections:', e));
  }, []);

  useEffect(() => {
    fetch('/api/procurement-seller-master?limit=500')
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) setSellers(json.data);
      })
      .catch((e) => console.error('Error fetching procurement sellers:', e));
  }, []);

  useEffect(() => {
    if (phase !== 'non-parent') return;
    fetch('/api/parent-master?baseParentsOnly=true&limit=2000&sortField=plant&sortOrder=asc')
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) setBaseParents(json.data);
      })
      .catch((e) => console.error('Error fetching base parents:', e));
  }, [phase]);

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
    if (field === 'sellingPrice') {
      setFormData((prev) => {
        const sp = value as ProductFormData['sellingPrice'];
        const next = { ...prev, sellingPrice: sp };
        if (typeof sp === 'number' && !Number.isNaN(sp)) {
          next.compare_at = sp * 4;
        } else if (sp === '') {
          next.compare_at = '';
        }
        return next;
      });
      return;
    }
    if (field === 'plant') {
      const newPlant = String(value);
      setFormData((prev) => {
        const next = { ...prev, plant: newPlant };
        const oldTitle = buildDefaultSeoTitle(prev.plant);
        const oldDesc = buildDefaultSeoDescription(prev.plant);
        if (!prev.seoTitle.trim() || prev.seoTitle === oldTitle) {
          next.seoTitle = buildDefaultSeoTitle(newPlant);
        }
        if (!prev.seoDescription.trim() || prev.seoDescription === oldDesc) {
          next.seoDescription = buildDefaultSeoDescription(newPlant);
        }
        return next;
      });
      return;
    }
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

  const handleCollectionToggle = (collectionId: string) => {
    setFormData((prev) => ({
      ...prev,
      collectionIds: prev.collectionIds.includes(collectionId)
        ? prev.collectionIds.filter((id) => id !== collectionId)
        : [...prev.collectionIds, collectionId],
    }));
  };

  const handleRemoveCollection = (collectionId: string) => {
    setFormData((prev) => ({
      ...prev,
      collectionIds: prev.collectionIds.filter((id) => id !== collectionId),
    }));
  };

  const handleListingHubToggle = (hub: string) => {
    setFormData((prev) => ({
      ...prev,
      listingHubs: prev.listingHubs.includes(hub)
        ? prev.listingHubs.filter((h) => h !== hub)
        : [...prev.listingHubs, hub],
    }));
    clearError('listingHubs');
  };

  const handleListingSectionChange = (section: ListingSection) => {
    setFormData((prev) => ({ ...prev, listingSection: section }));
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
    event.target.value = '';
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

  const beginWizard = () => {
    const t = pendingProductType;
    if (!t) {
      setMessage({ type: 'error', text: 'Select a product type first.' });
      return;
    }
    setMessage(null);
    setErrors({});
    if (t === 'parent') {
      setFormData(initialFormData);
      setStepIndex(0);
      setSelectedImages([]);
      setPhase('parent');
    } else {
      setNonParentFormData(initialNonParentFormData);
      setNonParentStepIndex(0);
      setNonParentProductType(t);
      setSelectedImages([]);
      setPhase('non-parent');
    }
    setPendingProductType(null);
  };

  const goBackToTypeSelect = () => {
    setErrors({});
    setPhase('choose');
    setPendingProductType(null);
    setStepIndex(0);
    setNonParentStepIndex(0);
  };

  const goNext = () => {
    if (phase === 'parent') {
      const stepErrors = validateStep(currentStep.id, formData);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
      setErrors({});
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
      return;
    }
    if (phase === 'non-parent') {
      const id = SHORT_STEPS[nonParentStepIndex].id;
      if (id === 'non-parent-info') {
        const stepErrors = validateNonParentInfo(nonParentProductType, nonParentFormData);
        if (Object.keys(stepErrors).length > 0) {
          setErrors(stepErrors);
          return;
        }
        setErrors({});
      }
      setNonParentStepIndex((i) => Math.min(i + 1, SHORT_STEPS.length - 1));
    }
  };

  const goBack = () => {
    setErrors({});
    if (phase === 'parent') {
      if (stepIndex === 0) {
        goBackToTypeSelect();
        return;
      }
      setStepIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (phase === 'non-parent') {
      if (nonParentStepIndex === 0) {
        goBackToTypeSelect();
        return;
      }
      setNonParentStepIndex((i) => Math.max(i - 1, 0));
    }
  };

  const setNonParentField = (field: keyof NonParentFormData, value: string) => {
    setNonParentFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createButtonClickedRef.current) return;
    createButtonClickedRef.current = false;
    setMessage(null);

    if (phase === 'parent') {
      if (currentStep.id !== 'review') return;
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

        const compareAtResolved =
          formData.compare_at !== '' && typeof formData.compare_at === 'number'
            ? formData.compare_at
            : formData.sellingPrice !== '' && typeof formData.sellingPrice === 'number'
              ? formData.sellingPrice * 4
              : undefined;

        const submitData: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'> & {
          seoTitle?: string;
          seoDescription?: string;
        } = {
          productType: 'parent',
          plant: formData.plant.trim(),
          otherNames: formData.otherNames.trim() || undefined,
          variety: formData.variety.trim() || undefined,
          colour: formData.colour.trim() || undefined,
          height: typeof formData.height === 'number' ? formData.height : undefined,
          mossStick: formData.mossStick || undefined,
          size: typeof formData.size === 'number' ? formData.size : undefined,
          potType: formData.potType || undefined,
          seller: formData.seller || undefined,
          features: formData.features || undefined,
          redirects: formData.redirects || undefined,
          description: formData.description.trim() || undefined,
          finalName: finalName || undefined,
          categories: formData.categories,
          collectionIds: formData.collectionIds.length > 0 ? formData.collectionIds : undefined,
          sellingPrice:
            formData.sellingPrice !== '' && typeof formData.sellingPrice === 'number'
              ? formData.sellingPrice
              : undefined,
          ...(compareAtResolved !== undefined ? { compare_at: compareAtResolved } : {}),
          ...(formData.tax === '5' || formData.tax === '18' ? { tax: formData.tax } : {}),
          ...(formData.parentKind === 'plant' || formData.parentKind === 'pot'
            ? { parentKind: formData.parentKind }
            : {}),
          seoTitle: formData.seoTitle.trim(),
          seoDescription: formData.seoDescription.trim(),
          inventory_quantity:
            formData.inventory_quantity !== '' && typeof formData.inventory_quantity === 'number'
              ? formData.inventory_quantity
              : undefined,
          images: allImageUrls.length > 0 ? allImageUrls : undefined,
        };

        if (formData.listingHubs.length > 0 && allImageUrls.length === 0) {
          setMessage({
            type: 'error',
            text: 'Add at least one product image — hub listings require images.',
          });
          setSubmitting(false);
          return;
        }

        const response = await fetch('/api/parent-master', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...submitData,
            listingHubs: formData.listingHubs,
            listingSection: formData.listingSection,
          }),
        });
        const result = await response.json();

        if (result.success) {
          removePersistedForm(FORM_STORAGE_KEY);
          const listingNote =
            typeof result.listingCreatedCount === 'number' && result.listingCreatedCount > 0
              ? ` ${result.listingCreatedCount} hub listing(s) created.`
              : '';
          setMessage({
            type: 'success',
            text: result.warning
              ? `Product created with warning: ${result.warning}`
              : (result.message || 'Product created successfully!') + listingNote,
          });
          setFormData(initialFormData);
          setSelectedImages([]);
          setErrors({});
          setStepIndex(0);
          setPhase('choose');
          if (fileInputRef.current) fileInputRef.current.value = '';
          if (nonParentFileInputRef.current) nonParentFileInputRef.current.value = '';
        } else {
          setMessage({ type: 'error', text: result.message || 'Failed to create product' });
        }
      } catch (err) {
        console.error('Submit error:', err);
        setMessage({ type: 'error', text: 'Failed to create product. Please try again.' });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (phase === 'non-parent') {
      if (nonParentStepIndex !== SHORT_STEPS.length - 1) return;
      const allErrors = validateNonParentInfo(nonParentProductType, nonParentFormData);
      if (Object.keys(allErrors).length > 0) {
        setErrors(allErrors);
        setNonParentStepIndex(0);
        return;
      }
      setSubmitting(true);
      try {
        let uploadedUrls: string[] = [];
        if (selectedImages.length > 0) uploadedUrls = await uploadImages();
        const allImageUrls = [...nonParentFormData.images, ...uploadedUrls];

        const submitData: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'> = {
          productType: nonParentProductType,
          plant: nonParentFormData.plant.trim(),
          productCode: nonParentFormData.productCode.trim(),
          categories: [],
          finalName: nonParentFormData.plant.trim(),
          images: allImageUrls.length > 0 ? allImageUrls : undefined,
          ...(nonParentFormData.vendorMasterId.trim()
            ? { vendorMasterId: nonParentFormData.vendorMasterId.trim() }
            : {}),
          ...(nonParentFormData.parentSku.trim()
            ? { sku: nonParentFormData.parentSku.trim() }
            : {}),
        };

        const response = await fetch('/api/parent-master', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });
        const result = await response.json();

        if (result.success) {
          removePersistedForm(FORM_STORAGE_KEY);
          setMessage({
            type: 'success',
            text: result.warning ? `Product created with warning: ${result.warning}` : 'Product created successfully!',
          });
          setNonParentFormData(initialNonParentFormData);
          setSelectedImages([]);
          setErrors({});
          setNonParentStepIndex(0);
          setPhase('choose');
          if (nonParentFileInputRef.current) nonParentFileInputRef.current.value = '';
        } else {
          setMessage({ type: 'error', text: result.message || 'Failed to create product' });
        }
      } catch (err) {
        console.error('Submit error:', err);
        setMessage({ type: 'error', text: 'Failed to create product. Please try again.' });
      } finally {
        setSubmitting(false);
      }
    }
  };

  const sellerOptions = useMemo(
    () => [
      { value: '', label: 'Select Procurement Seller' },
      ...sellers.map((s) => ({ value: String(s._id), label: s.seller_name })),
    ],
    [sellers]
  );

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/parent-master/template');
      if (!res.ok) throw new Error('Failed to download template');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'parent-master-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Template download error:', err);
      setMessage({ type: 'error', text: 'Failed to download template.' });
    }
  };

  const handleBulkImportClick = () => {
    bulkImportInputRef.current?.click();
  };

  const handleBulkImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setMessage(null);
    setBulkImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/parent-master/bulk-import', { method: 'POST', body: fd });
      const result = await res.json();
      if (result.success) {
        setMessage({
          type: 'success',
          text: result.message || `Imported ${result.insertedCount} product(s).`,
        });
      } else {
        setMessage({ type: 'error', text: result.message || 'Bulk import failed.' });
      }
    } catch (err) {
      console.error('Bulk import error:', err);
      setMessage({ type: 'error', text: 'Bulk import failed. Please try again.' });
    } finally {
      setBulkImporting(false);
    }
  };

  const showStepper = phase !== 'choose';
  const stepCount = activeSteps.length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {showStepper && (
        <div className="relative mt-6 mb-6">
          <div
            className="absolute top-5 h-0.5 bg-slate-200 rounded-full"
            style={{
              left: `${100 / (stepCount * 2)}%`,
              width: `${(100 * (stepCount - 1)) / stepCount}%`,
            }}
            aria-hidden
          />
          <div
            className="absolute top-5 h-0.5 bg-emerald-500 rounded-full transition-all duration-300 ease-out"
            style={{
              left: `${100 / (stepCount * 2)}%`,
              width:
                activeStepIndex === 0
                  ? '0%'
                  : `${((100 * (stepCount - 1)) / stepCount) * (activeStepIndex / (stepCount - 1))}%`,
            }}
            aria-hidden
          />
          <div className="relative flex justify-between px-2">
            {activeSteps.map((step, i) => {
              const isCompleted = i < activeStepIndex;
              const isCurrent = i === activeStepIndex;
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
                    className={`text-xs font-medium mt-1.5 text-center truncate w-full max-w-18 sm:max-w-none ${
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
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-4 space-y-5">
          {phase === 'parent' && (
            <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-slate-200">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="w-4 h-4" />
                Download CSV template
              </button>
              <input
                ref={bulkImportInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleBulkImportFile}
              />
              <button
                type="button"
                onClick={handleBulkImportClick}
                disabled={bulkImporting}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-400 border-t-transparent" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Bulk import
                  </>
                )}
              </button>
            </div>
          )}

          <div className="min-h-[200px]">
            {phase === 'choose' && (
              <StepSelectProductType value={pendingProductType} onSelect={setPendingProductType} />
            )}

            {phase === 'parent' && currentStep.id === 'product-info' && (
              <StepProductInfo
                plant={formData.plant}
                otherNames={formData.otherNames}
                variety={formData.variety}
                colour={formData.colour}
                height={formData.height}
                size={formData.size}
                parentKind={formData.parentKind}
                finalName={finalName}
                errors={errors}
                onFieldChange={handleFieldChange}
                onClearError={clearError}
              />
            )}
            {phase === 'parent' && currentStep.id === 'details' && (
              <StepDetails
                mossStick={formData.mossStick}
                potType={formData.potType}
                seller={formData.seller}
                features={formData.features}
                redirects={formData.redirects}
                description={formData.description}
                sellerOptions={sellerOptions}
                listingHubs={formData.listingHubs}
                listingSection={formData.listingSection}
                onListingHubToggle={handleListingHubToggle}
                onListingSectionChange={handleListingSectionChange}
                listingHubsError={errors.listingHubs}
                errors={errors}
                onFieldChange={handleFieldChange}
                onClearError={clearError}
              />
            )}
            {phase === 'parent' && currentStep.id === 'pricing' && (
              <StepPricing
                sellingPrice={formData.sellingPrice}
                tax={formData.tax}
                errors={errors}
                onFieldChange={handleFieldChange}
                onClearError={clearError}
              />
            )}
            {phase === 'parent' && currentStep.id === 'categories-images' && (
              <StepCategoriesAndImages
                categories={categories}
                collections={collections}
                selectedCategoryIds={formData.categories}
                selectedCollectionIds={formData.collectionIds}
                selectedImages={selectedImages}
                uploadedImageUrls={formData.images}
                errors={errors}
                fileInputRef={fileInputRef}
                onCategoryToggle={handleCategoryToggle}
                onRemoveCategory={handleRemoveCategory}
                onCollectionToggle={handleCollectionToggle}
                onRemoveCollection={handleRemoveCollection}
                onImageSelect={handleImageSelect}
                onRemoveSelectedImage={removeSelectedImage}
                onRemoveUploadedImage={removeUploadedImage}
                onClearError={clearError}
              />
            )}
            {phase === 'parent' && currentStep.id === 'review' && (
              <div className="space-y-10">
                <p className="text-sm text-slate-600">
                  Review and edit any section below before creating the product.
                </p>
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">
                    Product info
                  </h2>
                  <StepProductInfo
                    plant={formData.plant}
                    otherNames={formData.otherNames}
                    variety={formData.variety}
                    colour={formData.colour}
                    height={formData.height}
                    size={formData.size}
                    parentKind={formData.parentKind}
                    finalName={finalName}
                    errors={errors}
                    onFieldChange={handleFieldChange}
                    onClearError={clearError}
                  />
                </section>
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">
                    Details
                  </h2>
                  <StepDetails
                    mossStick={formData.mossStick}
                    potType={formData.potType}
                    seller={formData.seller}
                    features={formData.features}
                    redirects={formData.redirects}
                    description={formData.description}
                    sellerOptions={sellerOptions}
                    listingHubs={formData.listingHubs}
                    listingSection={formData.listingSection}
                    onListingHubToggle={handleListingHubToggle}
                    onListingSectionChange={handleListingSectionChange}
                    listingHubsError={errors.listingHubs}
                    errors={errors}
                    onFieldChange={handleFieldChange}
                    onClearError={clearError}
                  />
                </section>
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">
                    Pricing
                  </h2>
                  <StepPricing
                    sellingPrice={formData.sellingPrice}
                    compare_at={formData.compare_at}
                    compareAtEditable
                    tax={formData.tax}
                    errors={errors}
                    onFieldChange={handleFieldChange}
                    onClearError={clearError}
                  />
                </section>
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">
                    Categories &amp; images
                  </h2>
                  <StepCategoriesAndImages
                    categories={categories}
                    collections={collections}
                    selectedCategoryIds={formData.categories}
                    selectedCollectionIds={formData.collectionIds}
                    selectedImages={selectedImages}
                    uploadedImageUrls={formData.images}
                    errors={errors}
                    fileInputRef={fileInputRef}
                    onCategoryToggle={handleCategoryToggle}
                    onRemoveCategory={handleRemoveCategory}
                    onCollectionToggle={handleCollectionToggle}
                    onRemoveCollection={handleRemoveCollection}
                    onImageSelect={handleImageSelect}
                    onRemoveSelectedImage={removeSelectedImage}
                    onRemoveUploadedImage={removeUploadedImage}
                    onClearError={clearError}
                  />
                </section>
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">
                    SEO
                  </h2>
                  <StepSeoFields
                    plantName={formData.plant}
                    seoTitle={formData.seoTitle}
                    seoDescription={formData.seoDescription}
                    onFieldChange={handleFieldChange}
                  />
                </section>
              </div>
            )}

            {phase === 'non-parent' && SHORT_STEPS[nonParentStepIndex].id === 'non-parent-info' && (
              <StepNonParentProductInfo
                productFlowType={nonParentProductType}
                data={nonParentFormData}
                vendors={sellers}
                baseParents={baseParents}
                errors={errors}
                selectedFiles={selectedImages}
                fileInputRef={nonParentFileInputRef}
                onFieldChange={setNonParentField}
                onClearError={clearError}
                onImageSelect={handleImageSelect}
                onRemoveSelectedFile={removeSelectedImage}
              />
            )}
            {phase === 'non-parent' && SHORT_STEPS[nonParentStepIndex].id === 'non-parent-review' && (
              <StepNonParentReview
                productFlowType={nonParentProductType}
                data={nonParentFormData}
                vendors={sellers}
                baseParents={baseParents}
                selectedFileCount={selectedImages.length}
              />
            )}
          </div>

          {message && (
            <Notification type={message.type} text={message.text} onDismiss={() => setMessage(null)} />
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 pb-2 border-t border-slate-200">
            <div className="flex items-center gap-3 ml-auto">
              {phase === 'choose' ? (
                <button
                  type="button"
                  onClick={beginWizard}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white shadow-md flex items-center gap-1.5"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  {!(phase === 'parent' && isParentFirst) && !(phase === 'non-parent' && isNonParentFirst) ? (
                    <button
                      type="button"
                      onClick={goBack}
                      className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={goBack}
                      className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" /> Change type
                    </button>
                  )}
                  {((phase === 'parent' && isParentLast) || (phase === 'non-parent' && isNonParentLast)) ? (
                    <button
                      type="submit"
                      disabled={submitting || uploading}
                      onClick={() => {
                        createButtonClickedRef.current = true;
                      }}
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
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
