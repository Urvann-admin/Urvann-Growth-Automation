'use client';

import { useState } from 'react';
import {
  CheckCircle,
  Info,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Filter
} from 'lucide-react';
import type { UploadLogEntry } from '@/models/imageCollection';

/** Log entry with timestamp as Date or string (from JSON) */
type LogEntry = Omit<UploadLogEntry, 'timestamp'> & { timestamp: string | Date };

interface LogsViewerProps {
  logs: LogEntry[];
  className?: string;
}

const LOG_ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const LOG_COLORS = {
  info: {
    icon: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
  },
  success: {
    icon: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
  },
  warning: {
    icon: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
  },
  error: {
    icon: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
  },
};

export function LogsViewer({ logs, className = '' }: LogsViewerProps) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);

  const counts = {
    total: logs.length,
    info: logs.filter(l => l.level === 'info').length,
    success: logs.filter(l => l.level === 'success').length,
    warning: logs.filter(l => l.level === 'warning').length,
    error: logs.filter(l => l.level === 'error').length,
  };

  const formatTime = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  if (!logs || logs.length === 0) {
    return (
      <div className={`bg-slate-50 rounded-xl border border-slate-200 p-6 text-center ${className}`}>
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600 text-sm">No logs available for this collection</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Upload Logs</h3>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
            {counts.total} entries
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {expanded && (
        <>
          {/* Stats Bar */}
          <div className="px-6 py-3 bg-slate-50 border-t border-b border-slate-200">
            <div className="flex items-center gap-4 text-sm">
              <button
                onClick={() => setFilter('all')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                  filter === 'all'
                    ? 'bg-white shadow-sm border border-slate-200 font-medium'
                    : 'hover:bg-white/50'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>All ({counts.total})</span>
              </button>

              {counts.info > 0 && (
                <button
                  onClick={() => setFilter('info')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                    filter === 'info'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-slate-600 hover:bg-blue-50'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>{counts.info}</span>
                </button>
              )}

              {counts.success > 0 && (
                <button
                  onClick={() => setFilter('success')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                    filter === 'success'
                      ? 'bg-emerald-100 text-emerald-700 font-medium'
                      : 'text-slate-600 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{counts.success}</span>
                </button>
              )}

              {counts.warning > 0 && (
                <button
                  onClick={() => setFilter('warning')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                    filter === 'warning'
                      ? 'bg-amber-100 text-amber-700 font-medium'
                      : 'text-slate-600 hover:bg-amber-50'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{counts.warning}</span>
                </button>
              )}

              {counts.error > 0 && (
                <button
                  onClick={() => setFilter('error')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                    filter === 'error'
                      ? 'bg-red-100 text-red-700 font-medium'
                      : 'text-slate-600 hover:bg-red-50'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{counts.error}</span>
                </button>
              )}
            </div>
          </div>

          {/* Logs List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-500 text-sm">
                No {filter} logs found
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredLogs.map((log, index) => {
                  const Icon = LOG_ICONS[log.level];
                  const colors = LOG_COLORS[log.level];
                  
                  return (
                    <div
                      key={index}
                      className={`px-6 py-3 hover:bg-slate-50 transition-colors ${colors.bg} bg-opacity-30`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colors.icon}`} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-medium ${colors.text}`}>
                              {log.message}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="w-3 h-3" />
                              {formatTime(log.timestamp)}
                            </div>
                          </div>
                          
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="mt-2 p-2 bg-white/50 rounded border border-slate-200">
                              <div className="text-xs font-mono text-slate-700 space-y-1">
                                {Object.entries(log.details).map(([key, value]) => (
                                  <div key={key} className="flex gap-2">
                                    <span className="text-slate-500">{key}:</span>
                                    <span className="text-slate-900 break-all">
                                      {typeof value === 'object' 
                                        ? JSON.stringify(value, null, 2) 
                                        : String(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
