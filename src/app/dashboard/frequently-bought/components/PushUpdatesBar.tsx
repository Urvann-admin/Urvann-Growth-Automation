import { Loader2, Upload } from 'lucide-react';

interface PushUpdatesBarProps {
  syncingMapping: boolean;
  pushingUpdates: boolean;
  onPushAllUpdates: () => void;
}

export default function PushUpdatesBar({
  syncingMapping,
  pushingUpdates,
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
            "Push All Updates" will automatically sync mappings first, then push frequently bought together data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onPushAllUpdates}
            disabled={syncingMapping || pushingUpdates}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {pushingUpdates || syncingMapping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {syncingMapping ? 'Syncing...' : 'Pushing...'}
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

