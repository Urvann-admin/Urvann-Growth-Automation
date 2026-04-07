'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Filter, Hash, ChevronDown, GitBranch, Layers } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { ListingProduct, ListingSection } from '@/models/listingProduct';
import { ListingProductTable } from './ListingProductTable';
import { HUB_MAPPINGS } from '@/shared/constants/hubs';
import { ReplicateToHubsModal } from './ReplicateToHubsModal';

export interface ViewListingProductsProps {
  section: ListingSection;
}

export function ViewListingProducts({
  section,
}: ViewListingProductsProps) {
  const [products, setProducts] = useState<ListingProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  /** Matches final listing SKU or any parent line SKU (hub-prefixed or base). */
  const [skuSearch, setSkuSearch] = useState('');
  const [hubFilter, setHubFilter] = useState('all');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isSelectingAllFiltered, setIsSelectingAllFiltered] = useState(false);
  const [showReplicateModal, setShowReplicateModal] = useState(false);
  const [moveToRevivalLoading, setMoveToRevivalLoading] = useState(false);
  const [listingTab, setListingTab] = useState<'parent' | 'child'>('parent');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [parentTabTotal, setParentTabTotal] = useState(0);
  const [childTabTotal, setChildTabTotal] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const appendSharedFilters = useCallback(
    (params: URLSearchParams) => {
      if (searchTerm.trim()) params.set('name', searchTerm.trim());
      if (skuSearch.trim()) params.set('sku', skuSearch.trim());
      if (hubFilter !== 'all') params.set('hub', hubFilter);
    },
    [searchTerm, skuSearch, hubFilter]
  );

  const buildFilterParams = useCallback(
    (page: number, opts?: { idsOnly?: boolean; listingType?: 'parent' | 'child' }) => {
      const params = new URLSearchParams({
        section,
        page: String(page),
        limit: String(pagination.limit),
        sortField: 'createdAt',
        sortOrder: 'desc',
        listingType: opts?.listingType ?? listingTab,
      });
      if (opts?.idsOnly) params.set('idsOnly', 'true');
      appendSharedFilters(params);
      return params;
    },
    [section, listingTab, pagination.limit, appendSharedFilters]
  );

  const refreshTabTotals = useCallback(async () => {
    try {
      const parentParams = buildFilterParams(1, { listingType: 'parent' });
      parentParams.set('limit', '1');
      const childParams = buildFilterParams(1, { listingType: 'child' });
      childParams.set('limit', '1');
      const [rp, rc] = await Promise.all([
        fetch(`/api/listing-product?${parentParams}`).then((r) => r.json()),
        fetch(`/api/listing-product?${childParams}`).then((r) => r.json()),
      ]);
      if (rp.success) setParentTabTotal(rp.pagination?.total ?? 0);
      if (rc.success) setChildTabTotal(rc.pagination?.total ?? 0);
    } catch {
      /* ignore */
    }
  }, [buildFilterParams]);

  const fetchProducts = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = buildFilterParams(page);
        const response = await fetch(`/api/listing-product?${params}`);
        const result = await response.json();

        if (result.success) {
          setProducts(result.data || []);
          setPagination((prev) => ({
            ...prev,
            page,
            total: result.pagination?.total || 0,
            totalPages: result.pagination?.totalPages || 0,
          }));
        } else {
          toast.error(result.message || 'Failed to fetch listing products');
        }
      } catch (error) {
        console.error('Error fetching listing products:', error);
        toast.error('Failed to fetch listing products');
      } finally {
        setLoading(false);
      }
    },
    [buildFilterParams]
  );

  // Initial load and when filters / tab change
  useEffect(() => {
    setSelectedProductIds(new Set());
    void fetchProducts(1);
    void refreshTabTotals();
  }, [section, searchTerm, skuSearch, hubFilter, listingTab, fetchProducts, refreshTabTotals]);

  const handleToggleRow = (productId: string, checked: boolean) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(productId);
      else next.delete(productId);
      return next;
    });
  };

  const handleToggleVisible = async (checked: boolean) => {
    if (!checked) {
      const currentPageIds = new Set(products.map((p) => String(p._id)));
      setSelectedProductIds((prev) => {
        const next = new Set(prev);
        for (const id of currentPageIds) next.delete(id);
        return next;
      });
      return;
    }

    setIsSelectingAllFiltered(true);
    try {
      const params = buildFilterParams(1, { idsOnly: true });
      const response = await fetch(`/api/listing-product?${params}`);
      const result = await response.json();
      if (!result.success || !Array.isArray(result.data)) {
        toast.error(result.message || 'Failed to select filtered products');
        return;
      }
      setSelectedProductIds(new Set(result.data.map((id: unknown) => String(id))));
      toast.success(`Selected ${result.data.length} filtered products`);
    } catch (error) {
      console.error('Select all filtered error:', error);
      toast.error('Failed to select filtered products');
    } finally {
      setIsSelectingAllFiltered(false);
    }
  };

  // Handle delete
  const handleDelete = async (product: ListingProduct) => {
    if (!confirm(`Are you sure you want to delete "${product.finalName || product.plant}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/listing-product/${product._id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Product deleted successfully');
        fetchProducts(pagination.page);
      } else {
        toast.error(result.message || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    fetchProducts(newPage);
  };

  const handleMoveToRevival = async () => {
    if (selectedProductIds.size === 0) return;
    if (
      !confirm(
        `Move ${selectedProductIds.size} selected product(s) to Revival? They will leave the Listing tab and appear under Listing → Revival.`
      )
    ) {
      return;
    }
    setMoveToRevivalLoading(true);
    try {
      const response = await fetch('/api/listing-product/move-to-revival', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingProductIds: [...selectedProductIds] }),
      });
      const result = await response.json();
      if (result.moved > 0) {
        toast.success(result.message || `Moved ${result.moved} product(s) to Revival`);
      }
      if (Array.isArray(result.failed) && result.failed.length > 0) {
        for (const f of result.failed as { id: string; message: string }[]) {
          toast.error(f.message || `Failed for ${f.id}`);
        }
      } else if (!result.success && result.message) {
        toast.error(result.message);
      }
      setSelectedProductIds(new Set());
      await fetchProducts(pagination.page);
      await refreshTabTotals();
    } catch (e) {
      console.error('Move to revival failed:', e);
      toast.error('Failed to move to revival');
    } finally {
      setMoveToRevivalLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Stats widgets first */}
      <div className="grid grid-cols-1 sm:max-w-xs gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-base font-bold text-slate-900">{pagination.total}</div>
          <div className="text-[11px] text-slate-600">Total (this tab)</div>
        </div>
      </div>

      {/* Parent vs child listings */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="inline-flex rounded-xl border-2 border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => setListingTab('parent')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
              listingTab === 'parent'
                ? 'bg-white text-[#E6007A] shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <GitBranch className="h-3.5 w-3.5" />
            Parent listings
            <span className="text-[10px] font-medium tabular-nums opacity-80">({parentTabTotal})</span>
          </button>
          <button
            type="button"
            onClick={() => setListingTab('child')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
              listingTab === 'child'
                ? 'bg-white text-[#E6007A] shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Child listings
            <span className="text-[10px] font-medium tabular-nums opacity-80">({childTabTotal})</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-500 max-w-xl">
          {listingTab === 'parent'
            ? 'One base parent per row. Replicate to other hubs without requiring a parent listing there; new rows only need a unique listing SKU.'
            : 'Composed products: replication still requires matching parent-line listings in each target hub.'}
        </p>
      </div>

      {/* Search & filters (collapsible) */}
      <div className="rounded-xl border-2 border-slate-200 bg-gradient-to-b from-slate-50/80 to-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-stretch gap-2 sm:gap-3 border-b border-slate-200 bg-white/90">
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="flex flex-1 items-center gap-2 px-4 py-2.5 text-left min-w-0 hover:bg-slate-50/80 transition-colors"
            aria-expanded={filtersOpen}
          >
            <ChevronDown
              className={`h-4 w-4 text-slate-500 shrink-0 transition-transform ${filtersOpen ? '' : '-rotate-90'}`}
            />
            <Filter className="h-4 w-4 text-[#E6007A] shrink-0" />
            <h3 className="text-xs font-semibold text-slate-800 tracking-tight min-w-0">Search and filters</h3>
          </button>
          <div className="flex gap-2 px-4 pb-2 sm:pb-0 sm:pr-4 sm:items-center sm:justify-end shrink-0 border-t sm:border-t-0 border-slate-100">
            <button
              type="button"
              onClick={() => fetchProducts(pagination.page)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-2 border-slate-200 rounded-xl text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowReplicateModal(true)}
              disabled={selectedProductIds.size === 0 || isSelectingAllFiltered}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl text-white disabled:opacity-50 shadow-sm"
              style={{ backgroundColor: '#E6007A' }}
            >
              Replicate to hubs ({selectedProductIds.size})
            </button>
            {section === 'listing' && (
              <button
                type="button"
                onClick={() => void handleMoveToRevival()}
                disabled={
                  selectedProductIds.size === 0 || isSelectingAllFiltered || moveToRevivalLoading
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border-2 border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-50 disabled:opacity-50 shadow-sm"
              >
                {moveToRevivalLoading ? 'Moving…' : `Move to revival (${selectedProductIds.size})`}
              </button>
            )}
          </div>
        </div>
        {filtersOpen && (
          <div className="p-4 space-y-4 border-t border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="listed-product-name" className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <Search className="h-3.5 w-3.5 text-[#E6007A]" aria-hidden />
                  Product name
                </label>
                <input
                  id="listed-product-name"
                  type="text"
                  placeholder="Search by name…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E6007A] focus:ring-2 focus:ring-pink-100"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="listed-sku" className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <Hash className="h-3.5 w-3.5 text-[#E6007A]" aria-hidden />
                  SKU
                </label>
                <input
                  id="listed-sku"
                  type="text"
                  placeholder="Listing or parent line SKU…"
                  value={skuSearch}
                  onChange={(e) => setSkuSearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border-2 border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E6007A] focus:ring-2 focus:ring-pink-100"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap">
              <div className="space-y-1.5 sm:min-w-[11rem]">
                <label htmlFor="listed-hub" className="block text-xs font-semibold text-slate-800">
                  Hub
                </label>
                <select
                  id="listed-hub"
                  value={hubFilter}
                  onChange={(e) => setHubFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-[#E6007A] focus:ring-2 focus:ring-pink-100"
                >
                  <option value="all">All hubs</option>
                  {HUB_MAPPINGS.map((hub) => (
                    <option key={hub.hub} value={hub.hub}>
                      {hub.hub}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <ListingProductTable
        products={products}
        loading={loading}
        selectedIds={selectedProductIds}
        allVisibleSelected={products.length > 0 && products.every((p) => selectedProductIds.has(String(p._id)))}
        someVisibleSelected={products.some((p) => selectedProductIds.has(String(p._id))) && !products.every((p) => selectedProductIds.has(String(p._id)))}
        onToggleRow={handleToggleRow}
        onToggleVisible={handleToggleVisible}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-2.5 border border-slate-200 rounded-xl">
          <div className="text-xs text-slate-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = pagination.page - 2 + i;
              if (pageNum < 1 || pageNum > pagination.totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-2.5 py-1 text-xs border rounded-lg ${
                    pageNum === pagination.page
                      ? 'text-white border-transparent'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                  style={pageNum === pagination.page ? { backgroundColor: '#E6007A' } : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showReplicateModal && (
        <ReplicateToHubsModal
          section={section}
          selectedProductIds={[...selectedProductIds]}
          onClose={() => setShowReplicateModal(false)}
          onReplicated={() => fetchProducts(pagination.page)}
        />
      )}
    </div>
  );
}