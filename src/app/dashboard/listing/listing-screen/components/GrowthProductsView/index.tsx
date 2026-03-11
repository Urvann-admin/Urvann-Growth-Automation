'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { MoveToListingModal, type GrowthProduct } from './MoveToListingModal';

export function GrowthProductsView() {
  const [products, setProducts] = useState<GrowthProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [totals, setTotals] = useState({ quantity: 0, amount: 0, products: 0 });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [modalProduct, setModalProduct] = useState<GrowthProduct | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.limit),
        sortField: 'quantity',
        sortOrder: 'desc',
      });
      if (searchTerm) params.set('search', searchTerm);

      const response = await fetch(`/api/growth-products?${params}`);
      const result = await response.json();

      if (result.success) {
        setProducts(result.data || []);
        setTotals(result.totals || { quantity: 0, amount: 0, products: 0 });
        setPagination((prev) => ({
          ...prev,
          page,
          total: result.pagination?.total ?? 0,
          totalPages: result.pagination?.totalPages ?? 0,
        }));
      } else {
        toast.error(result.message || 'Failed to fetch growth products');
      }
    } catch (error) {
      console.error('Error fetching growth products:', error);
      toast.error('Failed to fetch growth products');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, pagination.limit]);

  useEffect(() => {
    fetchProducts(1);
  }, [searchTerm]);

  const handleMoveClick = (product: GrowthProduct) => {
    setModalProduct(product);
    setModalOpen(true);
  };

  const handleMoveSuccess = () => {
    toast.success('Moved to listing successfully');
    fetchProducts(pagination.page);
  };

  const handlePageChange = (newPage: number) => {
    fetchProducts(newPage);
  };

  return (
    <div className="space-y-5 p-6">
      {/* Analytics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-base font-bold text-slate-900">{totals.products}</div>
          <div className="text-[11px] text-slate-600">Total Products</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-base font-bold text-[#E6007A]">{totals.quantity}</div>
          <div className="text-[11px] text-slate-600">Total Quantity</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-base font-bold text-slate-900">
            ₹{totals.amount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-600">Total Amount (incl. overhead)</div>
        </div>
      </div>

      {/* Normalized factor explanation */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 text-[11px] text-slate-600">
        <strong>Normalized Factor</strong> = Grand Total ÷ Bill Total (per invoice). It inflates the cost by the overhead share. 
        Total Amount = Price × Quantity × Normalized Factor.
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by product name, code or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
              />
            </div>
          </div>
          <button
            onClick={() => fetchProducts(pagination.page)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E6007A] mx-auto" />
            <p className="mt-2 text-xs text-gray-500">Loading growth products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs font-medium text-gray-900">No growth products</p>
            <p className="mt-1 text-[11px] text-gray-500">
              Products with growth type will appear here when added via invoices.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider" title="Unit price before overhead">
                    Price
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider" title="Total = Price × Qty × Normalized Factor (includes overhead)">
                    Total Amount
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider" title="grandTotal/billTotal — inflates cost by overhead share">
                    Norm. Factor
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider" title="Date invoice was added — shows how long since purchase">
                    Invoice Date
                  </th>
                  <th className="px-4 py-2 text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.parentSku} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="text-xs font-medium text-gray-900">
                        {product.finalName || product.plant || product.productName || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">
                      {product.parentSku}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-900">
                      {product.quantity}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-900">
                      ₹{product.price.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-900 font-medium">
                      ₹{product.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500" title="Normalized factor = grandTotal ÷ billTotal (overhead allocation)">
                      {product.normalizedFactor ?? 1}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600" title="How long since purchase">
                      {product.invoiceDate ? (
                        <div>
                          <div>{new Date(product.invoiceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          <div className="text-[10px] text-gray-500">
                            {Math.floor((Date.now() - new Date(product.invoiceDate).getTime()) / (1000 * 60 * 60 * 24))} days ago
                          </div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleMoveClick(product)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white rounded-lg hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: '#E6007A' }}
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        Move to Listing
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-2.5 border-t border-slate-200 flex justify-between items-center">
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
      </div>

      <MoveToListingModal
        product={modalProduct}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setModalProduct(null);
        }}
        onSuccess={handleMoveSuccess}
      />
    </div>
  );
}
