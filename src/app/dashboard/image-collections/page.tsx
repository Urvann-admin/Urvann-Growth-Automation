'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { 
  Upload, 
  Image as ImageIcon, 
  Loader2, 
  ArrowLeft,
  Search,
  Trash2,
  Eye,
  Calendar,
  HardDrive,
  FileArchive,
  FolderOpen,
  AlertCircle
} from 'lucide-react';

interface ImageCollection {
  _id: string;
  name?: string;
  description?: string;
  imageCount: number;
  totalSize?: number;
  source?: 'zip' | 'folder' | 'files';
  createdAt: string;
}

export default function ImageCollectionsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [collections, setCollections] = useState<ImageCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchCollections();
    }
  }, [user]);

  const fetchCollections = async () => {
    try {
      const url = searchTerm 
        ? `/api/image-collection?search=${encodeURIComponent(searchTerm)}`
        : '/api/image-collection';
      
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setCollections(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCollections();
  };

  const handleDelete = async (id: string, name?: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${name || 'this collection'}"?\n\nThis will remove the collection from the database but NOT delete the S3 images.`
    );

    if (!confirmed) return;

    setDeleting(id);
    try {
      const response = await fetch(`/api/image-collection/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setCollections(prev => prev.filter(c => c._id !== id));
      } else {
        alert('Failed to delete collection: ' + result.message);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete collection');
    } finally {
      setDeleting(null);
    }
  };

  const getSourceIcon = (source?: string) => {
    switch (source) {
      case 'zip':
        return <FileArchive className="w-4 h-4" />;
      case 'folder':
        return <FolderOpen className="w-4 h-4" />;
      default:
        return <ImageIcon className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back</span>
              </button>
              <div className="h-6 w-px bg-slate-300" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg">
                  <ImageIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Image Collections</h1>
                  <p className="text-sm text-slate-600">{collections.length} collection{collections.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/image-upload')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all font-medium shadow-md hover:shadow-lg"
            >
              <Upload className="w-4 h-4" />
              New Upload
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search collections by name..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-all"
            >
              Search
            </button>
            {searchTerm && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); fetchCollections(); }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium transition-all"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Collections Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : collections.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
            <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No collections yet</h3>
            <p className="text-slate-600 mb-6">Start by uploading your first image collection</p>
            <button
              onClick={() => router.push('/dashboard/image-upload')}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 font-medium transition-all shadow-md hover:shadow-lg"
            >
              Upload Images
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <div
                key={collection._id}
                className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden hover:shadow-xl transition-all group"
              >
                {/* Card Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-slate-600">
                      {getSourceIcon(collection.source)}
                      <span className="text-xs font-medium uppercase tracking-wide">
                        {collection.source || 'files'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => router.push(`/dashboard/image-collections/${collection._id}`)}
                        className="p-2 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="View collection"
                      >
                        <Eye className="w-4 h-4 text-emerald-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(collection._id, collection.name)}
                        disabled={deleting === collection._id}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete collection"
                      >
                        {deleting === collection._id ? (
                          <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-600" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2">
                    {collection.name || 'Untitled Collection'}
                  </h3>
                  
                  {collection.description && (
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                      {collection.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="flex items-center gap-2 text-sm">
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700 font-medium">{collection.imageCount}</span>
                      <span className="text-slate-500">images</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <HardDrive className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700 font-medium">{formatSize(collection.totalSize)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(collection.createdAt)}
                  </div>
                </div>

                {/* Hover Action */}
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
