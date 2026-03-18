'use client';

import { THEME_CONFIG, CHRISTMAS_COLORS } from '@/config/theme';
import type { ListingTab, ListingSectionTab } from '../config';
import { CategoryMasterForm, ViewCategories } from '../category';
import { ProductMasterForm, ViewParents } from '../product';
import { ImageUploader } from '../image/components/ImageUploader';
import { ImageCollectionsView } from '../image/components/ImageCollectionsView';
import { UploadLogsView } from '../image/components/UploadLogsView';
import { ViewSellers, AddSellerForm } from '../seller';
import { ViewInvoices } from '../invoice';
import { CollectionMasterForm, ViewCollections } from '../collection';
import {
  ListingProductForm,
  ViewListingProducts,
  ListingScreen,
  GrowthProductsView,
} from '../listing-screen';

export type ListingViewMode = 'create' | 'view-all';

export interface ListingContentProps {
  activeTab: ListingTab;
  listingSectionTab?: ListingSectionTab;
  onListingSectionTabChange?: (tab: ListingSectionTab) => void;
  listingViewMode?: ListingViewMode;
  sidebarCollapsed?: boolean;
}

export function ListingContent({
  activeTab,
  listingSectionTab = 'listing',
  onListingSectionTabChange,
  listingViewMode = 'create',
  sidebarCollapsed = false,
}: ListingContentProps) {
  const isChristmasTheme = THEME_CONFIG.ENABLE_CHRISTMAS_THEME;

  const isProductAdd = activeTab === 'product-add';

  return (
    <main
      className={`flex-1 min-w-0 overflow-auto ${isChristmasTheme ? '' : 'bg-[#F4F6F8]'} ${isProductAdd || activeTab === 'listing' ? 'p-0' : 'p-6'}`}
    >
      {activeTab === 'category-add' && (
        <div className="max-w-5xl mx-auto">
          <CategoryMasterForm />
        </div>
      )}
      {activeTab === 'category-view' && <ViewCategories />}
      {activeTab === 'product-add' && <ProductMasterForm />}
      {activeTab === 'product-view-parent' && <ViewParents />}
      {activeTab === 'seller-add' && (
        <div className="max-w-2xl mx-auto">
          <AddSellerForm />
        </div>
      )}
      {activeTab === 'seller-view' && <ViewSellers />}
      {activeTab === 'invoice-view' && (
        <div className="max-w-[90rem] mx-auto w-full">
          <ViewInvoices />
        </div>
      )}
      {activeTab === 'collection-add' && (
        <div className="max-w-6xl mx-auto w-full">
          <CollectionMasterForm />
        </div>
      )}
      {activeTab === 'collection-view' && (
        <div className="max-w-5xl mx-auto w-full">
          <ViewCollections />
        </div>
      )}
      {activeTab === 'listing' && (
        <ListingSectionContent
          sectionTab={listingSectionTab}
          listingViewMode={listingViewMode}
          sidebarCollapsed={sidebarCollapsed}
        />
      )}
      {activeTab === 'image-upload' && (
        <div className="max-w-2xl mx-auto">
          <ImageUploader />
        </div>
      )}
      {activeTab === 'image-view' && (
        <div className="max-w-5xl mx-auto">
          <ImageCollectionsView />
        </div>
      )}
      {activeTab === 'upload-logs' && (
        <div className="max-w-5xl mx-auto">
          <UploadLogsView />
        </div>
      )}
    </main>
  );
}

function ListingSectionContent({
  sectionTab,
  listingViewMode,
  sidebarCollapsed = false,
}: {
  sectionTab: ListingSectionTab;
  listingViewMode: ListingViewMode;
  sidebarCollapsed?: boolean;
}) {
  return (
    <div className="h-full">
      {sectionTab === 'listing' && listingViewMode === 'create' && (
        <ListingScreen
          section={sectionTab}
          onSuccess={(products) => {
            console.log('Listing products created:', products);
            // Could add success handling here
          }}
          sidebarCollapsed={sidebarCollapsed}
        />
      )}

      {sectionTab === 'listing' && listingViewMode === 'view-all' && (
        <div className="space-y-6 p-6">
          <ViewListingProducts section={sectionTab} />
        </div>
      )}

      {sectionTab === 'growth' && (
        <div className="h-full">
          <GrowthProductsView />
        </div>
      )}

      {sectionTab !== 'listing' && sectionTab !== 'growth' && (
        <div className="space-y-6 p-6">
          <ViewListingProducts section={sectionTab} />
        </div>
      )}
    </div>
  );
}
