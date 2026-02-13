'use client';

import { ChristmasTheme } from '@/components/theme/ChristmasTheme';
import { THEME_CONFIG, CHRISTMAS_COLORS } from '@/config/theme';
import { useListingState } from './hooks/useListingState';
import {
  ListingLoadingScreen,
  ListingSidebar,
  ListingTopBar,
  ListingContent,
} from './components';

export default function ListingPage() {
  const {
    user,
    isLoading,
    loading,
    activeTab,
    setActiveTab,
    categorySectionOpen,
    setCategorySectionOpen,
    productSectionOpen,
    setProductSectionOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useListingState();

  const isChristmasTheme = THEME_CONFIG.ENABLE_CHRISTMAS_THEME;

  // Redirect when auth is ready and user is missing
  if (!isLoading && !user) {
    return null;
  }

  // Show full layout immediately; only the content area shows loading while auth resolves
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
          categorySectionOpen={categorySectionOpen}
          onCategorySectionToggle={() => setCategorySectionOpen((o) => !o)}
          productSectionOpen={productSectionOpen}
          onProductSectionToggle={() => setProductSectionOpen((o) => !o)}
          sidebarCollapsed={sidebarCollapsed}
          onSidebarCollapsedToggle={() => setSidebarCollapsed((c) => !c)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <ListingTopBar activeTab={activeTab} />
          <ListingContent activeTab={activeTab} loading={loading} />
        </div>
      </div>
    </ChristmasTheme>
  );
}
