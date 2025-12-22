import { ArrowLeft, BarChart3, Layers } from 'lucide-react';

interface HeaderProps {
  selectedView: 'analysis' | 'skus';
  onViewChange: (view: 'analysis' | 'skus') => void;
  onBack: () => void;
}

export default function Header({ selectedView, onViewChange, onBack }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="text-lg font-semibold text-slate-800 tracking-tight">
                Frequently Bought Together
              </h1>
              <p className="text-xs text-slate-500">Product co-purchase analysis</p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => onViewChange('analysis')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                selectedView === 'analysis'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analysis
            </button>
            <button
              onClick={() => onViewChange('skus')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                selectedView === 'skus'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              All SKUs
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

