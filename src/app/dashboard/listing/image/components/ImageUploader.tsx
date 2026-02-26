'use client';

import { useState, useEffect } from 'react';
import { Upload, FolderOpen, FileArchive, X, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import {
  clearFormStorageOnReload,
  getPersistedForm,
  setPersistedForm,
  removePersistedForm,
} from '../../hooks/useFormPersistence';
import { UploadProgress } from './UploadProgress';
import { UploadResult } from './UploadResult';
import { formatBytes } from '../utils/validation';

const FORM_STORAGE_KEY = 'listing_form_image';

type UploadMode = 'zip' | 'folder' | 'files';

interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    collectionId: string;
    collectionName?: string;
    imageCount: number;
    totalSize: number;
    urls: string[];
    duration: number;
    sessionId: string;
  };
  warnings?: string[];
  partialSuccess?: boolean;
  sessionId?: string;
}

export function ImageUploader() {
  const [uploadMode, setUploadMode] = useState<UploadMode>(() => {
    clearFormStorageOnReload(FORM_STORAGE_KEY);
    const saved = getPersistedForm<{ uploadMode: UploadMode; collectionName: string }>(FORM_STORAGE_KEY);
    return saved?.uploadMode ?? 'files';
  });
  const [collectionName, setCollectionName] = useState(() => {
    const saved = getPersistedForm<{ uploadMode: UploadMode; collectionName: string }>(FORM_STORAGE_KEY);
    return saved?.collectionName ?? '';
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);

  useEffect(() => {
    setPersistedForm(FORM_STORAGE_KEY, { uploadMode, collectionName });
  }, [uploadMode, collectionName]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setSelectedFiles(Array.from(files));
      setUploadResult(null);
    }
  };

  const handleZipSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFiles([file]);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    try {
      const formData = new FormData();
      
      if (uploadMode === 'zip') {
        formData.append('zip', selectedFiles[0]);
      } else {
        selectedFiles.forEach((file) => {
          formData.append('images', file);
        });
        formData.append('uploadType', uploadMode);
      }

      if (collectionName.trim()) {
        formData.append('name', collectionName.trim());
      }

      // Simulate progress (since we can't track real progress with fetch)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const endpoint = uploadMode === 'zip' 
        ? '/api/image-collection/upload-zip'
        : '/api/image-collection/upload-files';

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result: UploadResponse = await response.json();
      setUploadResult(result);

      if (result.success) {
        removePersistedForm(FORM_STORAGE_KEY);
        setSelectedFiles([]);
        setCollectionName('');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed',
      });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setUploadResult(null);
    setCollectionName('');
  };

  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="space-y-4">
      {/* Upload Mode Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Upload Mode</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setUploadMode('files');
              setSelectedFiles([]);
            }}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
              uploadMode === 'files'
                ? 'border-[#E6007A] bg-pink-50 text-[#E6007A]'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <ImageIcon className="w-5 h-5" />
            <span className="text-xs font-medium">Files</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setUploadMode('folder');
              setSelectedFiles([]);
            }}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
              uploadMode === 'folder'
                ? 'border-[#E6007A] bg-pink-50 text-[#E6007A]'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <FolderOpen className="w-5 h-5" />
            <span className="text-xs font-medium">Folder</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setUploadMode('zip');
              setSelectedFiles([]);
            }}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
              uploadMode === 'zip'
                ? 'border-[#E6007A] bg-pink-50 text-[#E6007A]'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <FileArchive className="w-5 h-5" />
            <span className="text-xs font-medium">ZIP</span>
          </button>
        </div>
      </div>

      {/* Collection Name Input */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <label htmlFor="collectionName" className="block text-sm font-semibold text-slate-900 mb-2">
          Collection Name <span className="text-slate-400 font-normal">(Optional)</span>
        </label>
        <input
          type="text"
          id="collectionName"
          value={collectionName}
          onChange={(e) => setCollectionName(e.target.value)}
          placeholder="e.g., Summer 2026 Products"
          disabled={uploading}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
        />
      </div>

      {/* File Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          {uploadMode === 'zip' ? 'Select ZIP File' : uploadMode === 'folder' ? 'Select Folder' : 'Select Images'}
        </h3>
        
        {uploadMode === 'zip' ? (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-pink-500 hover:bg-pink-50 transition-all">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <FileArchive className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm text-slate-600">
                <span className="font-semibold">Click to upload ZIP</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">Max 100MB</p>
            </div>
            <input
              type="file"
              accept=".zip"
              onChange={handleZipSelect}
              disabled={uploading}
              className="hidden"
            />
          </label>
        ) : uploadMode === 'folder' ? (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-pink-500 hover:bg-pink-50 transition-all">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <FolderOpen className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm text-slate-600">
                <span className="font-semibold">Click to select folder</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">Max 500 images</p>
            </div>
            <input
              type="file"
              multiple
              // @ts-ignore - webkitdirectory is not in TypeScript types
              webkitdirectory=""
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
          </label>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-pink-500 hover:bg-pink-50 transition-all">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm text-slate-600">
                <span className="font-semibold">Click to upload images</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP up to 10MB each</p>
            </div>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">
                {selectedFiles.length} {uploadMode === 'zip' ? 'ZIP file' : selectedFiles.length === 1 ? 'file' : 'files'} selected
              </span>
              <button
                type="button"
                onClick={handleReset}
                disabled={uploading}
                className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
              >
                Clear
              </button>
            </div>
            <div className="text-xs text-slate-600">
              Total size: {formatBytes(totalSize)}
            </div>
            {uploadMode !== 'zip' && selectedFiles.length > 5 && (
              <div className="mt-2 text-xs text-slate-500">
                Showing first 5 of {selectedFiles.length} files
              </div>
            )}
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {selectedFiles.slice(0, uploadMode === 'zip' ? 1 : 5).map((file, index) => (
                <div key={index} className="text-xs text-slate-600 truncate">
                  • {file.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upload Button */}
      <button
        type="button"
        onClick={handleUpload}
        disabled={uploading || selectedFiles.length === 0}
        className="w-full py-3 px-4 rounded-xl font-semibold text-white hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 bg-slate-300"
        style={selectedFiles.length > 0 && !uploading ? { backgroundColor: '#E6007A' } : undefined}
      >
        {uploading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            Upload {uploadMode === 'zip' ? 'ZIP' : 'Images'}
          </>
        )}
      </button>

      {/* Progress */}
      {uploading && <UploadProgress progress={uploadProgress} />}

      {/* Upload Result - fixed top right */}
      {uploadResult && (
        <div className="fixed top-4 right-4 z-50 w-full max-w-md">
          <UploadResult result={uploadResult} onClose={() => setUploadResult(null)} />
        </div>
      )}
    </div>
  );
}
