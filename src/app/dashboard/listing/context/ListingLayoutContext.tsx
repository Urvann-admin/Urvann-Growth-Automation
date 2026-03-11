'use client';

import { createContext, useContext } from 'react';
import type { ListingTab, ListingSectionTab } from '../config';

export interface ListingLayoutContextValue {
  loading: boolean;
  activeTab: ListingTab;
  setActiveTab: (id: ListingTab) => void;
  listingSectionTab: ListingSectionTab;
  setListingSectionTab: (tab: ListingSectionTab) => void;
  listingViewMode: 'create' | 'view-all';
  setListingViewMode: (mode: 'create' | 'view-all') => void;
  categorySectionOpen: boolean;
  onCategorySectionToggle: () => void;
  productSectionOpen: boolean;
  onProductSectionToggle: () => void;
  imageSectionOpen: boolean;
  onImageSectionToggle: () => void;
  sidebarCollapsed: boolean;
  onSidebarCollapsedToggle: () => void;
}

const defaultValue: ListingLayoutContextValue = {
  loading: true,
  activeTab: 'category-add',
  setActiveTab: () => {},
  listingSectionTab: 'listing',
  setListingSectionTab: () => {},
  listingViewMode: 'create',
  setListingViewMode: () => {},
  categorySectionOpen: false,
  onCategorySectionToggle: () => {},
  productSectionOpen: false,
  onProductSectionToggle: () => {},
  imageSectionOpen: true,
  onImageSectionToggle: () => {},
  sidebarCollapsed: false,
  onSidebarCollapsedToggle: () => {},
};

export const ListingLayoutContext = createContext<ListingLayoutContextValue>(defaultValue);

export function useListingLayoutContext() {
  return useContext(ListingLayoutContext);
}
