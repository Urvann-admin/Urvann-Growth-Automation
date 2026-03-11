import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import type { ParentMaster } from '@/models/parentMaster';
import type { ListingSection } from '@/models/listingProduct';
import type { ImageItem } from '@/models/imageCollection';
import type { 
  SplitScreenState, 
  SelectedImage, 
  ProductRow, 
  ImageCollection,
  ParentItemRow,
} from './types';
import { validateStep } from '@/lib/listingProductValidation';

export function useSplitScreenState(section: ListingSection) {
  const [state, setState] = useState<SplitScreenState>({
    selectedImages: [],
    productRows: [],
    availableParents: [],
    selectedParent: null,
    viewMode: 'product-table',
    validationErrors: {},
    isSaving: false,
    isLoading: false,
  });

  const [imageCollections, setImageCollections] = useState<ImageCollection[]>([]);
  const [allImages, setAllImages] = useState<SelectedImage[]>([]);

  // Load image collections
  const loadImageCollections = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch('/api/image-collection?status=completed&limit=100');
      const result = await response.json();
      if (result.success) {
        // Transform collections to include individual images
        const collectionsWithImages = await Promise.all(
          result.data.map(async (collection: any) => {
            try {
              const detailResponse = await fetch(`/api/image-collection/${collection._id}`);
              const detailResult = await detailResponse.json();
              if (detailResult.success && detailResult.data.images) {
                return {
                  ...collection,
                  images: detailResult.data.images
                };
              }
              return { ...collection, images: [] };
            } catch (error) {
              console.error(`Failed to load images for collection ${collection._id}:`, error);
              return { ...collection, images: [] };
            }
          })
        );
        setImageCollections(collectionsWithImages);

        // Create flat list of all images
        const flatImages: SelectedImage[] = [];
        let serialCounter = 1;
        collectionsWithImages.forEach(collection => {
          collection.images.forEach((image: ImageItem) => {
            flatImages.push({
              url: image.url,
              filename: image.filename,
              collectionId: collection._id,
              collectionName: collection.name,
              isTagged: false,
              size: image.size ?? 0,
              uploadedAt: image.uploadedAt ? new Date(image.uploadedAt) : new Date(),
              serial: serialCounter++,
            });
          });
        });
        setAllImages(flatImages);
      }
    } catch (error) {
      console.error('Failed to load image collections:', error);
      toast.error('Failed to load image collections');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Load available parents — fetch all, no section filter so pots/zero-inventory items appear
  const loadAvailableParents = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch(`/api/parent-master?limit=1000&sortField=plant&sortOrder=asc`);
      const result = await response.json();
      if (result.success) {
        setState(prev => ({ 
          ...prev, 
          availableParents: result.data,
          isLoading: false 
        }));
      }
    } catch (error) {
      console.error('Failed to load parents:', error);
      toast.error('Failed to load parent products');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Generate unique ID for new rows / parent items
  const generateRowId = useCallback(() => {
    return `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const generateParentItemId = useCallback(() => {
    return `parent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const getNextSerial = useCallback((rows: ProductRow[]): number => {
    if (rows.length === 0) return 1;
    const maxSerial = Math.max(...rows.map((r) => r.serial || 0));
    return (isFinite(maxSerial) && maxSerial > 0 ? maxSerial : 0) + 1;
  }, []);

  const calculatePriceAndInventory = useCallback(
    (parentItems: ParentItemRow[]): { price: number; inventory: number } => {
      let totalPrice = 0;
      let minInventory = Infinity;

      parentItems.forEach((item) => {
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
    },
    []
  );

  // Create initial product row from parent
  const createProductRowFromParent = useCallback(
    (parent: ParentMaster, images: SelectedImage[] = [], serial: number = 1): ProductRow => {
      const parentItem: ParentItemRow = {
        id: generateParentItemId(),
        parentSku: parent.sku || '',
        quantity: 1,
        unitPrice: parent.price || 0,
        parent,
      };

      const { price, inventory } = calculatePriceAndInventory([parentItem]);

      return {
        id: generateRowId(),
        serial,
        parentSkus: [parent.sku || ''],
        parentItems: [parentItem],
        selectedParent: parent,
        taggedImages: images,
        
        // Product details from parent
        plant: parent.plant || '',
        otherNames: parent.otherNames || '',
        variety: parent.variety || '',
        colour: parent.colour || '',
        height: parent.height || '',
        size: parent.size || '',
        type: parent.type || '',
        description: parent.description || '',
        
        // Pricing and inventory
        setQuantity: 1,
        quantity: 1,
        potQuantity: 0,
        price,
        inventory_quantity: inventory,
        tags: [],
        compare_at_price: undefined,
        sort_order: 3000,
        
        // Metadata
        hub: parent.hub || '',
        seller: parent.seller || '',
        categories: parent.categories || [],
        collectionIds: parent.collectionIds?.map(id => String(id)) || [],
        
        // Status (validation runs in effect and will set correct isValid)
        isValid: false,
        isSaved: false,
        validationErrors: {},
      };
    },
    [calculatePriceAndInventory, generateParentItemId, generateRowId]
  );

  // Parent selection helpers are no longer used in the new flow, but kept for compatibility
  const selectParent = useCallback((parent: ParentMaster) => {
    setState(prev => ({
      ...prev,
      selectedParent: parent
    }));
  }, []);

  const clearParentSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedParent: null
    }));
  }, []);

  // Add empty product row
  const addEmptyProductRow = useCallback(() => {
    setState(prev => {
      const serial = getNextSerial(prev.productRows);
      const emptyRow: ProductRow = {
        id: generateRowId(),
        serial,
        parentSkus: [],
        parentItems: [],
        selectedParent: undefined,
        taggedImages: [],
        
        // Empty product details
        plant: '',
        otherNames: '',
        variety: '',
        colour: '',
        height: '',
        size: '',
        type: '',
        description: '',
        
        // Default values
        setQuantity: 1,
        quantity: 1,
        potQuantity: 0,
        price: 0,
        inventory_quantity: 0,
        tags: [],
        compare_at_price: undefined,
        sort_order: 3000,
        
        // Metadata
        hub: '',
        seller: '',
        categories: [],
        collectionIds: [],
        
        // Status
        isValid: false,
        isSaved: false,
        validationErrors: { parent: 'Parent selection is required' },
      };

      return {
        ...prev,
        productRows: [...prev.productRows, emptyRow],
      };
    });
  }, [generateRowId, getNextSerial]);

  // Update product row
  const updateProductRow = useCallback((rowId: string, updates: Partial<ProductRow>) => {
    setState(prev => ({
      ...prev,
      productRows: prev.productRows.map(row => 
        row.id === rowId ? { ...row, ...updates, isSaved: false } : row
      )
    }));
  }, []);

  // Remove product row
  const removeProductRow = useCallback((rowId: string) => {
    setState(prev => {
      const rowToRemove = prev.productRows.find(row => row.id === rowId);
      if (!rowToRemove) return prev;

      return {
        ...prev,
        productRows: prev.productRows.filter(row => row.id !== rowId)
      };
    });

    // Untag images that were only tagged to this row
    setAllImages(prev => prev.map(img => {
      const wasTaggedToThisRow = state.productRows
        .find(row => row.id === rowId)?.taggedImages
        .some(taggedImg => taggedImg.url === img.url);
      
      if (wasTaggedToThisRow) {
        // Check if image is tagged to any other row
        const isTaggedElsewhere = state.productRows.some(otherRow => 
          otherRow.id !== rowId && otherRow.taggedImages.some(taggedImg => taggedImg.url === img.url)
        );
        return { ...img, isTagged: isTaggedElsewhere };
      }
      return img;
    }));
  }, [state.productRows]);

  // Toggle image selection
  const toggleImageSelection = useCallback((image: SelectedImage) => {
    setState(prev => {
      const isCurrentlySelected = prev.selectedImages.some(img => img.url === image.url);
      
      if (isCurrentlySelected) {
        return {
          ...prev,
          selectedImages: prev.selectedImages.filter(img => img.url !== image.url)
        };
      } else {
        return {
          ...prev,
          selectedImages: [...prev.selectedImages, image]
        };
      }
    });
  }, []);

  // Clear image selection
  const clearImageSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedImages: [] }));
  }, []);

  // Validate all rows
  const validateAllRows = useCallback(() => {
    setState(prev => {
      const validatedRows = prev.productRows.map(row => {
        const formData = {
          listingType: 'child' as const,
          parentSkus: row.parentSkus,
          section,
          plant: row.plant,
          otherNames: row.otherNames,
          variety: row.variety,
          colour: row.colour,
          height: row.height,
          size: row.size,
          type: row.type,
          description: row.description,
          quantity: row.setQuantity,
          price: row.price,
          inventory_quantity: row.inventory_quantity,
          hub: row.hub,
          seller: row.seller,
          categories: row.categories,
          collectionIds: row.collectionIds,
          images: allImages
            .filter(img => img.serial === row.serial)
            .map(img => img.url),
          status: 'draft' as const,
        };

        const selectedParents = row.parentItems.map(item => item.parent).filter(Boolean) as ParentMaster[];
        const { errors } = validateStep('review', formData as any, selectedParents, section);
        const isValid = Object.keys(errors).length === 0 && row.parentSkus.length > 0;

        return {
          ...row,
          isValid,
          validationErrors: errors
        };
      });

      return { ...prev, productRows: validatedRows };
    });
  }, [section, allImages]);

  // Save all valid products
  const saveAllProducts = useCallback(async () => {
    setState(prev => ({ ...prev, isSaving: true }));
    
    try {
      let validRows: ProductRow[] = [];
      let invalidReasons: { serial: number; errors: string[] }[] = [];
      let validatedRows: ProductRow[] = [];

      // Run validation synchronously first
      validatedRows = state.productRows.map(row => {
        const rowImages = row.taggedImages?.length
          ? row.taggedImages
          : (row.serial && allImages[row.serial - 1] ? [allImages[row.serial - 1]] : []);

        const formData = {
          listingType: 'child' as const,
          parentSkus: row.parentSkus,
          section,
          plant: row.plant,
          otherNames: row.otherNames,
          variety: row.variety,
          colour: row.colour,
          height: row.height,
          size: row.size,
          type: row.type,
          description: row.description,
          quantity: row.setQuantity,
          price: row.price,
          inventory_quantity: row.inventory_quantity,
          hub: row.hub,
          seller: row.seller,
          categories: row.categories,
          collectionIds: row.collectionIds,
          images: rowImages.map(img => img.url),
          status: 'draft' as const,
        };

        const selectedParents = row.parentItems.map(item => item.parent).filter(Boolean) as ParentMaster[];
        const { errors } = validateStep('review', formData as any, selectedParents, section);
        const isValid = Object.keys(errors).length === 0 && row.parentSkus.length > 0;

        if (!isValid) {
          const errorMessages = Object.values(errors).filter(Boolean);
          invalidReasons.push({
            serial: row.serial,
            errors: errorMessages.length > 0 ? errorMessages : ['Parent selection is required'],
          });
        }

        return {
          ...row,
          isValid,
          validationErrors: errors
        };
      });

      validRows = validatedRows.filter(row => row.isValid && !row.isSaved);
      
      // Update state with validated rows
      setState(prev => ({ ...prev, productRows: validatedRows }));

      const allValidAlreadySaved =
        invalidReasons.length === 0 &&
        state.productRows.some(row => row.isValid && row.isSaved);

      if (validRows.length === 0) {
        const message = invalidReasons.length > 0
          ? invalidReasons
              .map(({ serial, errors }) => `Row ${serial}: ${errors.join('; ')}`)
              .join(' ')
          : allValidAlreadySaved
            ? 'All products have already been saved.'
            : 'No products to save. Add at least one row with data.';
        toast.error(message, { duration: 6000 });
        setState(prev => ({ ...prev, isSaving: false }));
        return undefined;
      }

      // Transform rows to API format
      const productsToCreate = validRows.map(row => ({
        listingType: 'child',
        parentSkus: row.parentSkus,
        parentItems: row.parentItems.map(item => ({
          parentSku: item.parentSku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        section,
        plant: row.plant,
        otherNames: row.otherNames,
        variety: row.variety,
        colour: row.colour,
        height: row.height,
        size: row.size,
        type: row.type,
        description: row.description,
        setQuantity: row.setQuantity,
        potQuantity: row.potQuantity,
        quantity: row.setQuantity,
        price: row.price,
        inventory_quantity: row.inventory_quantity,
        tags: row.tags?.length ? row.tags : undefined,
        compare_at_price: row.compare_at_price ?? undefined,
        sort_order: row.sort_order ?? 3000,
        publish_status: (row.inventory_quantity ?? 0) > 0 ? 1 : 0,
        hub: row.hub,
        seller: row.seller,
          categories: row.categories,
          collectionIds: row.collectionIds,
          images: (row.taggedImages?.length ? row.taggedImages : (row.serial && allImages[row.serial - 1] ? [allImages[row.serial - 1]] : [])).map((img: { url: string }) => img.url),
          status: 'draft',
        }));

      // Bulk create
      const response = await fetch('/api/listing-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productsToCreate),
      });

      const result = await response.json();
      
      if (result.success) {
        // Mark rows as saved
        setState(prev => ({
          ...prev,
          productRows: prev.productRows.map(row =>
            validRows.some(validRow => validRow.id === row.id)
              ? { ...row, isSaved: true }
              : row
          ),
          isSaving: false
        }));

        toast.success(`Successfully created ${validRows.length} listing product(s)`);
        return validRows;
      } else {
        toast.error(result.message || 'Failed to create products');
        setState(prev => ({ ...prev, isSaving: false }));
        return undefined;
      }
    } catch (error) {
      console.error('Failed to save products:', error);
      toast.error('Failed to save products');
      setState(prev => ({ ...prev, isSaving: false }));
      return undefined;
    }
  }, [state, section, allImages]);

  /** Save only the current (active) product row; returns true if saved so caller can advance to next. */
  const saveCurrentProduct = useCallback(async (activeRowId: string | null): Promise<boolean> => {
    if (!activeRowId) return false;
    const row = state.productRows.find((r) => r.id === activeRowId);
    if (!row || row.isSaved) return false;

    const rowImages = row.taggedImages?.length
      ? row.taggedImages
      : (row.serial && allImages[row.serial - 1] ? [allImages[row.serial - 1]] : []);
    const formData = {
      listingType: 'child' as const,
      parentSkus: row.parentSkus,
      section,
      plant: row.plant,
      otherNames: row.otherNames,
      variety: row.variety,
      colour: row.colour,
      height: row.height,
      size: row.size,
      type: row.type,
      description: row.description,
      quantity: row.setQuantity,
      price: row.price,
      inventory_quantity: row.inventory_quantity,
      hub: row.hub,
      seller: row.seller,
      categories: row.categories,
      collectionIds: row.collectionIds,
      images: rowImages.map((img: { url: string }) => img.url),
      status: 'draft' as const,
    };
    const selectedParents = row.parentItems.map((item) => item.parent).filter(Boolean) as ParentMaster[];
    const { errors } = validateStep('review', formData as any, selectedParents, section);
    const isValid = Object.keys(errors).length === 0 && row.parentSkus.length > 0;
    if (!isValid) {
      toast.error(Object.values(errors).filter(Boolean)[0] || 'Please complete required fields');
      return false;
    }

    setState((prev) => ({ ...prev, isSaving: true }));
    try {
      const payload = {
        listingType: 'child',
        parentSkus: row.parentSkus,
        parentItems: row.parentItems.map((item) => ({
          parentSku: item.parentSku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        section,
        plant: row.plant,
        otherNames: row.otherNames,
        variety: row.variety,
        colour: row.colour,
        height: row.height,
        size: row.size,
        type: row.type,
        description: row.description,
        setQuantity: row.setQuantity,
        potQuantity: row.potQuantity,
        quantity: row.setQuantity,
        price: row.price,
        inventory_quantity: row.inventory_quantity,
        tags: row.tags?.length ? row.tags : undefined,
        compare_at_price: row.compare_at_price ?? undefined,
        sort_order: row.sort_order ?? 3000,
        publish_status: (row.inventory_quantity ?? 0) > 0 ? 1 : 0,
        hub: row.hub,
        seller: row.seller,
        categories: row.categories,
        collectionIds: row.collectionIds,
        images: rowImages.map((img: { url: string }) => img.url),
        status: 'draft',
      };
      const response = await fetch('/api/listing-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        setState((prev) => ({
          ...prev,
          productRows: prev.productRows.map((r) => (r.id === activeRowId ? { ...r, isSaved: true } : r)),
          isSaving: false,
        }));
        toast.success('Listing saved');
        return true;
      }
      toast.error(result.message || 'Failed to save');
      setState((prev) => ({ ...prev, isSaving: false }));
      return false;
    } catch (e) {
      toast.error('Failed to save');
      setState((prev) => ({ ...prev, isSaving: false }));
      return false;
    }
  }, [state.productRows, section, allImages]);

  // Clear all data
  const clearAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedImages: [],
      productRows: []
    }));

    // Reset all images to untagged
    setAllImages(prev => prev.map(img => ({ ...img, isTagged: false })));
  }, []);

  // Auto-create initial rows when images are loaded
  useEffect(() => {
    if (allImages.length > 0 && state.productRows.length === 0) {
      // Create 3 empty rows by default to show the table structure
      const initialRows: ProductRow[] = [];
      for (let i = 1; i <= Math.min(3, Math.max(1, allImages.length)); i++) {
      const defaultImage = allImages[i - 1];
      const emptyRow: ProductRow = {
        id: `row_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
        serial: i,
        parentSkus: [],
        parentItems: [],
        selectedParent: undefined,
        taggedImages: defaultImage ? [defaultImage] : [],
          
          // Empty product details
          plant: '',
          otherNames: '',
          variety: '',
          colour: '',
          height: '',
          size: '',
          type: '',
          description: '',
          
          // Default values
          setQuantity: 1,
          quantity: 1,
          potQuantity: 0,
          price: 0,
          inventory_quantity: 0,
          tags: [],
          compare_at_price: undefined,
          sort_order: 3000,
          
          // Metadata
          hub: '',
          seller: '',
          categories: [],
          collectionIds: [],
          
          // Status
          isValid: false,
          isSaved: false,
          validationErrors: { parent: 'Parent selection is required' },
        };
        initialRows.push(emptyRow);
      }

      setState(prev => ({
        ...prev,
        productRows: initialRows,
      }));
    }
  }, [allImages.length, state.productRows.length]);

  // Re-validate rows when row content or images change (keeps UI "Valid" in sync with save validation)
  const prevValidationInputRef = useRef<string>('');
  useEffect(() => {
    if (state.productRows.length === 0) return;
    const signature = JSON.stringify({
      rows: state.productRows.map(r => ({
        id: r.id,
        serial: r.serial,
        parentSkus: r.parentSkus,
        parentItems: r.parentItems,
        plant: r.plant,
        hub: r.hub,
        seller: r.seller,
        categories: r.categories,
        setQuantity: r.setQuantity,
        price: r.price,
        inventory_quantity: r.inventory_quantity,
      })),
      images: allImages.map(img => ({ serial: img.serial, url: img.url })),
    });
    if (signature === prevValidationInputRef.current) return;
    prevValidationInputRef.current = signature;
    validateAllRows();
  }, [state.productRows, allImages, validateAllRows]);

  // Load data on mount
  useEffect(() => {
    loadImageCollections();
    loadAvailableParents();
  }, [loadImageCollections, loadAvailableParents]);

  // Merge allImages with selectedImages state for the ImagePanel
  const mergedImages = allImages.map(img => {
    const isSelected = state.selectedImages.some(selected => selected.url === img.url);
    return isSelected ? state.selectedImages.find(selected => selected.url === img.url)! : img;
  });

  return {
    state: {
      ...state,
      selectedImages: mergedImages.filter(img => state.selectedImages.some(selected => selected.url === img.url))
    },
    allImages: mergedImages,
    imageCollections,
    actions: {
      selectParent,
      clearParentSelection,
      addEmptyProductRow,
      updateProductRow,
      removeProductRow,
      toggleImageSelection,
      clearImageSelection,
      validateAllRows,
      saveAllProducts,
      saveCurrentProduct,
      clearAll,
      loadImageCollections,
      loadAvailableParents,
    }
  };
}