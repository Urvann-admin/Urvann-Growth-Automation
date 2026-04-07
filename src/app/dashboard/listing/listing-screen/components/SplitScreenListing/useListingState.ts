import { useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  buildDefaultSeoTitle,
  buildDefaultSeoDescription,
} from '@/app/dashboard/listing/listing-screen/components/ListingProductForm/types';
import { computeProductDisplayName } from '@/lib/productListingDisplayName';
import type { ParentMaster } from '@/models/parentMaster';
import type { ListingSection } from '@/models/listingProduct';
import type { ImageItem } from '@/models/imageCollection';
import type {
  ListingState,
  SelectedImage,
  ProductRow,
  ImageCollection,
  ParentItemRow,
  ListingScreenMode,
  ListingSourcedParentOption,
} from './types';
import { validateStep } from '@/lib/listingProductValidation';
import { passedHubsForChildListingFromPicker } from '@/lib/childListingHubSku';
import { compareAtFromFirstParentLine } from '@/lib/childListingCompareAt';
import { normalizeListingImageUrlForMatch } from '@/lib/listingImageUrl';
import { redirectsArrayToUrlArray, splitRedirectFormValues } from '@/lib/redirectOptionTokens';

const PARENT_LIST_PAGE_LIMIT = 40;

function displayNameForParentSeo(parent: ParentMaster): string {
  const fromFinal = parent.finalName?.trim();
  if (fromFinal) return fromFinal;
  const built = computeProductDisplayName({
    plant: parent.plant || '',
    otherNames: parent.otherNames,
    variety: parent.variety,
    colour: parent.colour,
    height: parent.height ?? '',
    size: parent.size ?? '',
    potType: parent.potType,
    type: parent.type,
    mossStick: parent.mossStick,
  }).trim();
  return built || parent.plant?.trim() || 'plant';
}

/** Child split-screen saves go live as listed; parent flow stays draft until promoted elsewhere. */
function newListingStatusOnSave(listingMode: ListingScreenMode): 'draft' | 'listed' {
  return listingMode === 'child' ? 'listed' : 'draft';
}

async function fetchSellerIdForHub(hub: string): Promise<string> {
  const h = String(hub ?? '').trim();
  if (!h) return '';
  try {
    const res = await fetch(`/api/sellers/by-hub?hub=${encodeURIComponent(h)}`);
    const j = await res.json();
    if (j.success && typeof j.seller_id === 'string' && j.seller_id.trim()) {
      return j.seller_id.trim();
    }
  } catch {
    /* ignore */
  }
  return '';
}

/** URLs to send to listing API / validation: tagged row images plus parent master images (parent mode). */
function getListingImageUrlsForRow(
  row: ProductRow,
  listingMode: ListingScreenMode,
  allImages: SelectedImage[]
): string[] {
  const tagged = (row.taggedImages ?? []).map((i) => i.url).filter(Boolean);
  if (listingMode === 'parent') {
    const fromMaster = (row.parentItems[0]?.parent?.images ?? []).map(String).filter(Boolean);
    return [...new Set([...tagged, ...fromMaster])];
  }
  const fallback =
    row.serial && allImages[row.serial - 1] ? [allImages[row.serial - 1]!.url] : [];
  const urls = tagged.length ? tagged : fallback;
  return [...new Set(urls)].filter(Boolean);
}

/** Stable row id for child listing rows tied to a collection image URL */
function childRowIdForImageUrl(url: string): string {
  let h = 5381;
  for (let i = 0; i < url.length; i++) {
    h = (Math.imul(h, 33) ^ url.charCodeAt(i)) >>> 0;
  }
  return `child_${h.toString(16)}`;
}

function buildChildRowFromImage(img: SelectedImage, serial: number): ProductRow {
  const id = childRowIdForImageUrl(img.url);
  return {
    id,
    serial,
    parentSkus: [],
    parentItems: [],
    selectedParent: undefined,
    taggedImages: [img],
    plant: '',
    otherNames: '',
    variety: '',
    colour: '',
    height: '',
    size: '',
    type: '',
    description: '',
    setQuantity: 1,
    quantity: 1,
    potQuantity: 0,
    price: 0,
    inventory_quantity: 0,
    tags: [],
    compare_at_price: undefined,
    sort_order: 3000,
    hubParentChecks: [],
    hubs: [],
    seller: '',
    categories: [],
    collectionIds: [],
    features: [],
    redirects: [],
    seoTitle: '',
    seoDescription: '',
    tax: undefined,
    isValid: false,
    isSaved: false,
    validationErrors: { parent: 'Parent selection is required' },
  };
}

