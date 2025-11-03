'use client';

import { useState } from 'react';
import { HUB_MAPPINGS, getSubstoresByHub, getAllSubstores } from '@/shared/constants/hubs';

interface SubstoreSelectorProps {
  selectedSubstores: string[];
  onSubstoreChange: (substores: string[]) => void;
}

const ALL_HUBS = HUB_MAPPINGS.map(mapping => mapping.hub);

export default function SubstoreSelector({ selectedSubstores, onSubstoreChange }: SubstoreSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleHubToggle = (hub: string) => {
    const hubSubstores = getSubstoresByHub(hub);
    const allHubSubstoresSelected = hubSubstores.every(substore => selectedSubstores.includes(substore));
    
    if (allHubSubstoresSelected) {
      // Remove all substores from this hub
      onSubstoreChange(selectedSubstores.filter(substore => !hubSubstores.includes(substore)));
    } else {
      // Add all substores from this hub
      const newSubstores = [...selectedSubstores];
      hubSubstores.forEach(substore => {
        if (!newSubstores.includes(substore)) {
          newSubstores.push(substore);
        }
      });
      onSubstoreChange(newSubstores);
    }
  };

  const handleSelectAll = () => {
    onSubstoreChange(getAllSubstores());
  };

  const handleClearAll = () => {
    onSubstoreChange([]);
  };

  const getSelectedHubs = () => {
    return ALL_HUBS.filter(hub => {
      const hubSubstores = getSubstoresByHub(hub);
      return hubSubstores.every(substore => selectedSubstores.includes(substore));
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
      >
        <span>
          {selectedSubstores.length === 0 
            ? 'Select Hubs' 
            : `${getSelectedHubs().length} hubs selected`
          }
        </span>
        <svg 
          className={`w-5 h-5 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full z-[100] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          <div className="p-2 border-b border-slate-200">
            <div className="flex space-x-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors font-medium"
              >
                Select All
              </button>
              <button
                onClick={handleClearAll}
                className="px-3 py-1 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
          
          <div className="p-2">
            {ALL_HUBS.map((hub) => {
              const hubSubstores = getSubstoresByHub(hub);
              const allHubSubstoresSelected = hubSubstores.every(substore => selectedSubstores.includes(substore));
              const someHubSubstoresSelected = hubSubstores.some(substore => selectedSubstores.includes(substore));
              
              return (
                <label key={hub} className="flex items-center p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={allHubSubstoresSelected}
                    ref={input => {
                      if (input) input.indeterminate = someHubSubstoresSelected && !allHubSubstoresSelected;
                    }}
                    onChange={() => handleHubToggle(hub)}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="ml-2 text-sm text-slate-700 font-medium">
                    {hub}
                  </span>
                  <span className="ml-2 text-xs text-slate-500">
                    ({hubSubstores.length} substores)
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
