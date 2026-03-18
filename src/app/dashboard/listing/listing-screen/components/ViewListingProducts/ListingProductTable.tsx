'use client';

import { Package, Image as ImageIcon } from 'lucide-react';
import type { ListingProduct, ListingStatus } from '@/models/listingProduct';

export interface ListingProductTableProps {
  products: ListingProduct[];
  loading?: boolean;
}

export function ListingProductTable({
  products,
  loading = false,
}: ListingProductTableProps) {
  const getStatusBadge = (status: ListingStatus) => {
    const styles = {
      draft: 'bg-slate-100 text-slate-800',
      listed: 'bg-pink-100 text-[#E6007A]',
      published: 'bg-pink-100 text-[#E6007A]',
    };

    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E6007A] mx-auto"></div>
          <p className="mt-2 text-xs text-gray-500">Loading listing products...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="p-6 text-center">
          <Package className="mx-auto h-10 w-10 text-gray-400" />
          <h3 className="mt-2 text-xs font-medium text-gray-900">No listing products</h3>
          <p className="mt-1 text-[11px] text-gray-500">
            Get started by creating your first listing product.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Parents
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Section
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={String(product._id)} className="hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8">
                      {product.images && product.images.length > 0 ? (
                        <img
                          className="h-8 w-8 rounded-lg object-cover"
                          src={product.images[0].startsWith('/') ? product.images[0] : `/api/image-collection/proxy?url=${encodeURIComponent(product.images[0])}`}
                          alt={product.plant}
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-gray-200 flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="ml-3">
                      <div className="text-xs font-medium text-gray-900">
                        {product.finalName || product.plant}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        SKU: {product.sku || 'Pending'}
                      </div>
                    </div>
                  </div>
                </td>
                
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <Package className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs text-gray-900">
                      {product.parentSkus?.length || 0}
                    </span>
                  </div>
                </td>
                
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-pink-100 text-[#E6007A] capitalize">
                    {product.section}
                  </span>
                </td>
                
                <td className="px-4 py-2.5 text-xs text-gray-900">
                  {product.quantity}
                </td>
                
                <td className="px-4 py-2.5 text-xs text-gray-900">
                  ₹{product.price.toFixed(2)}
                </td>
                
                <td className="px-4 py-2.5">
                  {getStatusBadge(product.status)}
                </td>
                
                <td className="px-4 py-2.5 text-xs text-gray-500">
                  {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}