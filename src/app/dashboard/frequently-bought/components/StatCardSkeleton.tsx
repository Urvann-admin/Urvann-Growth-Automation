export default function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 bg-slate-200 rounded w-24 mb-3"></div>
          <div className="h-8 bg-slate-200 rounded w-20"></div>
        </div>
        <div className="w-11 h-11 bg-slate-200 rounded-xl"></div>
      </div>
    </div>
  );
}

