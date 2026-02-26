'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { ListingProduct, ListingSection, ListingStatus } from '@/models/listingProduct';
import { ListingProductTable } from './ListingProductTable';

export interface ViewListingProductsProps {
  section: ListingSection;
  onCreateNew?: () => void;
}

export function ViewListingProducts({
  section,
  onCreateNew,
}: ViewListingProductsProps) {
  const [products, setProducts] = useState<ListingProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ListingStatus | 'all'>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Fetch products
  const fetchProducts = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        section,
        page: String(page),
        limit: String(pagination.limit),
        sortField: 'createdAt',
        sortOrder: 'desc',
      });

      if (searchTerm) {
        params.set('search', searchTerm);
      }

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/listing-product?${params}`);
      const result = await response.json();

      if (result.success) {
        setProducts(result.data || []);
        setPagination(prev => ({
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
  };

  // Initial load and when filters change
  useEffect(() => {
    fetchProducts(1);
  }, [section, searchTerm, statusFilter]);

  // Handle status change
  const handleStatusChange = async (product: ListingProduct, newStatus: ListingStatus) => {
    try {
      const response = await fetch(`/api/listing-product/${product._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Product status updated to ${newStatus}`);
        fetchProducts(pagination.page);
      } else {
        toast.error(result.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
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

  // Handle bulk actions
  const handleBulkAction = async (productIds: string[], action: string) => {
    if (!confirm(`Are you sure you want to ${action} ${productIds.length} product(s)?`)) {
      return;
    }

    try {
      let endpoint = '';
      let method = '';
      let body: any = {};

      switch (action) {
        case 'delete':
          endpoint = `/api/listing-product?ids=${productIds.join(',')}`;
          method = 'DELETE';
          break;
        case 'publish':
        case 'draft':
        case 'listed':
          // For bulk status updates, we'd need a bulk update endpoint
          // For now, update them one by one
          for (const id of productIds) {
            await fetch(`/api/listing-product/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: action }),
            });
          }
          toast.success(`Updated ${productIds.length} product(s)`);
          fetchProducts(pagination.page);
          return;
      }

      if (endpoint) {
        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
        });

        const result = await response.json();

        if (result.success) {
          toast.success(`${action} completed for ${productIds.length} product(s)`);
          fetchProducts(pagination.page);
        } else {
          toast.error(result.message || `Failed to ${action} products`);
        }
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      toast.error(`Failed to ${action} products`);
    }
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    fetchProducts(newPage);
  };

  const sectionTitle = section.charAt(0).toUpperCase() + section.slice(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {sectionTitle} Products
          </h2>
          <p className="text-gray-600 mt-1">
            Manage listing products in the {section} section
          </p>
        </div>
        
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Create New Product
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ListingStatus | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="listed">Listed</option>
              <option value="published">Published</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => fetchProducts(pagination.page)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button
              onClick={() => {
                // TODO: Implement export functionality
                toast.info('Export functionality coming soon');
              }}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{pagination.total}</div>
          <div className="text-sm text-gray-600">Total Products</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">
            {products.filter(p => p.status === 'published').length}
          </div>
          <div className="text-sm text-gray-600">Published</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">
            {products.filter(p => p.status === 'listed').length}
          </div>
          <div className="text-sm text-gray-600">Listed</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-600">
            {products.filter(p => p.status === 'draft').length}
          </div>
          <div className="text-sm text-gray-600">Draft</div>
        </div>
      </div>

      {/* Table */}
      <ListingProductTable
        products={products}
        loading={loading}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        onBulkAction={handleBulkAction}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-6 py-3 border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = pagination.page - 2 + i;
              if (pageNum < 1 || pageNum > pagination.totalPages) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1 text-sm border rounded ${
                    pageNum === pagination.page
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}