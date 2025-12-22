import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FrequentlyBoughtPagination } from '@/types/frequentlyBought';

interface PaginationProps {
  pagination: FrequentlyBoughtPagination | {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  loadingAnalysis: boolean;
  onPageChange: (page: number) => void;
  getPageNumbers: ((current: number, total: number) => (number | string)[]) | (() => (number | string)[]);
}

export default function Pagination({
  pagination,
  loadingAnalysis,
  onPageChange,
  getPageNumbers,
}: PaginationProps) {
  // Handle both FrequentlyBoughtPagination (with totalSkus) and simple pagination (with total)
  const total = 'totalSkus' in pagination ? pagination.totalSkus : pagination.total;
  
  // Handle both function signatures: with params or without
  const pageNumbers = getPageNumbers.length === 2 
    ? (getPageNumbers as (current: number, total: number) => (number | string)[])(pagination.page, pagination.totalPages)
    : (getPageNumbers as () => (number | string)[])();
  
  return (
    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-700">{((pagination.page - 1) * pagination.pageSize) + 1}</span> to{' '}
        <span className="font-medium text-slate-700">{Math.min(pagination.page * pagination.pageSize, total)}</span> of{' '}
        <span className="font-medium text-slate-700">{total.toLocaleString()}</span> results
      </p>
      
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page === 1 || loadingAnalysis}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        {pageNumbers.map((pageNum, idx) => (
          <button
            key={idx}
            onClick={() => typeof pageNum === 'number' && onPageChange(pageNum)}
            disabled={pageNum === '...' || loadingAnalysis}
            className={`min-w-[36px] h-9 px-3 text-sm font-medium rounded-lg transition-all ${
              pageNum === pagination.page
                ? 'bg-indigo-600 text-white'
                : pageNum === '...'
                ? 'text-slate-400 cursor-default'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {pageNum}
          </button>
        ))}
        
        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.totalPages || loadingAnalysis}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

