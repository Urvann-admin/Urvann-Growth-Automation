'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { ListingTab, ListingSectionTab } from '../config';
import { LISTING_SECTION_TABS } from '../config';

const STORAGE_KEY_TAB = 'listing_activeTab';
const STORAGE_KEY_SECTION_TAB = 'listing_sectionTab';

const VALID_HASHES: ListingTab[] = [
  'category-add',
  'category-view',
  'product-add',
  'product-view-parent',
  'seller-add',
  'seller-view',
  'invoice-view',
  'listing',
  'image-upload',
  'image-view',
  'upload-logs',
];

const VALID_SECTION_TABS: ListingSectionTab[] = LISTING_SECTION_TABS.map((t) => t.id);

function getInitialTab(): ListingTab {
  if (typeof window === 'undefined') return 'category-add';
  const nav = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (nav?.type === 'reload') {
    try {
      sessionStorage.removeItem(STORAGE_KEY_TAB);
      sessionStorage.removeItem(STORAGE_KEY_SECTION_TAB);
    } catch {}
  }
  const hash = window.location.hash.slice(1) as ListingTab;
  if (VALID_HASHES.includes(hash)) return hash;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_TAB);
    if (stored && VALID_HASHES.includes(stored as ListingTab)) return stored as ListingTab;
  } catch {}
  return 'category-add';
}

function getInitialSectionTab(): ListingSectionTab {
  if (typeof window === 'undefined') return 'listing';
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_SECTION_TAB);
    if (stored && VALID_SECTION_TABS.includes(stored as ListingSectionTab)) return stored as ListingSectionTab;
  } catch {}
  return 'listing';
}

export function useListingState() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ListingTab>(getInitialTab);
  const [categorySectionOpen, setCategorySectionOpen] = useState(false);
  const [productSectionOpen, setProductSectionOpen] = useState(false);
  const [listingSectionOpen, setListingSectionOpen] = useState(true);
  const [imageSectionOpen, setImageSectionOpen] = useState(true);
  const [sellerSectionOpen, setSellerSectionOpen] = useState(true);
  const [invoiceSectionOpen, setInvoiceSectionOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [listingSectionTab, setListingSectionTab] = useState<ListingSectionTab>(getInitialSectionTab);
  const [listingViewMode, setListingViewMode] = useState<'create' | 'view-all'>('create');
  const [loading, setLoading] = useState(true);

  // Handle auth state changes
  useEffect(() => {
    if (isLoading) return; // Still loading auth

    if (!user) {
      router.push('/auth/login');
      return;
    }
    setLoading(false);
  }, [user, isLoading, router]);

  // Sync activeTab when hash changes (e.g. browser back/forward)
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1) as ListingTab;
      if (VALID_HASHES.includes(hash)) {
        setActiveTab(hash);
        if (hash === 'product-add' || hash === 'product-view-parent') setProductSectionOpen(true);
        if (hash === 'category-add' || hash === 'category-view') setCategorySectionOpen(true);
        if (hash === 'listing') setListingSectionOpen(true);
        if (hash === 'image-upload' || hash === 'image-view' || hash === 'upload-logs') setImageSectionOpen(true);
        if (hash === 'seller-add' || hash === 'seller-view') setSellerSectionOpen(true);
        if (hash === 'invoice-view') setInvoiceSectionOpen(true);
      }
    };
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const setActiveTabWithHash = useCallback((id: ListingTab) => {
    setActiveTab(id);
    if (typeof window !== 'undefined') {
      window.location.hash = id;
      try {
        sessionStorage.setItem(STORAGE_KEY_TAB, id);
      } catch {}
    }
  }, []);

  const setListingSectionTabWithStorage = useCallback((tab: ListingSectionTab) => {
    setListingSectionTab(tab);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEY_SECTION_TAB, tab);
      } catch {}
    }
  }, []);

  return {
    user,
    isLoading,
    loading,
    activeTab,
    setActiveTab: setActiveTabWithHash,
    listingSectionTab,
    setListingSectionTab: setListingSectionTabWithStorage,
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
  };
}
