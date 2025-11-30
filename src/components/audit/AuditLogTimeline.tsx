import React from 'react';
import { Clock, User, FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface FieldChange {
  oldValue: any;
  newValue: any;
}

interface AuditLog {
  _id?: string;
  productId: string;
  sku: string;
  operationType: string;
  previousDocument: any | null;
  updatedDocument: any;
  changedFields: string[];
  fieldChanges: Record<string, FieldChange>;
  updateDescription: string;
  updatedBy: string;
  lastFieldUpdated: string;
  resumeToken: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  __v?: number;
}

interface AuditLogTimelineProps {
  auditLogs: AuditLog[];
  loading?: boolean;
}

export default function AuditLogTimeline({ auditLogs, loading }: AuditLogTimelineProps) {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') {
      if (value.$date) return formatDate(value.$date);
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getOperationIcon = (operationType: string) => {
    switch (operationType.toLowerCase()) {
      case 'insert':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'update':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'delete':
        return <XCircle className="w-4 h-4 text-rose-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
    }
  };

  const getOperationColor = (operationType: string) => {
    switch (operationType.toLowerCase()) {
      case 'insert':
        return 'bg-emerald-50 border-emerald-200';
      case 'update':
        return 'bg-blue-50 border-blue-200';
      case 'delete':
        return 'bg-rose-50 border-rose-200';
      default:
        return 'bg-amber-50 border-amber-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
        <span className="ml-2 text-sm text-slate-600">Loading audit logs...</span>
      </div>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <FileText className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        <p className="text-sm">No audit logs found for this SKU</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Clock className="w-4 h-4 text-slate-500" />
        <h4 className="text-sm font-semibold text-slate-700">Audit Trail ({auditLogs.length} entries)</h4>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {auditLogs.map((log, index) => (
          <div
            key={log._id || index}
            className={`border rounded-lg p-4 ${getOperationColor(log.operationType)}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                {getOperationIcon(log.operationType)}
                <span className="text-sm font-medium text-slate-900 capitalize">
                  {log.operationType}
                </span>
                <span className="text-xs text-slate-500">
                  {log.createdAt && formatDate(log.createdAt)}
                </span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-slate-600">
                <User className="w-3 h-3" />
                <span>{log.updatedBy}</span>
              </div>
            </div>

            {/* Update Description */}
            {log.updateDescription && (
              <div className="mb-3">
                <p className="text-xs text-slate-700 bg-white/50 rounded px-2 py-1">
                  {log.updateDescription}
                </p>
              </div>
            )}

            {/* Changed Fields */}
            {log.changedFields && log.changedFields.length > 0 && (
              <div className="mb-3">
                <h5 className="text-xs font-medium text-slate-700 mb-2">Changed Fields:</h5>
                <div className="flex flex-wrap gap-1">
                  {log.changedFields.map((field, fieldIndex) => (
                    <span
                      key={fieldIndex}
                      className="inline-block px-2 py-1 bg-white/70 text-xs font-mono text-slate-700 rounded border"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Field Changes Details */}
            {log.fieldChanges && Object.keys(log.fieldChanges).length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-slate-700">Field Changes:</h5>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {Object.entries(log.fieldChanges).map(([fieldName, change]) => (
                    <div key={fieldName} className="bg-white/70 rounded p-2 border">
                      <div className="text-xs font-medium text-slate-700 mb-1">{fieldName}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-rose-600 font-medium">Old:</span>
                          <div className="font-mono text-slate-600 bg-rose-50 p-1 rounded mt-1 break-all">
                            {formatValue(change.oldValue)}
                          </div>
                        </div>
                        <div>
                          <span className="text-emerald-600 font-medium">New:</span>
                          <div className="font-mono text-slate-600 bg-emerald-50 p-1 rounded mt-1 break-all">
                            {formatValue(change.newValue)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last Field Updated */}
            {log.lastFieldUpdated && (
              <div className="mt-3 pt-2 border-t border-white/50">
                <span className="text-xs text-slate-600">
                  <strong>Last fields updated:</strong> {log.lastFieldUpdated}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
