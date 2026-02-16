'use client';

interface UploadProgressProps {
  progress: number;
}

export function UploadProgress({ progress }: UploadProgressProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">Uploading...</span>
        <span className="text-sm font-semibold text-emerald-600">{progress}%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-2">
        Please wait while we process your images...
      </p>
    </div>
  );
}
