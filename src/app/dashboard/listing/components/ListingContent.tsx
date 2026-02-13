'use client';

import { THEME_CONFIG, CHRISTMAS_COLORS } from '@/config/theme';
import type { ListingTab } from '../config';
import { CategoryMasterForm, ViewCategories } from '../category';
import { ProductMasterForm, ViewParents } from '../product';

export interface ListingContentProps {
  activeTab: ListingTab;
  loading?: boolean;
}

export function ListingContent({ activeTab, loading = false }: ListingContentProps) {
  const isChristmasTheme = THEME_CONFIG.ENABLE_CHRISTMAS_THEME;

  const isProductAdd = activeTab === 'product-add';
  return (
    <main
      className={`flex-1 min-w-0 overflow-auto ${isChristmasTheme ? '' : 'bg-[#F4F6F8]'} ${isProductAdd ? 'p-2' : 'p-6'}`}
    >
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div
              className={`animate-spin rounded-full h-10 w-10 border-2 border-t-transparent ${isChristmasTheme ? '' : 'border-emerald-500'}`}
              style={
                isChristmasTheme
                  ? { borderColor: `${CHRISTMAS_COLORS.primary} transparent transparent transparent` }
                  : undefined
              }
            />
            <p className={`text-sm ${isChristmasTheme ? 'text-slate-600' : 'text-slate-500'}`}>Loading...</p>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'category-add' && <CategoryMasterForm />}
          {activeTab === 'category-view' && <ViewCategories />}
          {activeTab === 'product-add' && <ProductMasterForm />}
          {activeTab === 'product-view-parent' && <ViewParents />}
          {activeTab === 'listing' && <ListingPlaceholder />}
        </>
      )}
    </main>
  );
}

function ListingPlaceholder() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">Listing</h2>
      <p className="text-sm text-slate-600">
        Listing management. This section can host listing rules, bulk listing, and listing status.
      </p>
    </div>
  );
}
