'use client';

import { Package, Image as ImageIcon } from 'lucide-react';
import type { ListingProduct } from '@/models/listingProduct';

function parentSkusDisplay(product: ListingProduct): string[] {
  const fromItems = product.parentItems?.length
    ? product.parentItems.map((i) => String(i.parentSku || '').trim()).filter(Boolean)
    : [];
  if (fromItems.length > 0) return [...new Set(fromItems)];
  const legacy = (product.parentSkus ?? []).map((s) => String(s).trim()).filter(Boolean);
  return [...new Set(legacy)];
}

function inventoryDisplay(product: ListingProduct): number {
  return Math.max(0, Math.floor(Number(product.inventory_quantity) || 0));
}

/** Storefront publish flag: 0 or 1 */
function publishBinary(product: ListingProduct): 0 | 1 {
  return product.publish_status === 1 ? 1 : 0;
}

export interface ListingProductTableProps {
  products: ListingProduct[];
  /** Which sub-tab is active on All listed products — drives visible columns. */
  listingTab: 'parent' | 'child';
  loading?: boolean;
  selectedIds: Set<string>;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  onToggleRow: (productId: string, checked: boolean) => void;
  onToggleVisible: (checked: boolean) => void;
}

export function ListingProductTable({
  products,
  listingTab,
  loading = false,
  selectedIds,
  allVisibleSelected,
  someVisibleSelected,
  onToggleRow,
  onToggleVisible,
}: ListingProductTableProps) {
  const isParentTab = listingTab === 'parent';

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
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someVisibleSelected;
                  }}
                  onChange={(e) => onToggleVisible(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-[#E6007A] focus:ring-[#E6007A]"
                />
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Parent SKUs
              </th>
              {!isParentTab && (
                <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Parents
                </th>
              )}
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Inventory
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                {isParentTab ? 'Publish status' : 'Publish'}
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => {
              const lineParentSkus = parentSkusDisplay(product);
              const parentCount = lineParentSkus.length || product.parentSkus?.length || 0;
              return (
                <tr key={String(product._id)} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(String(product._id))}
                      onChange={(e) => onToggleRow(String(product._id), e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-[#E6007A] focus:ring-[#E6007A]"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        {product.images && product.images.length > 0 ? (
                          <img
                            className="h-8 w-8 rounded-lg object-cover"
                            src={
                              product.images[0].startsWith('/')
                                ? product.images[0]
                                : `/api/image-collection/proxy?url=${encodeURIComponent(product.images[0])}`
                            }
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
                        <div className="text-[11px] text-gray-500">SKU: {product.sku || 'Pending'}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-2.5 max-w-[220px]">
                    {lineParentSkus.length === 0 ? (
                      <span className="text-[11px] text-gray-400">—</span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {lineParentSkus.map((sku) => (
                          <span
                            key={sku}
                            className="text-[11px] font-mono text-gray-800 truncate"
                            title={sku}
                          >
                            {sku}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  {!isParentTab && (
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <Package className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-xs text-gray-900">{parentCount}</span>
                      </div>
                    </td>
                  )}

                  <td className="px-4 py-2.5 text-xs text-gray-900">{product.quantity}</td>

                  <td className="px-4 py-2.5 text-xs text-gray-900">₹{product.price.toFixed(2)}</td>

                  <td className="px-4 py-2.5 text-xs text-gray-900 tabular-nums">
                    {inventoryDisplay(product)}
                  </td>

                  <td className="px-4 py-2.5 text-xs text-gray-900 tabular-nums font-mono">
                    {publishBinary(product)}
                  </td>

                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
