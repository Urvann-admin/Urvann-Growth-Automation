export default function AllSkusViewSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="h-5 bg-slate-200 rounded w-40 mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-48"></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">#</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Substore</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Available</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Transactions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: 10 }).map((_, index) => (
              <tr key={index} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="h-4 bg-slate-200 rounded w-6"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 bg-slate-200 rounded w-24"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 bg-slate-200 rounded w-48"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-6 bg-slate-200 rounded w-20"></div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="h-8 w-8 bg-slate-200 rounded-full mx-auto"></div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

