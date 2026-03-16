'use client';

import { useCallback } from 'react';
import { ChristmasTheme } from '@/components/theme/ChristmasTheme';
import { THEME_CONFIG, CHRISTMAS_COLORS } from '@/config/theme';
import { useListingState } from './hooks/useListingState';
import { ListingSidebar } from './components/ListingSidebar';
import { ListingLayoutContext, type ListingLayoutContextValue } from './context/ListingLayoutContext';

export default function ListingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    loading,
    canAccessListing,
    activeTab,
    setActiveTab,
    categorySectionOpen,
    setCategorySectionOpen,
    productSectionOpen,
    setProductSectionOpen,
    listingSectionOpen,
    setListingSectionOpen,
    imageSectionOpen,
    setImageSectionOpen,
    sellerSectionOpen,
    setSellerSectionOpen,
    invoiceSectionOpen,
    setInvoiceSectionOpen,
    collectionSectionOpen,
    setCollectionSectionOpen,
    listingSectionTab,
    setListingSectionTab,
    listingViewMode,
    setListingViewMode,
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useListingState();

  const isChristmasTheme = THEME_CONFIG.ENABLE_CHRISTMAS_THEME;

  const onCategorySectionToggle = useCallback(() => setCategorySectionOpen((o) => !o), [setCategorySectionOpen]);
  const onProductSectionToggle = useCallback(() => setProductSectionOpen((o) => !o), [setProductSectionOpen]);
  const onListingSectionToggle = useCallback(() => setListingSectionOpen((o) => !o), [setListingSectionOpen]);
  const onImageSectionToggle = useCallback(() => setImageSectionOpen((o) => !o), [setImageSectionOpen]);
  const onSellerSectionToggle = useCallback(() => setSellerSectionOpen((o) => !o), [setSellerSectionOpen]);
  const onInvoiceSectionToggle = useCallback(() => setInvoiceSectionOpen((o) => !o), [setInvoiceSectionOpen]);
  const onCollectionSectionToggle = useCallback(() => setCollectionSectionOpen((o) => !o), [setCollectionSectionOpen]);
  const onSidebarCollapsedToggle = useCallback(() => setSidebarCollapsed((c) => !c), [setSidebarCollapsed]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const contextValue: ListingLayoutContextValue = {
    loading,
    activeTab,
    setActiveTab,
    listingSectionTab,
    setListingSectionTab,
    listingViewMode,
    setListingViewMode,
    categorySectionOpen,
    onCategorySectionToggle,
    productSectionOpen,
    onProductSectionToggle,
    imageSectionOpen,
    onImageSectionToggle,
    sidebarCollapsed,
    onSidebarCollapsedToggle,
  };

  return (
    <ListingLayoutContext.Provider value={contextValue}>
      <ChristmasTheme variant="dashboard">
        <div
          className={`min-h-screen flex ${isChristmasTheme ? '' : 'bg-[#F4F6F8]'}`}
          style={
            isChristmasTheme
              ? {
                  background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.background} 0%, ${CHRISTMAS_COLORS.white} 50%, ${CHRISTMAS_COLORS.light} 100%)`,
                }
              : {}
          }
        >
          <ListingSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            listingSectionTab={listingSectionTab}
            onListingSectionChange={setListingSectionTab}
            listingSectionOpen={listingSectionOpen}
            onListingSectionToggle={onListingSectionToggle}
            canAccessListing={canAccessListing}
            categorySectionOpen={categorySectionOpen}
            onCategorySectionToggle={onCategorySectionToggle}
            productSectionOpen={productSectionOpen}
            onProductSectionToggle={onProductSectionToggle}
            imageSectionOpen={imageSectionOpen}
            onImageSectionToggle={onImageSectionToggle}
            sellerSectionOpen={sellerSectionOpen}
            onSellerSectionToggle={onSellerSectionToggle}
            invoiceSectionOpen={invoiceSectionOpen}
            onInvoiceSectionToggle={onInvoiceSectionToggle}
            collectionSectionOpen={collectionSectionOpen}
            onCollectionSectionToggle={onCollectionSectionToggle}
            sidebarCollapsed={sidebarCollapsed}
            onSidebarCollapsedToggle={onSidebarCollapsedToggle}
          />
          <div className="flex-1 flex flex-col min-w-0 overflow-auto">
            {children}
          </div>
        </div>
      </ChristmasTheme>
    </ListingLayoutContext.Provider>
  );
}
