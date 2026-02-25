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
import {
  ListingProductForm,
  ViewListingProducts,
  SplitScreenListing,
} from '../listing-screen';

export type ListingViewMode = 'create' | 'view-all';

export interface ListingContentProps {
  activeTab: ListingTab;
  listingSectionTab?: ListingSectionTab;
  onListingSectionTabChange?: (tab: ListingSectionTab) => void;
  listingViewMode?: ListingViewMode;
}

export function ListingContent({
  activeTab,
  listingSectionTab = 'listing',
  onListingSectionTabChange,
  listingViewMode = 'create',
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
      {activeTab === 'listing' && (
        <ListingSectionContent
          sectionTab={listingSectionTab}
          listingViewMode={listingViewMode}
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
}: {
  sectionTab: ListingSectionTab;
  listingViewMode: ListingViewMode;
}) {
  return (
    <div className="h-full">
      {sectionTab === 'listing' && listingViewMode === 'create' && (
        <SplitScreenListing
          section={sectionTab}
          onSuccess={(products) => {
            console.log('Listing products created:', products);
            // Could add success handling here
          }}
        />
      )}

      {sectionTab === 'listing' && listingViewMode === 'view-all' && (
        <div className="space-y-6 p-6">
          <ViewListingProducts
            section={sectionTab}
            onCreateNew={() => {
              // Switch to create could be done by parent via callback if needed
            }}
          />
        </div>
      )}

      {sectionTab !== 'listing' && (
        <div className="space-y-6 p-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {sectionTab === 'revival' && 'Revival Management'}
              {sectionTab === 'growth' && 'Growth Management'}
              {sectionTab === 'consumer' && 'Consumer Management'}
            </h2>
            <p className="text-slate-600">
              Manage products allocated to {sectionTab} section.
            </p>
          </div>
          
          <ViewListingProducts
            section={sectionTab}
            onCreateNew={() => {
              // Could navigate to create form or show modal
              console.log(`Create new ${sectionTab} product`);
            }}
          />
        </div>
      )}
    </div>
  );
}
