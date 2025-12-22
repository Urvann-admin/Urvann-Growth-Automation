import { Upload, CheckCircle, Pause, Clock, Loader2, AlertCircle } from 'lucide-react';

interface PushProgressModalProps {
  progress: {
    processed: number;
    total: number;
    percentage: number;
    currentSku: string | null;
    currentName: string | null;
    logs: string[];
    successes: string[];
    failures: Array<{ sku: string; productId: string; error: string }>;
    elapsedTime: number;
    cancelled: boolean;
  };
  onCancel: () => void;
  onClose: () => void;
}

export default function PushProgressModal({
  progress,
  onCancel,
  onClose,
}: PushProgressModalProps) {
  const isComplete = progress.processed === progress.total || progress.cancelled;
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
          {/* Header */}
          <div className={`px-6 py-5 ${isComplete ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  {isComplete ? (
                    progress.cancelled ? (
                      <Pause className="w-7 h-7 text-white" />
                    ) : (
                      <CheckCircle className="w-7 h-7 text-white" />
                    )
                  ) : (
                    <Upload className="w-7 h-7 text-white animate-bounce" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {isComplete 
                      ? progress.cancelled 
                        ? 'Push Cancelled' 
                        : 'Push Complete!'
                      : 'Pushing Updates...'}
                  </h3>
                  <p className="text-sm text-white/90 mt-1">
                    {progress.total === 0 
                      ? 'Getting started...'
                      : `${progress.processed.toLocaleString()} / ${progress.total.toLocaleString()} SKUs processed`}
                  </p>
                </div>
              </div>
              
              {/* Stopwatch */}
              <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
                <span className="text-lg font-mono font-bold text-white">
                  {formatTime(progress.elapsedTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-6 py-5 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-700">
                Overall Progress
              </span>
              <span className="text-2xl font-bold text-indigo-600">
                {progress.percentage}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            
            {/* Current SKU or Loading State - Only show if not cancelled */}
            {!isComplete && !progress.cancelled && (
              progress.total === 0 ? (
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                  <span className="text-slate-600">Fetching SKUs...</span>
                </div>
              ) : progress.currentSku ? (
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                  <span className="text-slate-600">Processing:</span>
                  <span className="font-mono font-medium text-slate-800">{progress.currentSku}</span>
                  {progress.currentName && (
                    <span className="text-slate-500 truncate">— {progress.currentName}</span>
                  )}
                </div>
              ) : null
            )}
          </div>

          {/* Stats */}
          {isComplete && (
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-slate-600 mb-1">Total</p>
                  <p className="text-3xl font-bold text-slate-800">{progress.total}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                  <p className="text-sm text-emerald-600 mb-1">Successful</p>
                  <p className="text-3xl font-bold text-emerald-700">{progress.successes.length}</p>
                </div>
                <div className="bg-rose-50 rounded-lg p-4 border border-rose-200">
                  <p className="text-sm text-rose-600 mb-1">Failed</p>
                  <p className="text-3xl font-bold text-rose-700">{progress.failures.length}</p>
                </div>
              </div>
            </div>
          )}

          {/* Logs */}
          <div className="px-6 py-4 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-700">Activity Log</h4>
              <span className="text-xs text-slate-500">{progress.logs.length} entries</span>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 max-h-60 overflow-y-auto font-mono text-xs">
              {progress.logs.map((log, idx) => (
                <div 
                  key={idx} 
                  className={`py-1 ${
                    log.startsWith('✓') ? 'text-emerald-400' :
                    log.startsWith('✗') ? 'text-rose-400' :
                    log.startsWith('○') ? 'text-amber-400' :
                    'text-slate-300'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Failures Details (if any) */}
          {isComplete && progress.failures.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200">
              <h4 className="text-sm font-semibold text-rose-700 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Failed Updates ({progress.failures.length})
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {progress.failures.map((failure, idx) => (
                  <div key={idx} className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-mono font-semibold text-rose-800">{failure.sku}</p>
                        <p className="text-rose-600 mt-0.5">
                          Product ID: <span className="font-mono">{failure.productId}</span>
                        </p>
                        <p className="text-rose-500 mt-1">{failure.error}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
            {!isComplete ? (
              <>
                <p className="text-sm text-slate-500">
                  This may take several minutes. Please don't close this window.
                </p>
                <button
                  onClick={onCancel}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  Cancel
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600">
                  {progress.cancelled 
                    ? 'Process was cancelled' 
                    : `Completed in ${formatTime(progress.elapsedTime)}`
                  }
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

