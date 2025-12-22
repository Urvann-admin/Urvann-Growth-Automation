import { Loader2, RotateCw, Upload } from 'lucide-react';

interface PushUpdatesBarProps {
  syncingMapping: boolean;
  pushingUpdates: boolean;
  onSyncMapping: () => void;
  onPushAllUpdates: () => void;
}

export default function PushUpdatesBar({
  syncingMapping,
  pushingUpdates,
  onSyncMapping,
  onPushAllUpdates,
}: PushUpdatesBarProps) {
  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-indigo-800 mb-1">
            Push Updates to Urvann API
          </h3>
          <p className="text-xs text-indigo-600">
            Sync SKU mappings first, then push frequently bought together data to products
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onSyncMapping}
            disabled={syncingMapping || pushingUpdates}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {syncingMapping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RotateCw className="w-4 h-4" />
                Sync Mappings
              </>
            )}
          </button>
          <button
            onClick={onPushAllUpdates}
            disabled={syncingMapping || pushingUpdates}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {pushingUpdates ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Pushing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Push All Updates
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

