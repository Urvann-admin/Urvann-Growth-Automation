'use client';

import { useListingLayoutContext } from './context/ListingLayoutContext';
import { ListingTopBar } from './components/ListingTopBar';
import { ListingContent } from './components/ListingContent';

export default function ListingPage() {
  const {
    loading,
    activeTab,
    listingSectionTab,
    setListingSectionTab,
    listingViewMode,
    setListingViewMode,
    sidebarCollapsed,
  } = useListingLayoutContext();

  if (loading) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col min-w-0">
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
  );
}
