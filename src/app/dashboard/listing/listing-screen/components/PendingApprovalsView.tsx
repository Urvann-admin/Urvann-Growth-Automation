'use client';

import { useState, useEffect, useCallback } from 'react';
import { Upload, CheckCircle2, Bell, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface ListingNotification {
  _id: string;
  type: string;
  parentSkus: string[];
  childSkus: string[];
  listingProductIds?: string[];
  message: string;
  read: boolean;
  createdAt: string;
}

export interface PendingApprovalsViewProps {
  onCountChange?: (count: number) => void;
}

function formatTime(iso: string | undefined) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/** One-line summary for the table; full `message` kept for tooltip / legacy rows. */
function pendingApprovalSummary(n: ListingNotification): string {
  if (n.type === 'inventory_recalculated_unpublished') {
    const count = n.childSkus?.length ?? 0;
    if (count > 0) {
      return `${count} SKU${count === 1 ? '' : 's'} · publish pending`;
    }
    return 'Publish pending';
  }
  return n.message;
}

export function PendingApprovalsView({ onCountChange }: PendingApprovalsViewProps) {
  const [notifications, setNotifications] = useState<ListingNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [dismissingAll, setDismissingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/listing-notifications');
      const json = await res.json();
      const data: ListingNotification[] = json.success && json.data?.length ? json.data : [];
      setNotifications(data);
      onCountChange?.(data.length);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const dismiss = async (id: string) => {
    setDismissingId(id);
    try {
      setNotifications((prev) => {
        const updated = prev.filter((n) => n._id !== id);
        onCountChange?.(updated.length);
        return updated;
      });
      await fetch('/api/listing-notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      toast.success('Dismissed');
    } catch {
      toast.error('Failed to dismiss');
    } finally {
      setDismissingId(null);
    }
  };

  const dismissAll = async () => {
    setDismissingAll(true);
    try {
      setNotifications([]);
      onCountChange?.(0);
      await fetch('/api/listing-notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      toast.success('All dismissed');
    } catch {
      toast.error('Failed to dismiss all');
    } finally {
      setDismissingAll(false);
    }
  };

  const approveAndPublish = async (notificationId: string) => {
    setPublishingId(notificationId);
    try {
      const res = await fetch('/api/listing-notifications/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || 'Could not publish');
        return;
      }
      const count = json.publishedCount ?? 0;
      if (json.clearedWithoutPublish) {
        toast.success('Already published — cleared.');
      } else if (count > 0) {
        toast.success(`Published ${count}: ${(json.publishedSkus as string[]).join(', ')}`);
      } else {
        toast.error('Nothing was published.');
      }
      if (Array.isArray(json.skipped) && json.skipped.length > 0) {
        toast(`Skipped: ${json.skipped.join('; ')}`);
      }
      setNotifications((prev) => {
        const updated = prev.filter((n) => n._id !== notificationId);
        onCountChange?.(updated.length);
        return updated;
      });
    } catch {
      toast.error('Publish failed');
    } finally {
      setPublishingId(null);
    }
  };

  const approveAll = async () => {
    const ids = [...notifications.map((n) => n._id)];
    for (const id of ids) {
      await approveAndPublish(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-[#E6007A]" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">All clear</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          No pending approvals. Recalculated listings will show here after invoice updates.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col px-4 py-5 sm:px-6 max-w-6xl mx-auto w-full">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 shrink-0">
            <Bell className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Pending approvals</h2>
            <p className="text-xs text-slate-500">
              {notifications.length} item{notifications.length === 1 ? '' : 's'} · inventory recalculated, publish pending
            </p>
          </div>
          <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold tabular-nums shrink-0">
            {notifications.length > 99 ? '99+' : notifications.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={approveAll}
            disabled={publishingId !== null}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#E6007A] px-3 py-2 text-xs font-medium text-white hover:bg-pink-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Upload className="h-3.5 w-3.5" />
            Approve all
          </button>
          <button
            type="button"
            onClick={dismissAll}
            disabled={dismissingAll}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Dismiss all
          </button>
        </div>
      </div>

      {/* Tabular list: semantic table on md+, cards on small screens */}
      <div className="flex-1 min-h-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-y-auto min-h-0 flex-1">
          {/* Desktop: real table with borders and hover */}
          <table className="hidden md:table w-full table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[34%]" />
              <col className="w-[21%]" />
              <col className="w-[17%]" />
              <col className="w-[15%]" />
              <col className="w-[13%]" />
            </colgroup>
            <thead>
              <tr className="border-b-2 border-slate-200 bg-slate-100">
                <th
                  scope="col"
                  className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 border-r border-slate-200/80 align-bottom"
                >
                  Summary
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 border-r border-slate-200/80 align-bottom"
                >
                  Listing SKUs
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 border-r border-slate-200/80 align-bottom"
                >
                  Parent SKUs
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 border-r border-slate-200/80 align-bottom"
                >
                  Time
                </th>
                <th scope="col" className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-right align-bottom">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n, rowIndex) => {
                const childText = n.childSkus?.length ? n.childSkus.join(', ') : '—';
                const parentText = n.parentSkus?.length ? n.parentSkus.join(', ') : '—';
                const busy = publishingId === n._id || dismissingId === n._id;
                const stripe = rowIndex % 2 === 1;

                return (
                  <tr
                    key={n._id}
                    className={`border-b border-slate-200 transition-colors hover:bg-slate-50 ${stripe ? 'bg-slate-50/40' : 'bg-white'}`}
                  >
                    <td className="px-4 py-3 align-middle border-r border-slate-100">
                      <p
                        className="text-xs font-medium text-slate-800 whitespace-nowrap truncate max-w-[28ch]"
                        title={n.message}
                      >
                        {pendingApprovalSummary(n)}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top border-r border-slate-100">
                      <p className="font-mono text-[11px] text-slate-700 break-all" title={childText}>
                        {childText}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top border-r border-slate-100">
                      <p className="font-mono text-[11px] text-slate-600 break-all" title={parentText}>
                        {parentText}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-middle border-r border-slate-100 whitespace-nowrap text-xs text-slate-500 tabular-nums">
                      {formatTime(n.createdAt)}
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => approveAndPublish(n._id)}
                          className="inline-flex items-center gap-1 rounded-md bg-[#E6007A] px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-pink-700 disabled:opacity-50"
                        >
                          <Upload className="h-3 w-3 shrink-0" />
                          {publishingId === n._id ? '…' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => dismiss(n._id)}
                          className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
                          title="Dismiss"
                          aria-label="Dismiss without publishing"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile: card rows with clear separators */}
          <div className="md:hidden divide-y divide-slate-200">
            {notifications.map((n) => {
              const childText = n.childSkus?.length ? n.childSkus.join(', ') : '—';
              const parentText = n.parentSkus?.length ? n.parentSkus.join(', ') : '—';
              const busy = publishingId === n._id || dismissingId === n._id;

              return (
                <div key={n._id} className="px-4 py-3.5 bg-white hover:bg-slate-50/80 transition-colors">
                  <div className="space-y-2.5">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Summary</p>
                      <p className="text-xs font-medium text-slate-800" title={n.message}>
                        {pendingApprovalSummary(n)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase text-slate-400 mb-0.5">Listing SKUs</p>
                        <p className="font-mono text-slate-700 break-all" title={childText}>
                          {childText}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase text-slate-400 mb-0.5">Parent SKUs</p>
                        <p className="font-mono text-slate-600 break-all" title={parentText}>
                          {parentText}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      <span className="text-xs text-slate-500 tabular-nums">{formatTime(n.createdAt)}</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => approveAndPublish(n._id)}
                          className="inline-flex items-center gap-1 rounded-md bg-[#E6007A] px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-pink-700 disabled:opacity-50"
                        >
                          <Upload className="h-3 w-3 shrink-0" />
                          {publishingId === n._id ? '…' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => dismiss(n._id)}
                          className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
                          title="Dismiss"
                          aria-label="Dismiss without publishing"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
