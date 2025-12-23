import { Package, Check, X } from 'lucide-react';
import { UniqueSku } from '@/types/frequentlyBought';
import AllSkusViewSkeleton from './AllSkusViewSkeleton';
import Pagination from './Pagination';

interface AllSkusViewProps {
  uniqueSkus: UniqueSku[];
  loading?: boolean;
  loadingAnalysis?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onSkuClick?: (sku: string) => void;
}

export default function AllSkusView({ 
  uniqueSkus, 
  loading = false,
  loadingAnalysis = false,
  pagination,
  onPageChange,
  onSkuClick,
}: AllSkusViewProps) {
  if (loading) {
    return <AllSkusViewSkeleton />;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
      {/* Loading Overlay */}
      {loadingAnalysis && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-indigo-200 rounded-full"></div>
              <div className="absolute inset-0 w-12 h-12 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-slate-600 text-sm font-medium">Searching...</p>
          </div>
        </div>
      )}

      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Top SKUs</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {pagination ? `Showing ${uniqueSkus.length} of ${pagination.total.toLocaleString()} SKUs` : `Top ${uniqueSkus.length} SKUs`} by transaction count
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">#</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Substore</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Available</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Transactions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {uniqueSkus.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm text-slate-500">No SKUs found</p>
                </td>
              </tr>
            ) : (
              uniqueSkus.map((item, index) => {
                const displayIndex = pagination ? (pagination.page - 1) * pagination.pageSize + index + 1 : index + 1;
                // Check if available: publish == "1" and inventory > 0
                const isAvailable = String(item.publish || '0').trim() === '1' && (item.inventory || 0) > 0;
                
                return (
                  <tr 
                    key={item.sku} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => onSkuClick?.(item.sku)}
                  >
                    <td className="px-6 py-4 text-sm text-slate-400 tabular-nums">{displayIndex}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-slate-700">
                        {item.sku}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {item.substore ? (
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(item.substore) ? item.substore : [item.substore]).map((substore, idx) => (
                            <span key={idx} className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-md">
                              {substore}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isAvailable ? (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600">
                          <Check className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600">
                          <X className="w-4 h-4" />
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-md">
                        {item.orderCount ? item.orderCount.toLocaleString() : '0'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && onPageChange && (
        <div className="px-6 py-4 border-t border-slate-200">
          <Pagination
            pagination={pagination}
            loadingAnalysis={loading || loadingAnalysis}
            onPageChange={onPageChange}
            getPageNumbers={(current, total) => {
              const pages: number[] = [];
              const maxPages = 5;
              let start = Math.max(1, current - Math.floor(maxPages / 2));
              let end = Math.min(total, start + maxPages - 1);
              if (end - start < maxPages - 1) {
                start = Math.max(1, end - maxPages + 1);
              }
              for (let i = start; i <= end; i++) {
                pages.push(i);
              }
              return pages;
            }}
          />
        </div>
      )}
    </div>
  );
}

