'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Upload, Download, FileText, X, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

export default function DataUploadPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  const validExtensions = ['.csv', '.xlsx', '.xls'];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
      if (validTypes.includes(selectedFile.type) || validExtensions.includes(fileExtension)) {
        setFile(selectedFile);
        setUploadResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        alert('Please select a valid CSV or XLSX file');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/data-upload/categories', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setUploadResult(result);

      if (result.success) {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (error: any) {
      setUploadResult({
        success: false,
        message: 'Failed to upload file: ' + error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/data-upload/template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'category-upload-template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert('Failed to download template: ' + error.message);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Wait for auth to finish loading before checking user
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-emerald-500 border-t-transparent"></div>
          <p className="text-slate-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  if (user.role !== 'admin' && user.role !== 'manager') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-sm">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Data Upload</h1>
                <p className="text-xs text-slate-500">Upload category data from CSV/XLSX files</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto py-6 px-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900">Upload Categories</h2>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium"
              title="Download template"
            >
              <Download className="w-4 h-4" />
              <span>Download Template</span>
            </button>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Upload a CSV or XLSX with category data. Rows with a new or missing <span className="font-mono text-xs bg-slate-100 px-1 rounded">_id</span> are added as new categories. Rows with an existing <span className="font-mono text-xs bg-slate-100 px-1 rounded">_id</span> overwrite that category with the data from the file. Required columns: category, alias, typeOfCategory.
          </p>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
            {file ? (
              <div className="space-y-4">
                <FileText className="w-10 h-10 text-indigo-600 mx-auto" />
                <p className="text-sm font-medium text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                <button
                  onClick={handleRemoveFile}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm"
                >
                  <X className="w-4 h-4" />
                  <span>Remove</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-10 h-10 text-slate-400 mx-auto" />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                >
                  <Upload className="w-4 h-4" />
                  <span>Select File</span>
                </label>
                <input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}
          </div>
          {file && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload File</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Upload Result */}
        {uploadResult && (
          <div
            className={`mt-6 rounded-xl shadow-sm border p-6 ${
              uploadResult.success
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-rose-50 border-rose-200'
            }`}
          >
            <div className="flex items-start space-x-3">
              {uploadResult.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5" />
              )}
              <div className="flex-1">
                <h3
                  className={`text-sm font-semibold mb-1 ${
                    uploadResult.success ? 'text-emerald-900' : 'text-rose-900'
                  }`}
                >
                  {uploadResult.success ? 'Upload Successful' : 'Upload Failed'}
                </h3>
                <p
                  className={`text-sm ${
                    uploadResult.success ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {uploadResult.message}
                </p>
                {uploadResult.details && (
                  <div className="mt-3 text-xs text-slate-600">
                    <pre className="bg-white p-3 rounded border border-slate-200 overflow-auto max-h-48">
                      {JSON.stringify(uploadResult.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