export function useListingState(section: ListingSection) {
  const childHubSelectSeqRef = useRef(0);

  const [state, setState] = useState<ListingState>({
    selectedImages: [],
    productRows: [],
    childContextHub: '',
    childImageCollectionFilter: '',
    childHubSellerId: '',
    availableParents: [],
    selectedParent: null,
    viewMode: 'product-table',
    validationErrors: {},
    isSaving: false,
    isLoading: false,
    listingMode: 'child',
    parentListPage: 0,
    parentListTotalPages: 0,
    parentListTotal: 0,
    parentListLimit: PARENT_LIST_PAGE_LIMIT,
    parentListLoading: false,
    parentSkuFilter: '',
    parentNameFilter: '',
  });

  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  });

  /** Skip one debounced parent-list reload after `setListingMode('parent')` or parent Clear (already loads explicitly). */
  const skipNextParentFilterEffectRef = useRef(false);

  const parentSkuFilter = state.parentSkuFilter;
  const parentNameFilter = state.parentNameFilter;

  /** Child rows removed by user — do not re-add until mode clear / Clear / new session */
  const skippedChildImageUrlsRef = useRef<Set<string>>(new Set());

  const [imageCollections, setImageCollections] = useState<ImageCollection[]>([]);
  const [allImages, setAllImages] = useState<SelectedImage[]>([]);

  // Load image collections (hide images already used on listed/published products in this section)
  const loadImageCollections = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const [listedRes, response] = await Promise.all([
        fetch(`/api/listing-product/listed-image-urls?section=${encodeURIComponent(section)}`),
        fetch('/api/image-collection?status=completed&limit=100'),
      ]);
      const listedJson = await listedRes.json().catch(() => ({}));
      const listedUrlKeys = new Set<string>(
        listedJson.success && Array.isArray(listedJson.urls)
          ? listedJson.urls.map((u: string) => normalizeListingImageUrlForMatch(String(u)))
          : []
      );

      const result = await response.json();
      if (result.success) {
        // Transform collections to include individual images
        const collectionsWithImages = await Promise.all(
          result.data.map(async (collection: any) => {
            try {
              const detailResponse = await fetch(`/api/image-collection/${collection._id}?excludeListed=true`);
              const detailResult = await detailResponse.json();
              if (detailResult.success && detailResult.data.images) {
                const images = (detailResult.data.images as ImageItem[]).filter((image) => {
                  const key = normalizeListingImageUrlForMatch(image.url);
                  return key && !listedUrlKeys.has(key);
                });
                return {
                  ...collection,
                  images,
                  imageCount: images.length,
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
  }, [section]);

  /**
   * Child listing: pass `hub` so the API returns only parent-type listings for that hub.
   * Parent listing mode: omit `hub` (full section list; child UI is not used).
   */
  const loadAvailableParents = useCallback(
    async (opts?: { hub?: string }) => {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const params = new URLSearchParams({
          section,
          limit: '1000',
        });
        const hub = opts?.hub?.trim();
        if (hub) params.set('hub', hub);
        const response = await fetch(`/api/listing-product/for-parent-picker?${params}`);
        const result = await response.json();
        if (result.success) {
          const data = ((result.data || []) as ListingSourcedParentOption[]).map((o) => ({
            ...o,
            listingHub: o.listingHub ?? '',
          }));
          setState((prev) => ({
            ...prev,
            availableParents: data,
            isLoading: false,
          }));
        } else {
          toast.error(result.message || 'Failed to load parents from listings');
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Failed to load listing parents:', error);
        toast.error('Failed to load parents from listings');
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [section]
  );

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
        hubParentChecks: [],
        hubs: [],
        seller: parent.seller || '',
        categories: parent.categories || [],
        collectionIds: parent.collectionIds?.map(id => String(id)) || [],
        features: String(parent.features || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        redirects: splitRedirectFormValues(String(parent.redirects || '')).slice(0, 1),
        seoTitle:
          parent.SEO?.title?.trim() || buildDefaultSeoTitle(displayNameForParentSeo(parent)),
        seoDescription:
          parent.SEO?.description?.trim() ||
          buildDefaultSeoDescription(displayNameForParentSeo(parent)),
        tax:
          parent.tax != null && String(parent.tax).trim() !== ''
            ? Number(parent.tax)
            : undefined,
        
        // Status (validation runs in effect and will set correct isValid)
        isValid: false,
        isSaved: false,
        validationErrors: {},
      };
    },
    [calculatePriceAndInventory, generateParentItemId, generateRowId]
  );

  const loadParentListingPage = useCallback(
    async (
      page: number,
      append: boolean,
      filterOverride?: { parentSkuFilter?: string; parentNameFilter?: string }
    ) => {
      const skuQ = String(filterOverride?.parentSkuFilter ?? parentSkuFilter).trim();
      const nameQ = String(filterOverride?.parentNameFilter ?? parentNameFilter).trim();
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PARENT_LIST_PAGE_LIMIT),
        sortField: 'plant',
        sortOrder: 'asc',
        baseParentsOnly: 'true',
      });
      if (skuQ) params.set('parentSku', skuQ);
      if (nameQ) params.set('nameSearch', nameQ);

      setState((prev) => ({ ...prev, parentListLoading: true }));
      try {
        const response = await fetch(`/api/parent-master?${params.toString()}`);
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || 'Failed to load parents');
        }
        const items = result.data as ParentMaster[];
        const { total, totalPages, limit } = result.pagination as {
          total: number;
          totalPages: number;
          limit: number;
        };

        setState((prev) => {
          if (prev.listingMode !== 'parent') {
            return { ...prev, parentListLoading: false };
          }
          const existingIds = new Set(prev.productRows.map((r) => r.id));
          const sourceItems = append
            ? items.filter((p) => p._id && !existingIds.has(`parent_${String(p._id)}`))
            : items.filter((p) => p._id);
          const maxSerial =
            append && prev.productRows.length > 0
              ? Math.max(...prev.productRows.map((r) => r.serial || 0))
              : 0;
          const newRows: ProductRow[] = sourceItems.map((parent, idx) => {
            const serial = maxSerial + idx + 1;
            const base = createProductRowFromParent(parent, [], serial);
            return {
              ...base,
              id: `parent_${String(parent._id)}`,
              serial,
            };
          });
          return {
            ...prev,
            productRows: append ? [...prev.productRows, ...newRows] : newRows,
            parentListPage: page,
            parentListTotalPages: totalPages,
            parentListTotal: total,
            parentListLimit: limit,
            parentListLoading: false,
          };
        });
      } catch (error) {
        console.error('Failed to load parent listing page:', error);
        toast.error('Failed to load parent products');
        setState((prev) => ({ ...prev, parentListLoading: false }));
      }
    },
    [createProductRowFromParent, parentSkuFilter, parentNameFilter]
  );

  const setParentListingSkuFilter = useCallback((value: string) => {
    setState((prev) => ({ ...prev, parentSkuFilter: value }));
  }, []);

  const setParentListingNameFilter = useCallback((value: string) => {
    setState((prev) => ({ ...prev, parentNameFilter: value }));
  }, []);

  const setListingMode = useCallback(
    (mode: ListingScreenMode) => {
      if (mode === 'parent') {
        skipNextParentFilterEffectRef.current = true;
        setState((prev) => ({
          ...prev,
          listingMode: 'parent',
          productRows: [],
          parentListPage: 0,
          parentListTotalPages: 0,
          parentListTotal: 0,
        }));
        void loadParentListingPage(1, false);
      } else {
        skippedChildImageUrlsRef.current.clear();
        setState((prev) => ({
          ...prev,
          listingMode: 'child',
          childContextHub: '',
          childHubSellerId: '',
          productRows: [],
          parentListPage: 0,
          parentListTotalPages: 0,
          parentListTotal: 0,
        }));
      }
    },
    [loadParentListingPage]
  );

  const loadMoreParentListingPage = useCallback(async () => {
    const { listingMode, parentListPage, parentListTotalPages } = stateRef.current;
    if (listingMode !== 'parent' || parentListPage >= parentListTotalPages || parentListTotalPages < 1) {
      return;
    }
    await loadParentListingPage(parentListPage + 1, true);
  }, [loadParentListingPage]);

  const refreshParentInRows = useCallback(async (parentId: string) => {
    try {
      const response = await fetch(`/api/parent-master/${parentId}`);
      const result = await response.json();
      if (!result.success || !result.data) return;
      const p = result.data as ParentMaster;
      setState((prev) => ({
        ...prev,
        productRows: prev.productRows.map((row) => {
          const first = row.parentItems[0];
          const pid = first?.parent?._id;
          if (!pid || String(pid) !== String(parentId)) return row;
          const nextItems = row.parentItems.map((item) =>
            item.parent && String(item.parent._id) === String(parentId)
              ? { ...item, parent: p, parentSku: String(p.sku || item.parentSku) }
              : item
          );
          const firstStillThisParent = String(nextItems[0]?.parent?._id) === String(parentId);
          return {
            ...row,
            parentItems: nextItems,
            ...(prev.listingMode === 'child' && firstStillThisParent
              ? { compare_at_price: compareAtFromFirstParentLine(nextItems) }
              : {}),
          };
        }),
        availableParents: prev.availableParents.map((opt) =>
          opt.parent._id && String(opt.parent._id) === String(parentId)
            ? { ...opt, parent: { ...opt.parent, ...p } }
            : opt
        ),
      }));
    } catch (e) {
      console.error('refreshParentInRows', e);
    }
  }, []);

  const uploadParentPhotoAndRefresh = useCallback(
    async (rowId: string, file: File) => {
      const row = state.productRows.find((r) => r.id === rowId);
      const parentId = row?.parentItems[0]?.parent?._id;
      if (!parentId) {
        toast.error('No parent selected');
        return;
      }
      const formData = new FormData();
      formData.append('images', file);
      const up = await fetch('/api/upload', { method: 'POST', body: formData });
      const upJson = await up.json();
      if (!upJson.success || !upJson.urls?.length) {
        toast.error(upJson.message || 'Upload failed');
        return;
      }
      const existing = row.parentItems[0]?.parent?.images ?? [];
      const nextImages = [...existing.map(String), ...upJson.urls];
      const put = await fetch(`/api/parent-master/${parentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: nextImages }),
      });
      const putJson = await put.json();
      if (!putJson.success) {
        toast.error(putJson.message || 'Failed to update parent');
        return;
      }
      await refreshParentInRows(String(parentId));
      toast.success('Photo added to parent');
    },
    [state.productRows, refreshParentInRows]
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

  // Add empty product row (child listing mode only)
  const addEmptyProductRow = useCallback(() => {
    if (stateRef.current.listingMode === 'parent') {
      toast.error('Use Child listing to add a custom row');
      return;
    }
    if (!stateRef.current.childContextHub?.trim()) {
      toast.error('Select a listing hub first');
      return;
    }
    const ctxHub = stateRef.current.childContextHub.trim();
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
        hubParentChecks: [],
        hubs: [ctxHub],
        seller: prev.childHubSellerId || '',
        sellersByHub:
          ctxHub && prev.childHubSellerId ? { [ctxHub]: prev.childHubSellerId } : {},
        categories: [],
        collectionIds: [],
        features: [],
        redirects: [],
        seoTitle: '',
        seoDescription: '',
        tax: undefined,
        
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

  const setChildImageCollectionFilter = useCallback((collectionId: string) => {
    const id = String(collectionId ?? '').trim();
    setState((prev) => ({ ...prev, childImageCollectionFilter: id }));
  }, []);

  /** Child listing: change global hub filter; clears parent composition on every row (new hub = new picker scope). */
  const setChildContextHub = useCallback((hub: string) => {
    const h = String(hub ?? '').trim();
    const seq = ++childHubSelectSeqRef.current;
    setState((prev) => ({
      ...prev,
      childContextHub: h,
      childHubSellerId: '',
      ...(h ? {} : { childImageCollectionFilter: '' }),
      productRows: prev.productRows.map((row) => ({
        ...row,
        parentItems: [],
        parentSkus: [],
        plant: '',
        otherNames: '',
        variety: '',
        colour: '',
        height: '',
        size: '',
        type: '',
        description: '',
        categories: [],
        collectionIds: [],
        features: [],
        redirects: [],
        seoTitle: '',
        seoDescription: '',
        tax: undefined,
        price: 0,
        inventory_quantity: 0,
        setQuantity: 1,
        quantity: 1,
        hubParentChecks: [],
        hubs: h ? [h] : [],
        seller: '',
        sellersByHub: {},
        isSaved: false,
        validationErrors: { parent: 'Parent selection is required' },
      })),
    }));

    void (async () => {
      if (!h) return;
      const sellerId = await fetchSellerIdForHub(h);
      if (seq !== childHubSelectSeqRef.current) return;
      if (!sellerId) {
        toast.error(
          'No Seller Master row found for this hub’s substores. Add seller_id matching a substore code from hub mappings.',
          { duration: 6500 }
        );
        return;
      }
      setState((prev) => ({
        ...prev,
        childHubSellerId: sellerId,
        productRows: prev.productRows.map((row) => ({
          ...row,
          seller: sellerId,
          sellersByHub: { ...(row.sellersByHub ?? {}), [h]: sellerId },
        })),
      }));
    })();
  }, []);

  // Update product row
  const updateProductRow = useCallback((rowId: string, updates: Partial<ProductRow>) => {
    const mode = stateRef.current.listingMode;
    const row = stateRef.current.productRows.find((r) => r.id === rowId);

    if (mode === 'child' && updates.hubs && row) {
      const newHubs = updates.hubs;
      const prevMap = { ...(row.sellersByHub ?? {}) };
      const pruned: Record<string, string> = {};
      for (const hub of newHubs) {
        if (prevMap[hub]) pruned[hub] = prevMap[hub];
      }
      setState((prev) => ({
        ...prev,
        productRows: prev.productRows.map((r) =>
          r.id === rowId
            ? {
                ...r,
                ...updates,
                sellersByHub: pruned,
                seller: newHubs.length === 1 ? pruned[newHubs[0]] ?? r.seller : r.seller,
                isSaved: false,
              }
            : r
        ),
      }));

      const hubsKey = [...newHubs].sort().join('\0');
      void (async () => {
        const additions = { ...pruned };
        for (const hub of newHubs) {
          if (additions[hub]) continue;
          const sid = await fetchSellerIdForHub(hub);
          if (sid) additions[hub] = sid;
        }
        setState((prev) => ({
          ...prev,
          productRows: prev.productRows.map((r) => {
            if (r.id !== rowId) return r;
            const hubsNow = r.hubs ?? [];
            if ([...hubsNow].sort().join('\0') !== hubsKey) return r;
            return {
              ...r,
              sellersByHub: { ...additions },
              seller: hubsNow.length === 1 ? additions[hubsNow[0]] ?? '' : r.seller,
              isSaved: false,
            };
          }),
        }));
      })();
      return;
    }

    setState((prev) => ({
      ...prev,
      productRows: prev.productRows.map((r) =>
        r.id === rowId ? { ...r, ...updates, isSaved: false } : r
      ),
    }));
  }, []);

  // Remove product row
  const removeProductRow = useCallback((rowId: string) => {
    const currentRows = stateRef.current.productRows;
    const rowToRemove = currentRows.find((row) => row.id === rowId);
    const nextRows = currentRows.filter((row) => row.id !== rowId);

    if (
      stateRef.current.listingMode === 'child' &&
      rowId.startsWith('child_') &&
      rowToRemove?.taggedImages?.[0]?.url
    ) {
      skippedChildImageUrlsRef.current.add(rowToRemove.taggedImages[0].url);
    }

    setState((prev) => ({
      ...prev,
      productRows: prev.productRows.filter((row) => row.id !== rowId),
    }));

    setAllImages((prev) =>
      prev.map((img) => {
        const wasTagged = rowToRemove?.taggedImages?.some((t) => t.url === img.url);
        if (!wasTagged) return img;
        const isTaggedElsewhere = nextRows.some((r) =>
          r.taggedImages?.some((t) => t.url === img.url)
        );
        return { ...img, isTagged: isTaggedElsewhere };
      })
    );
  }, []);

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
    setState((prev) => {
      const listingMode = prev.listingMode;
      const validatedRows = prev.productRows.map((row) => {
        const imageUrls = getListingImageUrlsForRow(row, listingMode, allImages);
        const passedHubsChild =
          listingMode === 'child'
            ? passedHubsForChildListingFromPicker(row.hubs ?? [], row.parentItems)
            : [];
        const hubForForm =
          listingMode === 'child'
            ? passedHubsChild[0] ?? (row.hubs ?? [])[0] ?? ''
            : (row.hubs ?? [])[0] ?? '';

        const formData = {
          listingType: listingMode,
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
          hub: hubForForm,
          seller: row.seller,
          categories: row.categories,
          collectionIds: row.collectionIds,
          images: imageUrls,
          status: newListingStatusOnSave(listingMode),
        };

        const selectedParents = row.parentItems
          .map((item) => item.parent)
          .filter(Boolean) as ParentMaster[];
        const { errors } = validateStep('review', formData as any, selectedParents, section);

        if (listingMode === 'child') {
          if (!prev.childContextHub?.trim()) {
            errors.contextHub = 'Select the listing hub filter above';
          }
          if ((row.hubs ?? []).length === 0) {
            errors.hub = 'At least one hub is required';
          }
          if (
            row.parentSkus.length > 0 &&
            (row.hubs ?? []).length > 0 &&
            passedHubsChild.length === 0
          ) {
            errors.hubParentSku =
              'Complete parent selection for each line for the selected hub(s).';
          }
          const isValid =
            Object.keys(errors).length === 0 &&
            row.parentSkus.length > 0 &&
            passedHubsChild.length > 0;
          return {
            ...row,
            isValid,
            validationErrors: errors,
          };
        }

        if ((row.hubs ?? []).length === 0) errors.hub = 'At least one hub is required';
        const isValid = Object.keys(errors).length === 0 && row.parentSkus.length > 0;

        return {
          ...row,
          isValid,
          validationErrors: errors,
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
      const listingMode = stateRef.current.listingMode;

      // Run validation synchronously first (must match validateAllRows rules)
      validatedRows = state.productRows.map((row) => {
        const imageUrls = getListingImageUrlsForRow(row, listingMode, allImages);
        const passedHubsChild =
          listingMode === 'child'
            ? passedHubsForChildListingFromPicker(row.hubs ?? [], row.parentItems)
            : [];
        const hubForForm =
          listingMode === 'child'
            ? passedHubsChild[0] ?? (row.hubs ?? [])[0] ?? ''
            : (row.hubs ?? [])[0] ?? '';

        const formData = {
          listingType: listingMode,
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
          quantity: listingMode === 'parent' ? 1 : row.setQuantity,
          price: row.price,
          inventory_quantity: row.inventory_quantity,
          hub: hubForForm,
          seller: row.seller,
          categories: row.categories,
          collectionIds: row.collectionIds,
          images: imageUrls,
          status: newListingStatusOnSave(listingMode),
        };

        const selectedParents = row.parentItems
          .map((item) => item.parent)
          .filter(Boolean) as ParentMaster[];
        const { errors } = validateStep('review', formData as any, selectedParents, section);

        let isValid: boolean;
        const ctxHub = stateRef.current.childContextHub;
        if (listingMode === 'child') {
          if (!ctxHub?.trim()) {
            errors.contextHub = 'Select the listing hub filter above';
          }
          if ((row.hubs ?? []).length === 0) errors.hub = 'At least one hub is required';
          if (
            row.parentSkus.length > 0 &&
            (row.hubs ?? []).length > 0 &&
            passedHubsChild.length === 0
          ) {
            errors.hubParentSku =
              'Complete parent selection for each line for the selected hub(s).';
          }
          isValid =
            Object.keys(errors).length === 0 &&
            row.parentSkus.length > 0 &&
            passedHubsChild.length > 0;
        } else {
          if ((row.hubs ?? []).length === 0) errors.hub = 'At least one hub is required';
          isValid = Object.keys(errors).length === 0 && row.parentSkus.length > 0;
        }

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
          validationErrors: errors,
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

      // Transform rows to API format — expand each row into one payload per hub (child: only hubs that passed SKU checks)
      const hubSkipMessages: string[] = [];
      const productsToCreate = validRows.flatMap((row) => {
        const rowImageUrls = getListingImageUrlsForRow(row, listingMode, allImages);
        const qty = listingMode === 'parent' ? 1 : row.setQuantity;
        const basePayload = {
          listingType: listingMode,
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
          setQuantity: listingMode === 'parent' ? 1 : row.setQuantity,
          potQuantity: row.potQuantity,
          quantity: qty,
          price: row.price,
          inventory_quantity: row.inventory_quantity,
          tags: row.tags?.length ? row.tags : undefined,
          compare_at_price: row.compare_at_price ?? undefined,
          sort_order: row.sort_order ?? 3000,
          publish_status: (row.inventory_quantity ?? 0) > 0 ? 1 : 0,
          tax: row.tax === 5 || row.tax === 18 ? row.tax : undefined,
          seller: row.seller,
          categories: row.categories,
          collectionIds: row.collectionIds,
          features: row.features?.length ? row.features : undefined,
          redirects: row.redirects?.length ? redirectsArrayToUrlArray(row.redirects) : undefined,
          ...(row.seoTitle?.trim() || row.seoDescription?.trim()
            ? {
                SEO: {
                  title: row.seoTitle?.trim() || '',
                  description: row.seoDescription?.trim() || '',
                },
              }
            : {}),
          images: rowImageUrls,
          status: newListingStatusOnSave(listingMode),
        };
        if (listingMode === 'child') {
          const passed = passedHubsForChildListingFromPicker(row.hubs ?? [], row.parentItems);
          const skipped = (row.hubs ?? []).filter((h) => !passed.includes(h));
          if (skipped.length > 0) {
            hubSkipMessages.push(`Row ${row.serial}: not saved for ${skipped.join(', ')} (incomplete parent selection)`);
          }
          return passed.map((hub) => ({
            ...basePayload,
            hub,
            seller: row.sellersByHub?.[hub] ?? row.seller,
          }));
        }
        return (row.hubs ?? []).map((hub) => ({ ...basePayload, hub }));
      });

      if (productsToCreate.length === 0) {
        toast.error('Nothing to create — check validation and hub parent SKU checks.');
        setState((prev) => ({ ...prev, isSaving: false }));
        return undefined;
      }

      // Bulk create
      const response = await fetch('/api/listing-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productsToCreate),
      });

      const result = await response.json();
      
      if (result.success) {
        setState((prev) => ({
          ...prev,
          productRows: prev.productRows.map((row) =>
            validRows.some((validRow) => validRow.id === row.id) ? { ...row, isSaved: true } : row
          ),
          isSaving: false,
        }));

        if (hubSkipMessages.length > 0) {
          toast(hubSkipMessages.join(' · '), { duration: 8000, icon: '⚠️' });
        }
        toast.success(
          `Successfully created ${productsToCreate.length} listing product(s)${
            hubSkipMessages.length ? ' (some hubs skipped)' : ''
          }`
        );
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

    const listingMode = stateRef.current.listingMode;
    const imageUrls = getListingImageUrlsForRow(row, listingMode, allImages);
    const passedHubsChild =
      listingMode === 'child'
        ? passedHubsForChildListingFromPicker(row.hubs ?? [], row.parentItems)
        : [];
    const hubForForm =
      listingMode === 'child'
        ? passedHubsChild[0] ?? (row.hubs ?? [])[0] ?? ''
        : (row.hubs ?? [])[0] ?? '';

    const formData = {
      listingType: listingMode,
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
      quantity: listingMode === 'parent' ? 1 : row.setQuantity,
      price: row.price,
      inventory_quantity: row.inventory_quantity,
      hub: hubForForm,
      seller: row.seller,
      categories: row.categories,
      collectionIds: row.collectionIds,
      images: imageUrls,
      status: newListingStatusOnSave(listingMode),
    };
    const selectedParents = row.parentItems.map((item) => item.parent).filter(Boolean) as ParentMaster[];
    const { errors } = validateStep('review', formData as any, selectedParents, section);

    let isValid: boolean;
    if (listingMode === 'child') {
      if (!stateRef.current.childContextHub?.trim()) {
        errors.contextHub = 'Select the listing hub filter above';
      }
      if ((row.hubs ?? []).length === 0) errors.hub = 'At least one hub is required';
      if (
        row.parentSkus.length > 0 &&
        (row.hubs ?? []).length > 0 &&
        passedHubsChild.length === 0
      ) {
        errors.hubParentSku =
          'Complete parent selection for each line for the selected hub(s).';
      }
      isValid =
        Object.keys(errors).length === 0 &&
        row.parentSkus.length > 0 &&
        passedHubsChild.length > 0;
    } else {
      if ((row.hubs ?? []).length === 0) errors.hub = 'At least one hub is required';
      isValid = Object.keys(errors).length === 0 && row.parentSkus.length > 0;
    }

    if (!isValid) {
      toast.error(Object.values(errors).filter(Boolean)[0] || 'Please complete required fields');
      return false;
    }

    setState((prev) => ({ ...prev, isSaving: true }));
    try {
      const qty = listingMode === 'parent' ? 1 : row.setQuantity;
      const basePayload = {
        listingType: listingMode,
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
        setQuantity: listingMode === 'parent' ? 1 : row.setQuantity,
        potQuantity: row.potQuantity,
        quantity: qty,
        price: row.price,
        inventory_quantity: row.inventory_quantity,
        tags: row.tags?.length ? row.tags : undefined,
        compare_at_price: row.compare_at_price ?? undefined,
        sort_order: row.sort_order ?? 3000,
        publish_status: (row.inventory_quantity ?? 0) > 0 ? 1 : 0,
        tax: row.tax === 5 || row.tax === 18 ? row.tax : undefined,
        seller: row.seller,
        categories: row.categories,
        collectionIds: row.collectionIds,
        features: row.features?.length ? row.features : undefined,
        redirects: row.redirects?.length ? redirectsArrayToUrlArray(row.redirects) : undefined,
        ...(row.seoTitle?.trim() || row.seoDescription?.trim()
          ? {
              SEO: {
                title: row.seoTitle?.trim() || '',
                description: row.seoDescription?.trim() || '',
              },
            }
          : {}),
        images: imageUrls,
        status: newListingStatusOnSave(listingMode),
      };
      const hubsToSave = listingMode === 'child' ? passedHubsChild : row.hubs ?? [];
      const skipped =
        listingMode === 'child'
          ? (row.hubs ?? []).filter((h) => !hubsToSave.includes(h))
          : [];
      if (skipped.length > 0) {
        toast(`Not saving for: ${skipped.join(', ')} (parent SKU missing in listings)`, {
          duration: 6000,
          icon: '⚠️',
        });
      }
      const payloads =
        listingMode === 'child'
          ? hubsToSave.map((hub) => ({
              ...basePayload,
              hub,
              seller: row.sellersByHub?.[hub] ?? row.seller,
            }))
          : hubsToSave.map((hub) => ({ ...basePayload, hub }));
      if (payloads.length === 0) {
        toast.error('No hubs to save');
        setState((prev) => ({ ...prev, isSaving: false }));
        return false;
      }
      const response = await fetch('/api/listing-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloads.length === 1 ? payloads[0] : payloads),
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

  // Parent listing: debounced reload when SKU / name filters change
  useEffect(() => {
    if (state.listingMode !== 'parent') return;
    if (skipNextParentFilterEffectRef.current) {
      skipNextParentFilterEffectRef.current = false;
      return;
    }
    const handle = setTimeout(() => {
      void loadParentListingPage(1, false);
    }, 300);
    return () => clearTimeout(handle);
  }, [state.listingMode, state.parentSkuFilter, state.parentNameFilter, loadParentListingPage]);

  // Clear all data (child: empty rows; parent: reload first page)
  const clearAll = useCallback(() => {
    const mode = stateRef.current.listingMode;
    if (mode === 'parent') {
      skipNextParentFilterEffectRef.current = true;
      setState((prev) => ({
        ...prev,
        parentSkuFilter: '',
        parentNameFilter: '',
      }));
      void loadParentListingPage(1, false, { parentSkuFilter: '', parentNameFilter: '' });
      return;
    }
    skippedChildImageUrlsRef.current.clear();
    setState((prev) => ({
      ...prev,
      selectedImages: [],
      productRows: [],
      ...(mode === 'child'
        ? { childContextHub: '', childHubSellerId: '', childImageCollectionFilter: '' }
        : {}),
    }));

    // Reset all images to untagged
    setAllImages(prev => prev.map(img => ({ ...img, isTagged: false })));
  }, [loadParentListingPage]);

  // Re-validate rows when row content or images change (keeps UI "Valid" in sync with save validation)
  const prevValidationInputRef = useRef<string>('');
  useEffect(() => {
    if (state.productRows.length === 0) return;
    const signature = JSON.stringify({
      listingMode: state.listingMode,
      childContextHub: state.childContextHub,
      rows: state.productRows.map(r => ({
        id: r.id,
        serial: r.serial,
        parentSkus: r.parentSkus,
        parentItems: r.parentItems,
        plant: r.plant,
        hubs: r.hubs,
        seller: r.seller,
        sellersByHub: r.sellersByHub,
        categories: r.categories,
        setQuantity: r.setQuantity,
        price: r.price,
        inventory_quantity: r.inventory_quantity,
        taggedUrls: (r.taggedImages ?? []).map((i) => i.url),
      })),
      images: allImages.map(img => ({ serial: img.serial, url: img.url })),
    });
    if (signature === prevValidationInputRef.current) return;
    prevValidationInputRef.current = signature;
    validateAllRows();
  }, [state.productRows, state.listingMode, state.childContextHub, state.childHubSellerId, allImages, validateAllRows]);

  // Load data on mount
  useEffect(() => {
    void loadImageCollections();
  }, [loadImageCollections]);

  /** Child: parent picker options = listed parents for the selected hub only. Parent mode: load full section list. */
  useEffect(() => {
    if (state.listingMode === 'child') {
      const h = state.childContextHub?.trim();
      if (!h) {
        setState((prev) =>
          prev.availableParents.length === 0 ? prev : { ...prev, availableParents: [] }
        );
        return;
      }
      void loadAvailableParents({ hub: h });
      return;
    }
    void loadAvailableParents();
  }, [section, state.listingMode, state.childContextHub, loadAvailableParents]);

  // Child listing: one row per photo from completed image collections (exclude listed + user-skipped).
  // Photo rows are hidden until a global hub filter is selected (`childContextHub`).
  useEffect(() => {
    if (state.listingMode !== 'child') return;

    setState((prev) => {
      if (prev.listingMode !== 'child') return prev;

      const manualRows = prev.productRows.filter((r) => !r.id.startsWith('child_'));

      if (!prev.childContextHub?.trim()) {
        let serial = 0;
        const nextManualOnly = manualRows.map((r) => ({ ...r, serial: ++serial }));
        if (
          prev.productRows.length === nextManualOnly.length &&
          prev.productRows.every(
            (r, i) =>
              r.id === nextManualOnly[i]?.id &&
              r.serial === nextManualOnly[i]?.serial &&
              r.parentSkus.join(',') === nextManualOnly[i]?.parentSkus.join(',')
          )
        ) {
          return prev;
        }
        return { ...prev, productRows: nextManualOnly };
      }

      const skipped = skippedChildImageUrlsRef.current;
      const collectionFilter = prev.childImageCollectionFilter?.trim() ?? '';
      const imgs = allImages.filter((img) => {
        if (skipped.has(img.url)) return false;
        if (collectionFilter && String(img.collectionId) !== collectionFilter) return false;
        return true;
      });
      const hub = prev.childContextHub.trim();

      const imageRows: ProductRow[] = imgs.map((img, idx) => {
        const id = childRowIdForImageUrl(img.url);
        const existing =
          prev.productRows.find((r) => r.id === id) ??
          prev.productRows.find((r) => r.taggedImages?.[0]?.url === img.url);
        if (existing) {
          const hubsForRow = (existing.hubs ?? []).length > 0 ? existing.hubs : hub ? [hub] : [];
          const ctxSid = prev.childHubSellerId || '';
          const nextSellersByHub = { ...(existing.sellersByHub ?? {}) };
          if (ctxSid && hub && hubsForRow.length === 1 && hubsForRow[0] === hub) {
            nextSellersByHub[hub] = ctxSid;
          }
          const nextSeller =
            hubsForRow.length === 1
              ? (nextSellersByHub[hubsForRow[0]] ?? ctxSid) || existing.seller
              : existing.seller;
          return {
            ...existing,
            id,
            serial: idx + 1,
            taggedImages: [img],
            hubs: hubsForRow,
            seller: nextSeller,
            sellersByHub: nextSellersByHub,
          };
        }
        return {
          ...buildChildRowFromImage(img, idx + 1),
          hubs: hub ? [hub] : [],
          seller: hub && prev.childHubSellerId ? prev.childHubSellerId : '',
          sellersByHub: hub && prev.childHubSellerId ? { [hub]: prev.childHubSellerId } : {},
        };
      });

      let serial = 0;
      const nextRows: ProductRow[] = [
        ...imageRows.map((r) => ({ ...r, serial: ++serial })),
        ...manualRows.map((r) => ({ ...r, serial: ++serial })),
      ];

      if (
        prev.productRows.length === nextRows.length &&
        prev.productRows.every(
          (r, i) =>
            r.id === nextRows[i]?.id &&
            r.serial === nextRows[i]?.serial &&
            r.taggedImages?.[0]?.url === nextRows[i]?.taggedImages?.[0]?.url &&
            r.plant === nextRows[i]?.plant &&
            r.parentSkus.join(',') === nextRows[i]?.parentSkus.join(',') &&
            r.seller === nextRows[i]?.seller &&
            JSON.stringify(r.sellersByHub ?? {}) === JSON.stringify(nextRows[i]?.sellersByHub ?? {})
        )
      ) {
        return prev;
      }

      return { ...prev, productRows: nextRows };
    });
  }, [
    allImages,
    state.listingMode,
    state.childContextHub,
    state.childHubSellerId,
    state.childImageCollectionFilter,
  ]);

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
      setListingMode,
      setChildContextHub,
      setChildImageCollectionFilter,
      loadMoreParentListingPage,
      refreshParentInRows,
      uploadParentPhotoAndRefresh,
      setParentListingSkuFilter,
      setParentListingNameFilter,
    }
  };
}
