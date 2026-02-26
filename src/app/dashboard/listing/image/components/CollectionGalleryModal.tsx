'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, Image as ImageIcon } from 'lucide-react';

interface ImageItem {
  url: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

interface CollectionData {
  _id: string;
  name?: string;
  uploadType: string;
  imageCount: number;
  images: ImageItem[];
  totalSize: number;
  status: string;
}

interface CollectionGalleryModalProps {
  collectionId: string | null;
  onClose: () => void;
}

export function CollectionGalleryModal({ collectionId, onClose }: CollectionGalleryModalProps) {
  const [collection, setCollection] = useState<CollectionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!collectionId) {
      setCollection(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    setSelectedIndex(null);
    fetch(`/api/image-collection/${collectionId}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data) {
          setCollection(result.data);
        } else {
          setError(result.message || 'Failed to load collection');
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => setLoading(false));
  }, [collectionId]);

  const images = collection?.images ?? [];
  const selectedUrl = selectedIndex != null ? images[selectedIndex]?.url : null;

  const proxyUrl = (url: string | undefined) =>
    url ? `/api/image-collection/proxy?url=${encodeURIComponent(url)}` : '';

  const handlePrev = () => {
    if (selectedIndex == null) return;
    setSelectedIndex(selectedIndex <= 0 ? images.length - 1 : selectedIndex - 1);
  };

  const handleNext = () => {
    if (selectedIndex == null) return;
    setSelectedIndex(selectedIndex >= images.length - 1 ? 0 : selectedIndex + 1);
  };

  if (!collectionId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-900">
              {loading ? 'Loading...' : collection ? (collection.name || 'Gallery') : 'Gallery'}
            </h3>
            {collection && (
              <span className="text-sm text-slate-500">
                {collection.imageCount} image{collection.imageCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          )}

          {error && (
            <div className="py-8 text-center text-red-600 text-sm">{error}</div>
          )}

          {!loading && !error && collection && images.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-sm">No images in this collection.</div>
          )}

          {!loading && !error && images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img, index) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className="aspect-square rounded-lg overflow-hidden border-2 border-slate-200 hover:border-emerald-500 focus:border-emerald-500 focus:outline-none bg-slate-100"
                >
                  <img
                    src={proxyUrl(img.url)}
                    alt={img.filename}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for selected image */}
      {selectedUrl != null && images.length > 0 && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={(e) => e.target === e.currentTarget && setSelectedIndex(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedIndex(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          {selectedIndex !== null && selectedIndex > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Previous"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {selectedIndex !== null && selectedIndex < images.length - 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Next"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          <img
            src={selectedUrl ? proxyUrl(selectedUrl) : ''}
            alt={selectedIndex != null ? images[selectedIndex]?.filename ?? 'Image' : 'Image'}
            className="max-w-full max-h-[85vh] object-contain"
            onClick={(e) => e.stopPropagation()}
            referrerPolicy="no-referrer"
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
            {selectedIndex != null ? selectedIndex + 1 : 0} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
