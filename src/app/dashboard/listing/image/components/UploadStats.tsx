'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Image as ImageIcon, HardDrive, TrendingUp } from 'lucide-react';
import { formatBytes } from '../utils/validation';

interface Stats {
  totalCollections: number;
  totalImages: number;
  totalSize: number;
  avgImagesPerCollection: number;
}

export function UploadStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/image-collection/stats');
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl shadow-sm border border-emerald-200 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-emerald-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 bg-emerald-200 rounded"></div>
            <div className="h-16 bg-emerald-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl shadow-sm border border-emerald-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-emerald-700" />
        <h3 className="text-sm font-semibold text-emerald-900">Upload Statistics</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/80 rounded-lg p-3 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            <div className="text-xs text-slate-600">Collections</div>
          </div>
          <div className="text-xl font-bold text-slate-900">{stats.totalCollections}</div>
        </div>
        
        <div className="bg-white/80 rounded-lg p-3 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <div className="text-xs text-slate-600">Total Images</div>
          </div>
          <div className="text-xl font-bold text-slate-900">{stats.totalImages}</div>
        </div>
        
        <div className="bg-white/80 rounded-lg p-3 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <HardDrive className="w-4 h-4 text-emerald-600" />
            <div className="text-xs text-slate-600">Storage</div>
          </div>
          <div className="text-sm font-bold text-slate-900">
            {formatBytes(stats.totalSize)}
          </div>
        </div>
        
        <div className="bg-white/80 rounded-lg p-3 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <div className="text-xs text-slate-600">Avg/Collection</div>
          </div>
          <div className="text-sm font-bold text-slate-900">
            {Math.round(stats.avgImagesPerCollection)}
          </div>
        </div>
      </div>
    </div>
  );
}
