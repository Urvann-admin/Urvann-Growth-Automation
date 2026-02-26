'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, X, Image as ImageIcon, Folder, AlertCircle, Check } from 'lucide-react';
import type { ImageCollection, ImageItem } from '@/app/dashboard/listing/image/models/imageCollection';

export interface ImageCollectionDropdownProps {
  selectedImages: string[];
  onSelectionChange: (imageUrls: string[]) => void;
  filterByCollectionIds?: string[];
  disabled?: boolean;
  maxSelections?: number;
  className?: string;
}

export function ImageCollectionDropdown({
  selectedImages,
  onSelectionChange,
  filterByCollectionIds = [],
  disabled = false,
  maxSelections,
  className = '',
}: ImageCollectionDropdownProps) {
  const [collections, setCollections] = useState<ImageCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch image collections
  useEffect(() => {
    const fetchCollections = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/image-collection?status=completed&limit=100');
        const result = await response.json();

        if (result.success) {
          let collectionsData = result.data || [];
          
          // Filter by collection IDs if provided
          if (filterByCollectionIds.length > 0) {
            collectionsData = collectionsData.filter((collection: ImageCollection) =>
              filterByCollectionIds.includes(String(collection._id))
            );
          }
          
          setCollections(collectionsData);
        } else {
          setError(result.message || 'Failed to fetch image collections');
        }
      } catch (err) {
        setError('Failed to fetch image collections');
        console.error('Error fetching image collections:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, [filterByCollectionIds]);

  // Filter collections based on search
  const filteredCollections = useMemo(() => {
    if (!searchTerm) return collections;
    
    const term = searchTerm.toLowerCase();
    return collections.filter(collection =>
      (collection.name?.toLowerCase().includes(term)) ||
      collection.images.some(image => 
        image.filename.toLowerCase().includes(term)
      )
    );
  }, [collections, searchTerm]);

  // Get images from selected collection
  const availableImages = useMemo(() => {
    if (!selectedCollection) return [];
    
    const collection = collections.find(c => String(c._id) === selectedCollection);
    return collection?.images || [];
  }, [collections, selectedCollection]);

  // Filter images based on search within collection
  const filteredImages = useMemo(() => {
    if (!searchTerm) return availableImages;
    
    const term = searchTerm.toLowerCase();
    return availableImages.filter(image =>
      image.filename.toLowerCase().includes(term)
    );
  }, [availableImages, searchTerm]);

  const handleImageToggle = (image: ImageItem) => {
    if (disabled) return;

    const imageUrl = image.url;
    if (selectedImages.includes(imageUrl)) {
      // Remove from selection
      onSelectionChange(selectedImages.filter(url => url !== imageUrl));
    } else {
      // Add to selection (check max limit)
      if (maxSelections && selectedImages.length >= maxSelections) {
        return; // Don't add if at max limit
      }
      onSelectionChange([...selectedImages, imageUrl]);
    }
  };

  const handleRemoveSelected = (imageUrl: string) => {
    if (disabled) return;
    onSelectionChange(selectedImages.filter(url => url !== imageUrl));
  };

  const clearSelection = () => {
    if (disabled) return;
    onSelectionChange([]);
  };

  const getSelectedImageDetails = () => {
    const details: Array<{ url: string; filename: string; collection: string }> = [];
    
    for (const imageUrl of selectedImages) {
      for (const collection of collections) {
        const image = collection.images.find(img => img.url === imageUrl);
        if (image) {
          details.push({
            url: imageUrl,
            filename: image.filename,
            collection: collection.name || `Collection ${collection._id}`,
          });
          break;
        }
      }
    }
    
    return details;
  };

  const selectedImageDetails = getSelectedImageDetails();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Selected Images Display */}
      {selectedImages.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Selected Images ({selectedImages.length}
              {maxSelections && ` / ${maxSelections}`})
            </label>
            <button
              type="button"
              onClick={clearSelection}
              disabled={disabled}
              className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              Clear All
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {selectedImageDetails.map((imageDetail) => (
              <div
                key={imageDetail.url}
                className="relative group bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="aspect-square">
                  <img
                    src={imageDetail.url}
                    alt={imageDetail.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {imageDetail.filename}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {imageDetail.collection}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSelected(imageDetail.url)}
                  disabled={disabled}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collection and Image Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Select Images from Collections
          {filterByCollectionIds.length > 0 && (
            <span className="text-gray-500 ml-1">
              (filtered by parent collections)
            </span>
          )}
        </label>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={selectedCollection ? "Search images..." : "Search collections..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsDropdownOpen(true)}
            disabled={disabled}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Dropdown */}
        {isDropdownOpen && (
          <div className="relative">
            <div className="absolute top-0 left-0 right-0 z-10 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
              {/* Back to collections button */}
              {selectedCollection && (
                <div className="p-2 border-b border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCollection(null);
                      setSearchTerm('');
                    }}
                    className="text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    ← Back to Collections
                  </button>
                </div>
              )}

              {loading && (
                <div className="p-4 text-center text-gray-500">
                  Loading image collections...
                </div>
              )}
              
              {error && (
                <div className="p-4 text-center text-red-600 flex items-center justify-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
              
              {!loading && !error && !selectedCollection && filteredCollections.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No image collections found
                </div>
              )}

              {!loading && !error && !selectedCollection && filteredCollections.length > 0 && (
                <div className="py-2">
                  {filteredCollections.map((collection) => (
                    <button
                      key={String(collection._id)}
                      type="button"
                      onClick={() => {
                        setSelectedCollection(String(collection._id));
                        setSearchTerm('');
                      }}
                      disabled={disabled}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Folder className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {collection.name || `Collection ${collection._id}`}
                        </div>
                        <div className="text-sm text-gray-500">
                          {collection.imageCount} images • {(collection.totalSize / 1024 / 1024).toFixed(1)} MB
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!loading && !error && selectedCollection && filteredImages.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No images found in this collection
                </div>
              )}

              {!loading && !error && selectedCollection && filteredImages.length > 0 && (
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-3">
                    {filteredImages.map((image) => {
                      const isSelected = selectedImages.includes(image.url);
                      const isAtMaxLimit = maxSelections && selectedImages.length >= maxSelections && !isSelected;
                      
                      return (
                        <button
                          key={image.url}
                          type="button"
                          onClick={() => handleImageToggle(image)}
                          disabled={Boolean(disabled || isAtMaxLimit)}
                          className={`relative group aspect-square rounded-lg overflow-hidden border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            isSelected 
                              ? 'border-emerald-500 ring-2 ring-emerald-200' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={image.url}
                            alt={image.filename}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-emerald-500 bg-opacity-20 flex items-center justify-center">
                              <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                            {image.filename}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="p-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(false)}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}

      {/* Max selections warning */}
      {maxSelections && selectedImages.length >= maxSelections && (
        <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Maximum of {maxSelections} images can be selected</span>
          </div>
        </div>
      )}
    </div>
  );
}