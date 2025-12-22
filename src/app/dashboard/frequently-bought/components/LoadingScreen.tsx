export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-200 rounded-full"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <div className="text-center">
          <p className="text-slate-700 font-medium">Loading Frequently Bought Together</p>
          <p className="text-slate-400 text-sm mt-1">Analyzing product pairings...</p>
        </div>
      </div>
    </div>
  );
}

