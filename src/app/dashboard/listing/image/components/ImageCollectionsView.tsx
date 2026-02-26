'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ChevronLeft, ChevronRight, AlertCircle, Trash2, Images } from 'lucide-react';
import { formatBytes } from '../utils/validation';
import { CollectionGalleryModal } from './CollectionGalleryModal';
import { ConfirmDialog } from '../../shared/ConfirmDialog/ConfirmDialog';

interface ImageCollectionItem {
  _id: string;
  name?: string;
  uploadType: string;
  imageCount: number;
  totalSize: number;
  status: string;
  createdAt: string;
}

export function ImageCollectionsView() {
  const [collections, setCollections] = useState<ImageCollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [galleryCollectionId, setGalleryCollectionId] = useState<string | null>(null);
  const [deleteConfirmCollection, setDeleteConfirmCollection] = useState<ImageCollectionItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('completed');
  const [filterUploadType, setFilterUploadType] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (filterStatus) params.set('status', filterStatus);
      if (filterUploadType) params.set('uploadType', filterUploadType);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/image-collection?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setCollections(result.data);
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
    fetchCollections();
  }, [fetchCollections]);

  const handleDeleteClick = (col: ImageCollectionItem) => {
    setDeleteConfirmCollection(col);
  };

  const handleDeleteConfirm = async () => {
    const col = deleteConfirmCollection;
    if (!col) return;

    setDeletingId(col._id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/image-collection?id=${encodeURIComponent(col._id)}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        setDeleteConfirmCollection(null);
        if (collections.length <= 1 && page > 1) {
          setPage(1);
        } else {
          await fetchCollections();
        }
      } else {
        setDeleteError(result.message || 'Failed to delete');
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-pink-100 text-[#E6007A]';
      case 'partial':
        return 'bg-amber-100 text-amber-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading && collections.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-[#E6007A]" />
      </div>
    );
  }

  const onFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="text-sm font-medium text-slate-600">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onFilterChange(setDateFrom, e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 transition-shadow"
          />
          <span className="text-sm font-medium text-slate-600">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onFilterChange(setDateTo, e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 transition-shadow"
          />
          <select
            value={filterStatus}
            onChange={(e) => onFilterChange(setFilterStatus, e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 min-w-[140px]"
          >
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="partial">Partial</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={filterUploadType}
            onChange={(e) => onFilterChange(setFilterUploadType, e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 min-w-[120px]"
          >
            <option value="">All types</option>
            <option value="zip">ZIP</option>
            <option value="folder">Folder</option>
            <option value="files">Files</option>
          </select>
        </div>
      </div>
      {deleteError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {deleteError}
        </div>
      )}

      {collections.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-700 font-medium">No image collections yet</p>
          <p className="text-sm text-slate-500 mt-1">Upload images from Image → Add Image to create collections.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Created</th>
                    <th className="text-left py-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Name</th>
                    <th className="text-left py-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Type</th>
                    <th className="text-left py-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                    <th className="text-right py-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Images</th>
                    <th className="text-right py-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Size</th>
                    <th className="text-right py-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider w-20">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {collections.map((col) => (
                    <tr key={col._id} className="hover:bg-pink-50/30 transition-colors">
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap text-xs">{formatDate(col.createdAt)}</td>
                      <td className="py-3.5 px-4 text-slate-900 font-medium">{col.name || '—'}</td>
                      <td className="py-3.5 px-4 text-slate-700 capitalize">{col.uploadType}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColor(col.status)}`}>
                          {col.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setGalleryCollectionId(col._id)}
                          className="inline-flex items-center gap-1.5 font-medium text-[#E6007A] hover:text-[#c4006a] transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                          title="View gallery"
                        >
                          <Images className="w-4 h-4" />
                          {col.imageCount}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-600">{formatBytes(col.totalSize)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(col)}
                          disabled={deletingId === col._id}
                          className="p-2 rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/30"
                          title="Delete collection and all images from S3"
                        >
                          {deletingId === col._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
              <p className="text-sm text-slate-600">
                Page {page} of {totalPages} <span className="text-slate-400">·</span> {total} total
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-pink-50 hover:border-pink-200 hover:text-[#E6007A] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-200 disabled:hover:text-slate-700 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-pink-50 hover:border-pink-200 hover:text-[#E6007A] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-200 disabled:hover:text-slate-700 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <CollectionGalleryModal
        collectionId={galleryCollectionId}
        onClose={() => setGalleryCollectionId(null)}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirmCollection}
        title="Delete collection"
        message={
          deleteConfirmCollection
            ? `Delete collection "${deleteConfirmCollection.name || 'Unnamed'}"? This will permanently remove ${deleteConfirmCollection.imageCount} image(s) from S3 and delete the collection from the database. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        loading={deletingId !== null}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmCollection(null)}
      />
    </div>
  );
}
