'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, LayoutList, Plus, List } from 'lucide-react';
import { THEME_CONFIG, CHRISTMAS_COLORS } from '@/config/theme';
import { TAB_CONFIG } from '../config';
import type { ListingTab, ListingSectionTab } from '../config';

export type ListingViewMode = 'create' | 'view-all';

export interface ListingTopBarProps {
  activeTab: ListingTab;
  listingSectionTab?: ListingSectionTab;
  listingViewMode?: ListingViewMode;
  onListingViewModeChange?: (mode: ListingViewMode) => void;
}

export function ListingTopBar({
  activeTab,
  listingSectionTab = 'listing',
  listingViewMode = 'create',
  onListingViewModeChange,
}: ListingTopBarProps) {
  const router = useRouter();
  const isChristmasTheme = THEME_CONFIG.ENABLE_CHRISTMAS_THEME;
  const tab = TAB_CONFIG.find((t) => t.id === activeTab);
  const iconId = activeTab === 'category-view' ? 'category-view' : activeTab;
  const tabForIcon = TAB_CONFIG.find((x) => x.id === iconId) ?? TAB_CONFIG[0];
  const Icon = tabForIcon?.icon ?? LayoutList;
  const isListingTab = activeTab === 'listing';
  const isListingSection = listingSectionTab === 'listing';
  const showListingSubTabs = isListingTab && isListingSection && onListingViewModeChange;

  return (
    <div
      className={`bg-white shadow-sm shrink-0 sticky top-0 z-10 ${isChristmasTheme ? '' : 'border-b border-slate-200'}`}
      style={
        isChristmasTheme
          ? {
              borderBottom: `2px solid ${CHRISTMAS_COLORS.light}`,
              boxShadow: `0 4px 6px -1px ${CHRISTMAS_COLORS.primary}/10`,
            }
          : {}
      }
    >
      <div className="px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className={`p-2 rounded-lg transition-colors ${isChristmasTheme ? 'hover:bg-slate-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'}`}
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md`}
                style={
                  isChristmasTheme
                    ? {
                        background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.primary} 0%, ${CHRISTMAS_COLORS.secondary} 100%)`,
                      }
                    : { background: 'linear-gradient(135deg, #E6007A 0%, #330033 100%)' }
                }
              >
                <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-base font-semibold text-slate-900">
                  {tab?.label ?? 'Listing'}
                </h1>
                <p className={`text-[11px] ${isChristmasTheme ? 'text-slate-600' : 'text-slate-500'}`}>
                  {tab?.subtitle ?? 'Category Master, Parent Master & Listing'}
                </p>
              </div>
            </div>
          </div>

          {showListingSubTabs && (
            <div className="flex rounded-xl border border-pink-200 overflow-hidden bg-pink-50/50 p-0.5">
              <button
                type="button"
                onClick={() => onListingViewModeChange('create')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  listingViewMode === 'create'
                    ? 'bg-white text-[#E6007A] shadow-sm'
                    : 'text-slate-500 hover:text-[#E6007A]'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Create listing
              </button>
              <button
                type="button"
                onClick={() => onListingViewModeChange('view-all')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  listingViewMode === 'view-all'
                    ? 'bg-white text-[#E6007A] shadow-sm'
                    : 'text-slate-500 hover:text-[#E6007A]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                All listed products
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
