'use client';

import { useState, useMemo } from 'react';
import { Search, X, Check, Loader2 } from 'lucide-react';
import type { SelectedImage, ImageCollection } from './types';

interface ImagePanelProps {
  collections: ImageCollection[];
  allImages: SelectedImage[];
  selectedImages: SelectedImage[];
  onToggleImage: (image: SelectedImage) => void;
  onClearSelection: () => void;
  isLoading: boolean;
}

export function ImagePanel({
  collections,
  allImages,
  selectedImages,
  onToggleImage,
  onClearSelection,
  isLoading,
}: ImagePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');

  const filteredImages = useMemo(() => {
    let filtered = allImages;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (image) =>
          image.filename.toLowerCase().includes(query) ||
          (image.collectionName && image.collectionName.toLowerCase().includes(query))
      );
    }

    if (selectedCollectionId) {
      filtered = filtered.filter((image) => image.collectionId === selectedCollectionId);
    }

    return filtered;
  }, [allImages, searchQuery, selectedCollectionId]);

  const isImageSelected = (image: SelectedImage) => {
    return selectedImages.some((img) => img.url === image.url);
  };

  const selectedCount = selectedImages.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        No images available
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters bar */}
      <div className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-colors"
          />
        </div>
        <select
          value={selectedCollectionId}
          onChange={(e) => setSelectedCollectionId(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none bg-white transition-colors"
        >
          <option value="">All collections</option>
          {collections.map((collection) => (
            <option key={collection._id} value={collection._id}>
              {collection.name || collection._id.slice(-6)} ({collection.imageCount})
            </option>
          ))}
        </select>
        {selectedCount > 0 && (
          <button
            onClick={onClearSelection}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Image grid */}
      <div className="flex-1 overflow-auto p-3">
        {filteredImages.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">No images found</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filteredImages.map((image) => {
              const isSelected = isImageSelected(image);
              const isTagged = image.isTagged;

              return (
                <div
                  key={image.url}
                  className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer group transition-all ${
                    isSelected
                      ? 'ring-2 ring-[#E6007A] ring-offset-2'
                      : isTagged
                      ? 'ring-2 ring-pink-300 ring-offset-2 opacity-60'
                      : 'hover:ring-2 hover:ring-pink-200 hover:ring-offset-2'
                  }`}
                  onClick={() => onToggleImage(image)}
                >
                  <img
                    src={`/api/image-collection/proxy?url=${encodeURIComponent(image.url)}`}
                    alt={image.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* Selection overlay */}
                  <div
                    className={`absolute inset-0 transition-opacity ${
                      isSelected || isTagged ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute top-2 right-2">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: '#E6007A' }}>
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      ) : isTagged ? (
                        <div className="w-6 h-6 bg-pink-400 rounded-full flex items-center justify-center shadow-sm">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 border-2 border-white rounded-full bg-black/20" />
                      )}
                    </div>
                  </div>

                  {/* Image info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 flex items-center justify-between gap-1">
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/60 text-white">
                      #{image.serial}
                    </span>
                    <p className="text-white text-xs truncate flex-1 text-right">{image.filename}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
