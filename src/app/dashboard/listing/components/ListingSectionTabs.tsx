'use client';

import {
  LISTING_SECTION_TABS,
  type ListingSectionTab,
} from '../config';

const TAB_GREEN = '#166534'; // emerald-800
const TAB_GREEN_BORDER = '#14532d'; // emerald-900
const CAPSULE_BG = 'rgba(255,255,255,0.15)';

export interface ListingSectionTabsProps {
  activeTab: ListingSectionTab;
  onTabChange: (tab: ListingSectionTab) => void;
  /** Optional counts per tab; key = section id. Omit or use 0 to hide counter. */
  counts?: Partial<Record<ListingSectionTab, number>>;
}

export function ListingSectionTabs({
  activeTab,
  onTabChange,
  counts = {},
}: ListingSectionTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {LISTING_SECTION_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = counts[tab.id] ?? 0;
        const showCount = count > 0;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`
              inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white
              transition-all duration-200
              ${isActive ? 'shadow-lg shadow-emerald-900/25' : 'shadow-md hover:shadow-lg'}
            `}
            style={{
              backgroundColor: TAB_GREEN,
              border: `1px solid ${TAB_GREEN_BORDER}`,
            }}
          >
            <span>{tab.label}</span>
            {showCount && (
              <span
                className="rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums"
                style={{
                  backgroundColor: CAPSULE_BG,
                  borderColor: TAB_GREEN_BORDER,
                }}
              >
                {count.toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
