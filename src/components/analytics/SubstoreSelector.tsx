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
        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <span>
          {selectedSubstores.length === 0 
            ? 'Select Hubs' 
            : `${getSelectedHubs().length} hubs selected`
          }
        </span>
        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2 border-b border-gray-200">
            <div className="flex space-x-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                Select All
              </button>
              <button
                onClick={handleClearAll}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
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
                <label key={hub} className="flex items-center p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={allHubSubstoresSelected}
                    ref={input => {
                      if (input) input.indeterminate = someHubSubstoresSelected && !allHubSubstoresSelected;
                    }}
                    onChange={() => handleHubToggle(hub)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {hub}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">
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
