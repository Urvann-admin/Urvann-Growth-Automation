'use client';

import { createContext } from 'react';
import type { ListingTab } from '../config';

export interface ListingLayoutContextValue {
  activeTab: ListingTab;
  setActiveTab: (id: ListingTab) => void;
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
  activeTab: 'category-add',
  setActiveTab: () => {},
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
