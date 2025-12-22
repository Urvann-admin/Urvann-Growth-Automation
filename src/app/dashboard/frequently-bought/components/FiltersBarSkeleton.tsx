export default function FiltersBarSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-72 h-10 bg-slate-200 rounded-lg"></div>
        <div className="flex-1 h-10 bg-slate-200 rounded-lg"></div>
        <div className="w-24 h-10 bg-slate-200 rounded-lg"></div>
        <div className="h-8 w-px bg-slate-200"></div>
        <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
        <div className="w-24 h-10 bg-slate-200 rounded-lg"></div>
      </div>
    </div>
  );
}

