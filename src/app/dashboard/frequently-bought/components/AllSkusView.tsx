import { Package } from 'lucide-react';
import { UniqueSku } from '@/types/frequentlyBought';
import AllSkusViewSkeleton from './AllSkusViewSkeleton';

interface AllSkusViewProps {
  uniqueSkus: UniqueSku[];
  loading?: boolean;
  loadingAnalysis?: boolean;
}

export default function AllSkusView({ 
  uniqueSkus, 
  loading = false,
  loadingAnalysis = false
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
        <h2 className="text-base font-semibold text-slate-800">Top 10 SKUs</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Top {uniqueSkus.length} SKUs by transaction count (published & in stock)
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">#</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Name</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Transactions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {uniqueSkus.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center">
                  <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm text-slate-500">No SKUs found</p>
                </td>
              </tr>
            ) : (
              uniqueSkus.map((item, index) => (
                <tr 
                  key={item.sku} 
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-slate-400 tabular-nums">{index + 1}</td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-slate-700">
                      {item.sku}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.name || '-'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-md">
                      {item.orderCount ? item.orderCount.toLocaleString() : '0'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

