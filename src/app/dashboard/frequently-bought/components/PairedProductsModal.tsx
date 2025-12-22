import { X, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { PairedProduct } from '@/types/frequentlyBought';

interface PairedProductWithStatus extends PairedProduct {
  isPublished?: boolean;
}

interface PairedProductsModalProps {
  data: {
    sku: string;
    name: string;
    topPaired: PairedProductWithStatus[];
    loadingStatus: boolean;
  };
  onClose: () => void;
}

export default function PairedProductsModal({ data, onClose }: PairedProductsModalProps) {
  const publishedCount = data.topPaired.filter(p => p.isPublished === true).length;
  const unpublishedCount = data.topPaired.filter(p => p.isPublished === false).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Paired Products</h3>
                <p className="text-sm text-slate-500 mt-0.5 font-mono">{data.sku}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Status Summary */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-slate-500">
                {data.topPaired.length} products frequently bought together
              </p>
              {data.loadingStatus ? (
                <span className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Checking status...
                </span>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle className="w-3 h-3" />
                    {publishedCount} Published
                  </span>
                  <span className="flex items-center gap-1 text-xs text-rose-600">
                    <XCircle className="w-3 h-3" />
                    {unpublishedCount} Unpublished
                  </span>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              {data.topPaired.map((item, index) => (
                <div
                  key={item.sku}
                  className={`p-4 rounded-xl border transition-all ${
                    item.isPublished === false 
                      ? 'bg-rose-50/50 border-rose-200' 
                      : index === 0 ? 'bg-amber-50/50 border-amber-200' :
                        index === 1 ? 'bg-slate-50 border-slate-200' :
                        index === 2 ? 'bg-orange-50/50 border-orange-200' :
                        'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      item.isPublished === false
                        ? 'bg-rose-500 text-white'
                        : index === 0 ? 'bg-amber-500 text-white' :
                          index === 1 ? 'bg-slate-400 text-white' :
                          index === 2 ? 'bg-orange-400 text-white' :
                          'bg-slate-200 text-slate-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-slate-800">{item.sku}</span>
                          {item.isPublished !== undefined && (
                            item.isPublished ? (
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500" />
                            )
                          )}
                          {item.isPublished === undefined && data.loadingStatus && (
                            <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
                          )}
                        </div>
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {item.count}x
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{item.name}</p>
                      {item.isPublished === false && (
                        <p className="text-xs text-rose-500 mt-1">Unpublished or out of stock</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

