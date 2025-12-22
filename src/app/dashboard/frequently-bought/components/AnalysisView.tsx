import { Loader2 } from 'lucide-react';
import { DataTable } from '@/components/tables/DataTable';
import { FrequentlyBoughtItem, FrequentlyBoughtPagination } from '@/types/frequentlyBought';
import Pagination from './Pagination';

interface AnalysisViewProps {
  loading: boolean;
  loadingAnalysis: boolean;
  analysisData: FrequentlyBoughtItem[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: any[];
  pagination: FrequentlyBoughtPagination;
  onPageChange: (page: number) => void;
  getPageNumbers: () => (number | string)[];
}

export default function AnalysisView({
  loading,
  loadingAnalysis,
  analysisData,
  columns,
  pagination,
  onPageChange,
  getPageNumbers,
}: AnalysisViewProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
      {/* Loading Overlay */}
      {loadingAnalysis && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-indigo-200 rounded-full"></div>
              <div className="absolute inset-0 w-12 h-12 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-slate-600 text-sm font-medium">Searching...</p>
          </div>
        </div>
      )}

      {loading && !loadingAnalysis ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-slate-500 text-sm">Analyzing patterns...</p>
          </div>
        </div>
      ) : (
        <>
          <DataTable
            data={analysisData}
            columns={columns}
            pageSize={10}
            showPagination={false}
            emptyMessage="No data found"
            isLoading={false}
          />

          {pagination.totalPages > 0 && (
            <Pagination
              pagination={pagination}
              loadingAnalysis={loadingAnalysis}
              onPageChange={onPageChange}
              getPageNumbers={getPageNumbers}
            />
          )}
        </>
      )}
    </div>
  );
}

