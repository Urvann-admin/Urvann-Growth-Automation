'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, X, Check, Image as ImageIcon, Loader2 } from 'lucide-react';
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
  isLoading 
}: ImagePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [showTaggedImages, setShowTaggedImages] = useState(true);

  // Use the allImages prop directly

  // Filter images based on search and filters
  const filteredImages = useMemo(() => {
    let filtered = allImages;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(image => 
        image.filename.toLowerCase().includes(query) ||
        (image.collectionName && image.collectionName.toLowerCase().includes(query))
      );
    }

    // Filter by collection
    if (selectedCollectionId) {
      filtered = filtered.filter(image => image.collectionId === selectedCollectionId);
    }

    // Filter by tagged status
    if (!showTaggedImages) {
      filtered = filtered.filter(image => !image.isTagged);
    }

    return filtered;
  }, [allImages, searchQuery, selectedCollectionId, showTaggedImages]);

  const isImageSelected = (image: SelectedImage) => {
    return selectedImages.some(img => img.url === image.url);
  };

  const handleImageClick = (image: SelectedImage) => {
    // Simple toggle selection – tagging is now serial-based on save
    onToggleImage(image);
  };

  const selectedCount = selectedImages.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        No images
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* One row: search + filters */}
      <div className="p-3 border-b border-slate-200 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <select
          value={selectedCollectionId}
          onChange={(e) => setSelectedCollectionId(e.target.value)}
          className="text-sm border border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">All</option>
          {collections.map(collection => (
            <option key={collection._id} value={collection._id}>
              {collection.name || collection._id.slice(-6)} ({collection.imageCount})
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={showTaggedImages}
            onChange={(e) => setShowTaggedImages(e.target.checked)}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          Tagged
        </label>
        {selectedCount > 0 && (
          <button onClick={onClearSelection} className="text-slate-400 hover:text-slate-600 p-1" title="Clear">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Image Grid */}
      <div className="flex-1 overflow-auto p-3">
        {filteredImages.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">No images</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredImages.map((image) => {
              const isSelected = isImageSelected(image);
              const isTagged = image.isTagged;
              
              return (
                <div
                  key={image.url}
                  className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer group transition-all ${
                    isSelected 
                      ? 'ring-2 ring-emerald-500 ring-offset-2' 
                      : isTagged
                      ? 'ring-2 ring-blue-300 ring-offset-2 opacity-60'
                      : 'hover:ring-2 hover:ring-slate-300 hover:ring-offset-2'
                  }`}
                  onClick={() => handleImageClick(image)}
                >
                  <img
                    src={`/api/image-collection/proxy?url=${encodeURIComponent(image.url)}`}
                    alt={image.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* Selection overlay */}
                  <div className={`absolute inset-0 transition-opacity ${
                    isSelected || isTagged ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    <div className="absolute inset-0 bg-black/20" />
                    
                    {/* Selection indicator */}
                    <div className="absolute top-2 right-2">
                      {isSelected ? (
                        <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      ) : isTagged ? (
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 border-2 border-white rounded-full bg-black/20" />
                      )}
                    </div>
                  </div>

                  {/* Image info - serial + filename */}
                  <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent p-1.5 flex items-center justify-between gap-1">
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