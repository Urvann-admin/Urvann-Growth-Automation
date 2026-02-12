'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, LayoutList } from 'lucide-react';
import { THEME_CONFIG, CHRISTMAS_COLORS } from '@/config/theme';
import { TAB_CONFIG } from '../config';
import type { ListingTab } from '../config';

export interface ListingTopBarProps {
  activeTab: ListingTab;
}

export function ListingTopBar({ activeTab }: ListingTopBarProps) {
  const router = useRouter();
  const isChristmasTheme = THEME_CONFIG.ENABLE_CHRISTMAS_THEME;
  const tab = TAB_CONFIG.find((t) => t.id === activeTab);
  const iconId = activeTab === 'category-view' ? 'category-view' : activeTab;
  const tabForIcon = TAB_CONFIG.find((x) => x.id === iconId) ?? TAB_CONFIG[0];
  const Icon = tabForIcon?.icon ?? LayoutList;

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
      <div className="px-6 py-3">
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
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${isChristmasTheme ? '' : 'bg-[#E6007A]'}`}
              style={
                isChristmasTheme
                  ? {
                      background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.primary} 0%, ${CHRISTMAS_COLORS.secondary} 100%)`,
                    }
                  : {}
              }
            >
              <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {tab?.label ?? 'Listing'}
              </h1>
              <p className={`text-xs ${isChristmasTheme ? 'text-slate-600' : 'text-slate-500'}`}>
                {tab?.subtitle ?? 'Category Master, Product Master & Listing'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
