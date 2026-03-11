'use client';

import { useState, useMemo } from 'react';
import { Search, Loader2, Image as ImageIcon } from 'lucide-react';
import type { SelectedImage, ImageCollection } from './types';
import type { ProductRow } from './types';

interface ImagePanelProps {
  /** Current product row (for single-photo view) */
  activeRow: ProductRow | null;
  /** All product rows (for fallback image by index) */
  productRows: ProductRow[];
  collections: ImageCollection[];
  allImages: SelectedImage[];
  /** Assign this image to the active product row */
  onAssignImage: (rowId: string, image: SelectedImage) => void;
  isLoading: boolean;
}

export function ImagePanel({
  activeRow,
  productRows,
  collections,
  allImages,
  onAssignImage,
  isLoading,
}: ImagePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const filteredImages = useMemo(() => {
    let filtered = allImages;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (img) =>
          img.filename.toLowerCase().includes(query) ||
          (img.collectionName && img.collectionName.toLowerCase().includes(query))
      );
    }
    if (selectedCollectionId) {
      filtered = filtered.filter((img) => img.collectionId === selectedCollectionId);
    }
    return filtered;
  }, [allImages, searchQuery, selectedCollectionId]);

  /** The one photo to show: active row's tagged image, or fallback by row index */
  const displayImage: SelectedImage | null = useMemo(() => {
    if (!activeRow) return null;
    if (activeRow.taggedImages && activeRow.taggedImages.length > 0) {
      return activeRow.taggedImages[0];
    }
    const idx = productRows.findIndex((r) => r.id === activeRow.id);
    if (idx >= 0 && allImages[idx]) return allImages[idx];
    return null;
  }, [activeRow, productRows, allImages]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-slate-500 text-sm p-4">
        No images available
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Single photo area */}
      <div className="flex-1 min-h-0 flex flex-col p-3">
        <div className="aspect-square w-full max-w-sm mx-auto rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
          {displayImage ? (
            <img
              src={`/api/image-collection/proxy?url=${encodeURIComponent(displayImage.url)}`}
              alt={displayImage.filename}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-slate-400 flex flex-col items-center gap-2">
              <ImageIcon className="w-12 h-12" />
              <span className="text-xs">No photo selected</span>
            </div>
          )}
        </div>
        {displayImage && (
          <p className="text-xs text-slate-500 text-center mt-2 truncate px-2" title={displayImage.filename}>
            {displayImage.filename}
          </p>
        )}
      </div>

      {/* Search and collection filter */}
      <div className="p-3 border-t border-slate-200 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
          />
        </div>
        <select
          value={selectedCollectionId}
          onChange={(e) => setSelectedCollectionId(e.target.value)}
          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none bg-white"
        >
          <option value="">All collections</option>
          {collections.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name || c._id.slice(-6)} ({c.imageCount})
            </option>
          ))}
        </select>

        {/* Select another photo (only when a product is selected) */}
        {activeRow && (
          <>
        <p className="text-xs font-medium text-slate-600 pt-1">Select photo for this product</p>
        <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50">
          {filteredImages.length === 0 ? (
            <div className="p-3 text-center text-slate-500 text-sm">No images found</div>
          ) : (
            <div className="p-2 grid grid-cols-3 gap-1.5">
              {filteredImages.map((img) => {
                const isCurrent = displayImage?.url === img.url;
                return (
                  <button
                    key={img.url}
                    type="button"
                    onClick={() => {
                      if (activeRow) onAssignImage(activeRow.id, img);
                    }}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      isCurrent ? 'border-[#E6007A] ring-1 ring-[#E6007A]' : 'border-transparent hover:border-pink-200'
                    }`}
                  >
                    <img
                      src={`/api/image-collection/proxy?url=${encodeURIComponent(img.url)}`}
                      alt={img.filename}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
