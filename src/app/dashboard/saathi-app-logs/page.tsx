'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Building2, Package, CheckCircle, XCircle, Calendar, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';

interface Seller {
  seller: string;
  totalProducts: number;
  publishedProducts: number;
  withInventory: number;
}

interface Product {
  _id?: string;
  name: string;
  price: number;
  sku: string;
  publish: number;
  sort_order: number;
  inventory_quantity: number;
  substore: string;
  seller: string;
  updatedAt: Date | string;
  lastUpdatedBy: string;
  source: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  loaded: number;
}

export default function SaathiAppLogsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sellersPagination, setSellersPagination] = useState<Pagination>({
    page: 1,
    limit: 12,
    total: 0,
    hasMore: false,
    loaded: 0,
  });
  const [loadingMoreSellers, setLoadingMoreSellers] = useState(false);
  
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsPagination, setProductsPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    hasMore: false,
    loaded: 0,
  });
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sellersObserverRef = useRef<HTMLDivElement>(null);
  const productsObserverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    fetchSellers(1);
  }, [user, router]);

  const fetchSellers = async (page: number, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMoreSellers(true);
      } else {
        setLoading(true);
      }
      
      const response = await fetch(`/api/saathi-app-logs/sellers?page=${page}&limit=12`);
      const result = await response.json();
      
      if (result.success) {
        if (append) {
          setSellers(prev => [...prev, ...result.data]);
        } else {
          setSellers(result.data);
        }
        setSellersPagination(result.pagination);
      } else {
        setError('Failed to load sellers');
      }
    } catch (err: any) {
      console.error('Error fetching sellers:', err);
      setError('Failed to load sellers');
    } finally {
      setLoading(false);
      setLoadingMoreSellers(false);
    }
  };

  const loadMoreSellers = useCallback(() => {
    if (sellersPagination.hasMore && !loadingMoreSellers) {
      fetchSellers(sellersPagination.page + 1, true);
    }
  }, [sellersPagination, loadingMoreSellers]);

  const handleSellerClick = async (seller: string) => {
    setSelectedSeller(seller);
    setProducts([]);
    setProductsPagination({
      page: 1,
      limit: 50,
      total: 0,
      hasMore: false,
      loaded: 0,
    });
    fetchProducts(seller, 1);
  };

  const fetchProducts = async (seller: string, page: number, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMoreProducts(true);
      } else {
        setLoadingProducts(true);
      }
      setError(null);

      const response = await fetch(
        `/api/saathi-app-logs/products?seller=${encodeURIComponent(seller)}&page=${page}&limit=50`
      );
      const result = await response.json();
      
      if (result.success) {
        if (append) {
          setProducts(prev => [...prev, ...result.data]);
        } else {
          setProducts(result.data);
        }
        setProductsPagination(result.pagination);
      } else {
        setError('Failed to load products');
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    } finally {
      setLoadingProducts(false);
      setLoadingMoreProducts(false);
    }
  };

  const loadMoreProducts = useCallback(() => {
    if (productsPagination.hasMore && !loadingMoreProducts && selectedSeller) {
      fetchProducts(selectedSeller, productsPagination.page + 1, true);
    }
  }, [productsPagination, loadingMoreProducts, selectedSeller]);

  const handleBack = () => {
    setSelectedSeller(null);
    setProducts([]);
    setProductsPagination({
      page: 1,
      limit: 50,
      total: 0,
      hasMore: false,
      loaded: 0,
    });
    setError(null);
  };

  const handleRefresh = async () => {
    if (selectedSeller) {
      // Refresh products for selected seller
      setProducts([]);
      setProductsPagination({
        page: 1,
        limit: 50,
        total: 0,
        hasMore: false,
        loaded: 0,
      });
      await fetchProducts(selectedSeller, 1);
    } else {
      // Refresh sellers list
      setSellers([]);
      setSellersPagination({
        page: 1,
        limit: 12,
        total: 0,
        hasMore: false,
        loaded: 0,
      });
      await fetchSellers(1);
    }
  };

  // Intersection Observer for sellers infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && sellersPagination.hasMore && !loadingMoreSellers) {
          loadMoreSellers();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = sellersObserverRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [loadMoreSellers, sellersPagination.hasMore, loadingMoreSellers]);

  // Intersection Observer for products infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && productsPagination.hasMore && !loadingMoreProducts) {
          loadMoreProducts();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = productsObserverRef.current;
    if (currentRef && selectedSeller) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [loadMoreProducts, productsPagination.hasMore, loadingMoreProducts, selectedSeller]);

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {selectedSeller && (
                <button
                  onClick={handleBack}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
              )}
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-sm">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  {selectedSeller ? `${selectedSeller} - Products` : 'Saathi App Logs'}
                </h1>
                <p className="text-xs text-slate-500">
                  {selectedSeller ? 'Product inventory details' : 'View sellers and their products'}
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading || loadingProducts || loadingMoreSellers || loadingMoreProducts}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${(loading || loadingProducts || loadingMoreSellers || loadingMoreProducts) ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-6">
        {error && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-slate-600 text-sm">Loading sellers...</p>
            </div>
          </div>
        ) : selectedSeller ? (
          // Products List View
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {productsPagination.loaded} of {productsPagination.total} Products
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Seller: {selectedSeller}</p>
                </div>
              </div>
            </div>

            {loadingProducts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                <p>No products found for this seller</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">
                        Product Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wide">
                        Price
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wide">
                        Publish
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wide">
                        Inventory
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">
                        Last Updated
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">
                        Updated By
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">
                        Source
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">
                        Substore
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {products.map((product) => (
                      <tr key={product._id || product.sku} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-slate-900 max-w-md">
                            {product.name}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                            {product.sku}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-slate-900">
                            ₹{product.price.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {product.publish === 1 ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                              <XCircle className="w-3 h-3 mr-1" />
                              Unpublished
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            product.inventory_quantity > 0
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {product.inventory_quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center text-xs text-slate-600">
                            <Calendar className="w-3 h-3 mr-1.5 text-slate-400" />
                            {formatDate(product.updatedAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-700 font-medium">
                            {product.lastUpdatedBy || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                            {product.source || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-600 capitalize">
                            {product.substore}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Products Load More */}
            {products.length > 0 && (
              <div className="p-4 bg-slate-50 border-t border-slate-200">
                {productsPagination.hasMore ? (
                  <div ref={productsObserverRef} className="flex flex-col items-center space-y-2">
                    {loadingMoreProducts ? (
                      <>
                        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                        <p className="text-xs text-slate-500">Loading more products...</p>
                      </>
                    ) : (
                      <button
                        onClick={loadMoreProducts}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Load More Products
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-xs text-slate-500">
                    All products loaded ({productsPagination.total} total)
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          // Sellers Grid View
          <div>
            <div className="mb-6">
              <p className="text-sm text-slate-600">
                Select a seller to view their products
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {sellers.map((sellerInfo) => (
                <button
                  key={sellerInfo.seller}
                  onClick={() => handleSellerClick(sellerInfo.seller)}
                  className="group bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md hover:border-indigo-300 transition-all duration-200 text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {sellerInfo.seller}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {sellerInfo.totalProducts} products
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
            {sellers.length === 0 && !loading && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                <p className="text-slate-500">No sellers found</p>
              </div>
            )}

            {/* Sellers Load More */}
            {sellers.length > 0 && (
              <div className="mt-6">
                {sellersPagination.hasMore ? (
                  <div ref={sellersObserverRef} className="flex flex-col items-center space-y-3">
                    {loadingMoreSellers ? (
                      <>
                        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                        <p className="text-sm text-slate-500">Loading more sellers...</p>
                      </>
                    ) : (
                      <button
                        onClick={loadMoreSellers}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                      >
                        Load More Sellers ({sellersPagination.loaded} of {sellersPagination.total})
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-sm text-slate-500">
                    All sellers loaded ({sellersPagination.total} total)
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

