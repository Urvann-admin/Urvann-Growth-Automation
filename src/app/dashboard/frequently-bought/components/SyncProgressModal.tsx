import { Upload, CheckCircle, Pause, Clock, Loader2 } from 'lucide-react';

interface SyncProgressModalProps {
  progress: {
    processed: number;
    total: number;
    percentage: number;
    currentBatch: number | null;
    logs: string[];
    successes: number;
    failures: number;
    elapsedTime: number;
    cancelled: boolean;
  };
  onCancel: () => void;
  onClose: () => void;
}

export default function SyncProgressModal({
  progress,
  onCancel,
  onClose,
}: SyncProgressModalProps) {
  const isComplete = progress.processed >= progress.total || progress.cancelled || progress.percentage >= 100;
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
                        ? 'Sync Cancelled' 
                        : 'Sync Complete!'
                      : 'Syncing Mappings...'}
                  </h3>
                  <p className="text-sm text-white/90 mt-1">
                    {progress.processed.toLocaleString()} products synced
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
            
            {/* Current Batch */}
            {!isComplete && progress.currentBatch && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                <span className="text-slate-600">Processing batch:</span>
                <span className="font-mono font-medium text-slate-800">{progress.currentBatch}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          {isComplete && (
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-slate-600 mb-1">Total Synced</p>
                  <p className="text-3xl font-bold text-slate-800">{progress.successes.toLocaleString()}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                  <p className="text-sm text-emerald-600 mb-1">Successful</p>
                  <p className="text-3xl font-bold text-emerald-700">{progress.successes.toLocaleString()}</p>
                </div>
                <div className="bg-rose-50 rounded-lg p-4 border border-rose-200">
                  <p className="text-sm text-rose-600 mb-1">Failed</p>
                  <p className="text-3xl font-bold text-rose-700">{progress.failures.toLocaleString()}</p>
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
                    log.includes('Error') ? 'text-rose-400' :
                    'text-slate-300'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
            {!isComplete ? (
              <>
                <p className="text-sm text-slate-500">
                  Syncing SKU mappings from Urvann API. This may take several minutes.
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
                    ? 'Sync was cancelled' 
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

