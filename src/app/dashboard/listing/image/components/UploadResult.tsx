'use client';

import { CheckCircle2, AlertCircle, X, ExternalLink, Copy, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { formatBytes } from '../utils/validation';

interface UploadResultProps {
  result: {
    success: boolean;
    message: string;
    data?: {
      collectionId: string;
      collectionName?: string;
      imageCount: number;
      totalSize: number;
      urls: string[];
      duration: number;
      sessionId: string;
    };
    warnings?: string[];
    /** S3/upload errors when success is false */
    errors?: Array<{ filename?: string; error?: string } | string>;
    partialSuccess?: boolean;
  };
  onClose: () => void;
}

export function UploadResult({ result, onClose }: UploadResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyUrls = () => {
    if (result.data?.urls) {
      navigator.clipboard.writeText(result.data.urls.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 overflow-hidden">
      {/* Header */}
      <div
        className={`p-4 ${
          result.success
            ? result.partialSuccess
              ? 'bg-amber-50 border-b border-amber-200'
              : 'bg-emerald-50 border-b border-emerald-200'
            : 'bg-red-50 border-b border-red-200'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {result.success ? (
              result.partialSuccess ? (
                <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-0.5 shrink-0" />
              )
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 shrink-0" />
            )}
            <div>
              <h4
                className={`font-semibold ${
                  result.success
                    ? result.partialSuccess
                      ? 'text-amber-900'
                      : 'text-emerald-900'
                    : 'text-red-900'
                }`}
              >
                {result.success
                  ? result.partialSuccess
                    ? 'Upload Completed with Warnings'
                    : 'Upload Successful!'
                  : 'Upload Failed'}
              </h4>
              <p
                className={`text-sm mt-1 ${
                  result.success
                    ? result.partialSuccess
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                    : 'text-red-700'
                }`}
              >
                {result.message}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {result.data && (
        <div className="p-4 space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Images</div>
              <div className="text-2xl font-bold text-slate-900">{result.data.imageCount}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Total Size</div>
              <div className="text-2xl font-bold text-slate-900">
                {formatBytes(result.data.totalSize)}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Duration</div>
              <div className="text-2xl font-bold text-slate-900">
                {(result.data.duration / 1000).toFixed(1)}s
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Collection ID</div>
              <div className="text-xs font-mono text-slate-700 truncate">
                {result.data.collectionId}
              </div>
            </div>
          </div>

          {/* Collection Name */}
          {result.data.collectionName && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-xs font-medium text-blue-900 mb-1">Collection Name</div>
              <div className="text-sm text-blue-700">{result.data.collectionName}</div>
            </div>
          )}

          {/* URLs Action */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyUrls}
              className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <CheckCheck className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy URLs
                </>
              )}
            </button>
            <a
              href={`/api/image-collection/${result.data.collectionId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View API
            </a>
          </div>

          {/* Session ID */}
          <div className="text-xs text-slate-400">
            Session ID: <span className="font-mono">{result.data.sessionId}</span>
          </div>
        </div>
      )}

      {/* Warnings */}
      {result.warnings && result.warnings.length > 0 && (
        <div className="p-4 bg-amber-50 border-t border-amber-200">
          <h5 className="text-sm font-semibold text-amber-900 mb-2">Warnings</h5>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {result.warnings.map((warning, index) => (
              <div key={index} className="text-xs text-amber-700">
                • {warning}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
