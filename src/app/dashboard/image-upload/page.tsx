'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { 
  Upload, 
  FileArchive, 
  FolderOpen, 
  Image as ImageIcon, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  X,
  Info,
  Sparkles
} from 'lucide-react';
import { LogsViewer } from '@/components/image-collection/LogsViewer';

type UploadMode = 'single' | 'multiple' | 'folder' | 'zip';

interface UploadLogEntry {
  timestamp: string | Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: Record<string, any>;
}

interface UploadResult {
  success: boolean;
  collection?: {
    id: string;
    name: string;
    imageCount: number;
    totalSize: number;
  };
  stats?: {
    extracted?: number;
    uploaded: number;
    failed: number;
    skipped?: number;
    duration?: string;
  };
  uploadLog?: UploadLogEntry[];
  message: string;
  warnings?: string[];
}

export default function ImageUploadPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [mode, setMode] = useState<UploadMode>('multiple');
  const [files, setFiles] = useState<File[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [collectionName, setCollectionName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setUploadResult(null);

    const droppedFiles = Array.from(e.dataTransfer.files);
    
    if (mode === 'zip') {
      const zipFiles = droppedFiles.filter(f => f.name.endsWith('.zip'));
      if (zipFiles.length > 0) {
        setZipFile(zipFiles[0]);
      }
    } else {
      const imageFiles = droppedFiles.filter(f => 
        f.type.startsWith('image/')
      );
      
      // For single mode, only take the first file
      if (mode === 'single') {
        setFiles(imageFiles.slice(0, 1));
      } else {
        setFiles(prev => [...prev, ...imageFiles]);
      }
    }
  }, [mode]);

  // File selection handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      // For single mode, only take the first file
      if (mode === 'single') {
        setFiles(selectedFiles.slice(0, 1));
      } else {
        setFiles(prev => [...prev, ...selectedFiles]);
      }
      
      setUploadResult(null);
    }
  };

  const handleZipSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setZipFile(e.target.files[0]);
      setUploadResult(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
    setZipFile(null);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
    if (zipInputRef.current) zipInputRef.current.value = '';
  };

  // Upload handlers
  const handleUpload = async () => {
    if (mode === 'zip' && !zipFile) {
      alert('Please select a ZIP file');
      return;
    }
    if ((mode === 'single' || mode === 'multiple' || mode === 'folder') && files.length === 0) {
      alert('Please select at least one image file');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('name', collectionName);
      formData.append('description', description);
      formData.append('source', mode === 'single' ? 'single' : mode);

      if (mode === 'zip' && zipFile) {
        formData.append('zip', zipFile);
        
        const response = await fetch('/api/image-collection/upload-zip', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        setUploadResult(result);

        if (result.success) {
          clearAll();
          setCollectionName('');
          setDescription('');
        }
      } else {
        files.forEach(file => {
          formData.append('images', file);
        });

        const response = await fetch('/api/image-collection/upload-files', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        setUploadResult(result);

        if (result.success) {
          clearAll();
          setCollectionName('');
          setDescription('');
        }
      }
    } catch (error: any) {
      setUploadResult({
        success: false,
        message: 'Failed to upload: ' + error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const canUpload = (mode === 'zip' && zipFile) || (files.length > 0 && !uploading);

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
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Image Collection Uploader</h1>
                  <p className="text-sm text-slate-600">Upload images via ZIP, folder, or files</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/image-collections')}
              className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-all font-medium"
            >
              View Collections
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mode Selection */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Choose Upload Method
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Single Image Mode */}
            <button
              onClick={() => { setMode('single'); clearAll(); }}
              className={`p-6 rounded-xl border-2 transition-all ${
                mode === 'single'
                  ? 'border-emerald-500 bg-emerald-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
              }`}
            >
              <ImageIcon className={`w-8 h-8 mx-auto mb-3 ${mode === 'single' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <h3 className="font-semibold text-slate-900 mb-1">Single Image</h3>
              <p className="text-sm text-slate-600">Upload one image</p>
            </button>

            {/* Multiple Files Mode */}
            <button
              onClick={() => { setMode('multiple'); clearAll(); }}
              className={`p-6 rounded-xl border-2 transition-all ${
                mode === 'multiple'
                  ? 'border-emerald-500 bg-emerald-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
              }`}
            >
              <ImageIcon className={`w-8 h-8 mx-auto mb-3 ${mode === 'multiple' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <h3 className="font-semibold text-slate-900 mb-1">Bulk Upload</h3>
              <p className="text-sm text-slate-600">Multiple images</p>
            </button>

            {/* Folder Mode */}
            <button
              onClick={() => { setMode('folder'); clearAll(); }}
              className={`p-6 rounded-xl border-2 transition-all ${
                mode === 'folder'
                  ? 'border-emerald-500 bg-emerald-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
              }`}
            >
              <FolderOpen className={`w-8 h-8 mx-auto mb-3 ${mode === 'folder' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <h3 className="font-semibold text-slate-900 mb-1">Folder Upload</h3>
              <p className="text-sm text-slate-600">Upload entire folder</p>
            </button>

            {/* ZIP Mode */}
            <button
              onClick={() => { setMode('zip'); clearAll(); }}
              className={`p-6 rounded-xl border-2 transition-all ${
                mode === 'zip'
                  ? 'border-emerald-500 bg-emerald-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
              }`}
            >
              <FileArchive className={`w-8 h-8 mx-auto mb-3 ${mode === 'zip' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <h3 className="font-semibold text-slate-900 mb-1">ZIP File</h3>
              <p className="text-sm text-slate-600">Upload ZIP archive</p>
            </button>
          </div>
        </div>

        {/* Collection Info */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Collection Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Collection Name <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                placeholder="e.g., Summer 2025 Products"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for this collection..."
                rows={2}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {mode === 'single' ? 'Upload Single Image' : mode === 'zip' ? 'Upload ZIP File' : mode === 'folder' ? 'Upload Folder' : 'Upload Multiple Images'}
          </h2>

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              dragActive
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-300 bg-slate-50/50 hover:border-emerald-400 hover:bg-emerald-50/50'
            }`}
          >
            <Upload className={`w-16 h-16 mx-auto mb-4 ${dragActive ? 'text-emerald-600 animate-bounce' : 'text-slate-400'}`} />
            <p className="text-lg font-medium text-slate-900 mb-2">
              {dragActive ? 'Drop files here!' : mode === 'single' ? 'Drag & drop one image here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-slate-600 mb-6">or</p>

            {/* File Input Buttons */}
            <input
              ref={mode === 'single' || mode === 'multiple' ? fileInputRef : folderInputRef}
              type="file"
              multiple={mode !== 'single' && mode !== 'zip'}
              accept={mode === 'zip' ? '.zip' : 'image/*'}
              {...(mode === 'folder' && { webkitdirectory: '', directory: '' } as any)}
              onChange={mode === 'zip' ? handleZipSelect : handleFileSelect}
              className="hidden"
            />
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip"
              onChange={handleZipSelect}
              className="hidden"
            />

            <button
              onClick={() => {
                if (mode === 'zip') {
                  zipInputRef.current?.click();
                } else if (mode === 'folder') {
                  folderInputRef.current?.click();
                } else {
                  fileInputRef.current?.click();
                }
              }}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 font-medium transition-all shadow-md hover:shadow-lg"
            >
              Browse {mode === 'zip' ? 'ZIP File' : mode === 'folder' ? 'Folder' : mode === 'single' ? 'Image' : 'Files'}
            </button>

            {/* Info Badge */}
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <Info className="w-4 h-4" />
              <span>
                {mode === 'single' 
                  ? 'Max 10MB per image'
                  : mode === 'zip' 
                    ? 'Max 200MB ZIP, 500 images'
                    : 'Max 200 files, 10MB per file'}
              </span>
            </div>
          </div>

          {/* Selected Files Preview */}
          {mode === 'zip' && zipFile && (
            <div className="mt-6">
              <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileArchive className="w-8 h-8 text-emerald-600" />
                  <div>
                    <p className="font-medium text-slate-900">{zipFile.name}</p>
                    <p className="text-sm text-slate-600">{(zipFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  onClick={() => setZipFile(null)}
                  className="p-2 hover:bg-emerald-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>
          )}

          {(mode === 'single' || mode === 'multiple' || mode === 'folder') && files.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-700">
                  {files.length} file{files.length !== 1 ? 's' : ''} selected ({(totalSize / 1024 / 1024).toFixed(2)} MB)
                </p>
                <button
                  onClick={clearAll}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Clear All
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <ImageIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                        <p className="text-xs text-slate-600">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1.5 hover:bg-slate-200 rounded transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="mt-6">
            <button
              onClick={handleUpload}
              disabled={!canUpload}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all shadow-lg ${
                canUpload
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-xl'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </span>
              ) : (
                `Upload ${mode === 'single' ? '1 Image' : mode === 'zip' ? 'ZIP' : files.length + ' Image' + (files.length !== 1 ? 's' : '')}`
              )}
            </button>
          </div>
        </div>

        {/* Result */}
        {uploadResult && (
          <div className={`rounded-2xl shadow-lg border p-6 ${
            uploadResult.success 
              ? 'bg-emerald-50 border-emerald-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-4">
              {uploadResult.success ? (
                <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className={`font-semibold mb-2 ${uploadResult.success ? 'text-emerald-900' : 'text-red-900'}`}>
                  {uploadResult.success ? 'Upload Successful!' : 'Upload Failed'}
                </h3>
                <p className={`text-sm mb-4 ${uploadResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
                  {uploadResult.message}
                </p>

                {uploadResult.collection && (
                  <div className="bg-white rounded-lg p-4 mb-4 border border-emerald-200">
                    <h4 className="font-medium text-slate-900 mb-2">Collection Created</h4>
                    <div className="space-y-1 text-sm text-slate-700">
                      <p><span className="font-medium">Name:</span> {uploadResult.collection.name}</p>
                      <p><span className="font-medium">Images:</span> {uploadResult.collection.imageCount}</p>
                      <p><span className="font-medium">Size:</span> {(uploadResult.collection.totalSize / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                )}

                {uploadResult.stats && (
                  <div className="bg-white rounded-lg p-4 mb-4 border border-emerald-200">
                    <h4 className="font-medium text-slate-900 mb-2">Upload Statistics</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                      {uploadResult.stats.extracted && (
                        <p><span className="font-medium">Extracted:</span> {uploadResult.stats.extracted}</p>
                      )}
                      <p><span className="font-medium">Uploaded:</span> {uploadResult.stats.uploaded}</p>
                      <p><span className="font-medium">Failed:</span> {uploadResult.stats.failed}</p>
                      {uploadResult.stats.skipped !== undefined && (
                        <p><span className="font-medium">Skipped:</span> {uploadResult.stats.skipped}</p>
                      )}
                      {uploadResult.stats.duration && (
                        <p className="col-span-2"><span className="font-medium">Duration:</span> {uploadResult.stats.duration}</p>
                      )}
                    </div>
                  </div>
                )}

                {uploadResult.uploadLog && uploadResult.uploadLog.length > 0 && (
                  <div className="mb-4">
                    <LogsViewer logs={uploadResult.uploadLog} />
                  </div>
                )}

                {uploadResult.warnings && uploadResult.warnings.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-medium text-amber-900 mb-2">Warnings</h4>
                    <ul className="text-sm text-amber-700 space-y-1">
                      {uploadResult.warnings.map((warning, idx) => (
                        <li key={idx}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {uploadResult.success && uploadResult.collection && (
                  <button
                    onClick={() => router.push(`/dashboard/image-collections/${uploadResult.collection!.id}`)}
                    className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-all"
                  >
                    View Collection
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
