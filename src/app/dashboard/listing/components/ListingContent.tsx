'use client';

import { THEME_CONFIG, CHRISTMAS_COLORS } from '@/config/theme';
import type { ListingTab, ListingSectionTab } from '../config';
import { CategoryMasterForm, ViewCategories } from '../category';
import { ProductMasterForm, ViewParents } from '../product';
import { ImageUploader } from '../image/components/ImageUploader';
import { ImageCollectionsView } from '../image/components/ImageCollectionsView';
import { UploadLogsView } from '../image/components/UploadLogsView';
import { ViewSellers, AddSellerForm } from '../seller';
import { AddInvoiceForm, ViewInvoices } from '../invoice';
import { ListingProductForm } from './ListingProductForm';
import { ViewListingProducts } from './ViewListingProducts';

export interface ListingContentProps {
  activeTab: ListingTab;
  listingSectionTab?: ListingSectionTab;
  onListingSectionTabChange?: (tab: ListingSectionTab) => void;
}

export function ListingContent({
  activeTab,
  listingSectionTab = 'listing',
  onListingSectionTabChange,
}: ListingContentProps) {
  const isChristmasTheme = THEME_CONFIG.ENABLE_CHRISTMAS_THEME;

  const isProductAdd = activeTab === 'product-add';

  return (
    <main
      className={`flex-1 min-w-0 overflow-auto ${isChristmasTheme ? '' : 'bg-[#F4F6F8]'} ${isProductAdd ? 'p-2' : 'p-6'}`}
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
      {activeTab === 'invoice-add' && (
        <div className="max-w-6xl mx-auto">
          <AddInvoiceForm />
        </div>
      )}
      {activeTab === 'invoice-view' && (
        <div className="max-w-6xl mx-auto">
          <ViewInvoices />
        </div>
      )}
      {activeTab === 'listing' && (
        <ListingSectionContent sectionTab={listingSectionTab} />
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

function ListingSectionContent({ sectionTab }: { sectionTab: ListingSectionTab }) {
  const titles: Record<ListingSectionTab, string> = {
    listing: 'Create Listing Products',
    revival: 'Revival Management',
    growth: 'Growth Management',
    consumer: 'Consumer Management',
  };
  
  const descriptions: Record<ListingSectionTab, string> = {
    listing: 'Create child products from parent products with available listing quantities.',
    revival: 'Manage products allocated to revival section.',
    growth: 'Manage products allocated to growth section.',
    consumer: 'Manage products allocated to consumer section.',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{titles[sectionTab]}</h2>
        <p className="text-slate-600">{descriptions[sectionTab]}</p>
      </div>
      
      {sectionTab === 'listing' && (
        <ListingProductForm
          section={sectionTab}
          onSuccess={(listingProduct) => {
            console.log('Listing product created:', listingProduct);
            // Could add success handling here
          }}
        />
      )}
      
      {sectionTab !== 'listing' && (
        <ViewListingProducts
          section={sectionTab}
          onCreateNew={() => {
            // Could navigate to create form or show modal
            console.log(`Create new ${sectionTab} product`);
          }}
        />
      )}
    </div>
  );
}
