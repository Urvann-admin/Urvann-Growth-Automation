'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: string;
  action: string;
  message: string;
  details?: Record<string, unknown>;
}

interface UploadLogItem {
  _id: string;
  sessionId: string;
  uploadType: string;
  collectionName?: string;
  status: string;
  logs: LogEntry[];
  summary: {
    totalFiles: number;
    successfulUploads: number;
    failedUploads: number;
    totalSize: number;
    duration?: number;
  };
  createdAt: string;
}

export function UploadLogsView() {
  const [logs, setLogs] = useState<UploadLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterUploadType, setFilterUploadType] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (filterStatus) params.set('status', filterStatus);
      if (filterUploadType) params.set('uploadType', filterUploadType);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/image-collection/logs?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setLogs(result.data);
        setTotalPages(result.pagination.totalPages);
        setTotal(result.pagination.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterUploadType, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      case 'partial':
        return 'bg-amber-100 text-amber-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const onFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
        <span className="text-sm text-slate-600">From</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onFilterChange(setDateFrom, e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        <span className="text-sm text-slate-600">To</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onFilterChange(setDateTo, e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        <select
            value={filterStatus}
            onChange={(e) => onFilterChange(setFilterStatus, e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="partial">Partial</option>
            <option value="failed">Failed</option>
            <option value="processing">Processing</option>
          </select>
          <select
            value={filterUploadType}
            onChange={(e) => onFilterChange(setFilterUploadType, e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">All types</option>
            <option value="zip">ZIP</option>
            <option value="folder">Folder</option>
            <option value="files">Files</option>
          </select>
      </div>
      {logs.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600">No upload logs yet.</p>
          <p className="text-sm text-slate-500 mt-1">Logs will appear here after you upload images.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Time</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Session</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Files</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Size</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 truncate max-w-[120px]" title={log.sessionId}>
                        {log.sessionId}
                      </td>
                      <td className="py-3 px-4 text-slate-700 capitalize">{log.uploadType}</td>
                      <td className="py-3 px-4 text-slate-700 truncate max-w-[140px]">{log.collectionName || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700">
                        {log.summary.successfulUploads}/{log.summary.totalFiles}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700">{formatBytes(log.summary.totalSize)}</td>
                      <td className="py-3 px-4 text-right text-slate-700">
                        {log.summary.duration != null ? `${(log.summary.duration / 1000).toFixed(1)}s` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
