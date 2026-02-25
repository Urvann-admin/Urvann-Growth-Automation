'use client';

import { useState } from 'react';
import { Edit, Trash2, Eye, Package, Tag, Image as ImageIcon, MoreHorizontal } from 'lucide-react';
import type { ListingProduct, ListingStatus } from '@/models/listingProduct';

export interface ListingProductTableProps {
  products: ListingProduct[];
  loading?: boolean;
  onEdit?: (product: ListingProduct) => void;
  onDelete?: (product: ListingProduct) => void;
  onView?: (product: ListingProduct) => void;
  onStatusChange?: (product: ListingProduct, newStatus: ListingStatus) => void;
  onBulkAction?: (productIds: string[], action: string) => void;
}

export function ListingProductTable({
  products,
  loading = false,
  onEdit,
  onDelete,
  onView,
  onStatusChange,
  onBulkAction,
}: ListingProductTableProps) {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(products.map(p => String(p._id))));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    const newSelection = new Set(selectedProducts);
    if (checked) {
      newSelection.add(productId);
    } else {
      newSelection.delete(productId);
    }
    setSelectedProducts(newSelection);
  };

  const handleBulkAction = (action: string) => {
    if (selectedProducts.size > 0) {
      onBulkAction?.(Array.from(selectedProducts), action);
      setSelectedProducts(new Set());
    }
  };

  const getStatusBadge = (status: ListingStatus) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      listed: 'bg-blue-100 text-blue-800',
      published: 'bg-green-100 text-green-800',
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading listing products...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="p-6 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No listing products</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first listing product.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      {/* Bulk Actions */}
      {selectedProducts.size > 0 && (
        <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-800">
              {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('publish')}
                className="px-3 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 border border-emerald-300 rounded hover:bg-emerald-200"
              >
                Publish
              </button>
              <button
                onClick={() => handleBulkAction('draft')}
                className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
              >
                Move to Draft
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded hover:bg-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedProducts.size === products.length && products.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Parents
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Section
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={String(product._id)} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(String(product._id))}
                    onChange={(e) => handleSelectProduct(String(product._id), e.target.checked)}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </td>
                
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {product.images && product.images.length > 0 ? (
                        <img
                          className="h-10 w-10 rounded-lg object-cover"
                          src={product.images[0]}
                          alt={product.plant}
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {product.finalName || product.plant}
                      </div>
                      <div className="text-sm text-gray-500">
                        SKU: {product.sku || 'Pending'}
                      </div>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">
                      {product.parentSkus?.length || 0}
                    </span>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 capitalize">
                    {product.section}
                  </span>
                </td>
                
                <td className="px-6 py-4 text-sm text-gray-900">
                  {product.quantity}
                </td>
                
                <td className="px-6 py-4 text-sm text-gray-900">
                  ₹{product.price.toFixed(2)}
                </td>
                
                <td className="px-6 py-4">
                  {getStatusBadge(product.status)}
                </td>
                
                <td className="px-6 py-4 text-sm text-gray-500">
                  {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '—'}
                </td>
                
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <div className="relative inline-block text-left">
                    <button
                      onClick={() => setDropdownOpen(dropdownOpen === String(product._id) ? null : String(product._id))}
                      className="inline-flex items-center p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-full"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    
                    {dropdownOpen === String(product._id) && (
                      <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                        <div className="py-1">
                          {onView && (
                            <button
                              onClick={() => {
                                onView(product);
                                setDropdownOpen(null);
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </button>
                          )}
                          
                          {onEdit && (
                            <button
                              onClick={() => {
                                onEdit(product);
                                setDropdownOpen(null);
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </button>
                          )}
                          
                          {onStatusChange && (
                            <>
                              <div className="border-t border-gray-100 my-1"></div>
                              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Change Status
                              </div>
                              {['draft', 'listed', 'published'].map((status) => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    onStatusChange(product, status as ListingStatus);
                                    setDropdownOpen(null);
                                  }}
                                  disabled={product.status === status}
                                  className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed capitalize"
                                >
                                  {status}
                                </button>
                              ))}
                            </>
                          )}
                          
                          {onDelete && (
                            <>
                              <div className="border-t border-gray-100 my-1"></div>
                              <button
                                onClick={() => {
                                  onDelete(product);
                                  setDropdownOpen(null);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Click outside to close dropdown */}
      {dropdownOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setDropdownOpen(null)}
        />
      )}
    </div>
  );
}