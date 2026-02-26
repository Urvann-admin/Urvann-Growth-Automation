'use client';

import { useCallback } from 'react';
import { ChristmasTheme } from '@/components/theme/ChristmasTheme';
import { THEME_CONFIG, CHRISTMAS_COLORS } from '@/config/theme';
import { useListingState } from './hooks/useListingState';
import { ListingSidebar } from './components/ListingSidebar';
import { ListingTopBar } from './components/ListingTopBar';
import { ListingContent } from './components/ListingContent';

export default function ListingPage() {
  const {
    user,
    isLoading,
    loading,
    activeTab,
    setActiveTab,
    listingSectionTab,
    setListingSectionTab,
    listingViewMode,
    setListingViewMode,
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
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useListingState();

  const isChristmasTheme = THEME_CONFIG.ENABLE_CHRISTMAS_THEME;

  const onCategorySectionToggle = useCallback(() => setCategorySectionOpen((o) => !o), []);
  const onProductSectionToggle = useCallback(() => setProductSectionOpen((o) => !o), []);
  const onListingSectionToggle = useCallback(() => setListingSectionOpen((o) => !o), []);
  const onImageSectionToggle = useCallback(() => setImageSectionOpen((o) => !o), []);
  const onSellerSectionToggle = useCallback(() => setSellerSectionOpen((o) => !o), []);
  const onInvoiceSectionToggle = useCallback(() => setInvoiceSectionOpen((o) => !o), []);
  const onSidebarCollapsedToggle = useCallback(() => setSidebarCollapsed((c) => !c), []);

  // Show loading while auth is resolving
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
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
          sidebarCollapsed={sidebarCollapsed}
          onSidebarCollapsedToggle={onSidebarCollapsedToggle}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <ListingTopBar
            activeTab={activeTab}
            listingSectionTab={listingSectionTab}
            listingViewMode={listingViewMode}
            onListingViewModeChange={setListingViewMode}
          />
          <ListingContent
            activeTab={activeTab}
            listingSectionTab={listingSectionTab}
            onListingSectionTabChange={setListingSectionTab}
            listingViewMode={listingViewMode}
            sidebarCollapsed={sidebarCollapsed}
          />
        </div>
      </div>
    </ChristmasTheme>
  );
}
