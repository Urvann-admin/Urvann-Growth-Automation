'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { ListingTab, ListingSectionTab } from '../config';
import { LISTING_SECTION_TABS, canAccessListingTab } from '../config';

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
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('listing-')) return 'listing' as ListingTab;
  if (VALID_HASHES.includes(hash as ListingTab)) return hash as ListingTab;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_TAB);
    if (stored && VALID_HASHES.includes(stored as ListingTab)) return stored as ListingTab;
  } catch {}
  return 'category-add';
}

function getInitialSectionTab(): ListingSectionTab {
  if (typeof window === 'undefined') return 'listing';
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('listing-')) {
    const section = hash.replace('listing-', '') as ListingSectionTab;
    if (VALID_SECTION_TABS.includes(section)) return section;
  }
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

  // Redirect non-allowed users away from listing tab
  const canAccessListing = canAccessListingTab(user?.email);
  useEffect(() => {
    if (!loading && !canAccessListing && activeTab === 'listing') {
      setActiveTab('category-add');
      if (typeof window !== 'undefined') {
        window.location.hash = 'category-add';
        try {
          sessionStorage.setItem(STORAGE_KEY_TAB, 'category-add');
        } catch {}
      }
    }
  }, [loading, canAccessListing, activeTab]);

  // Sync activeTab and listingSectionTab when hash changes (e.g. browser back/forward)
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1);
      const baseTab = hash.startsWith('listing-') ? 'listing' : hash;
      if (VALID_HASHES.includes(baseTab as ListingTab) || hash.startsWith('listing-')) {
        setActiveTab(baseTab as ListingTab);
        if (hash.startsWith('listing-')) {
          const section = hash.replace('listing-', '') as ListingSectionTab;
          if (VALID_SECTION_TABS.includes(section)) setListingSectionTab(section);
          setListingSectionOpen(true);
        }
        if (baseTab === 'product-add' || baseTab === 'product-view-parent') setProductSectionOpen(true);
        if (baseTab === 'category-add' || baseTab === 'category-view') setCategorySectionOpen(true);
        if (baseTab === 'listing') setListingSectionOpen(true);
        if (baseTab === 'image-upload' || baseTab === 'image-view' || baseTab === 'upload-logs') setImageSectionOpen(true);
        if (baseTab === 'seller-add' || baseTab === 'seller-view') setSellerSectionOpen(true);
        if (baseTab === 'invoice-view') setInvoiceSectionOpen(true);
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
        const newHash = tab === 'listing' ? 'listing' : `listing-${tab}`;
        if (window.location.hash.slice(1) !== newHash) {
          window.location.hash = newHash;
        }
      } catch {}
    }
  }, []);

  return {
    user,
    isLoading,
    loading,
    canAccessListing,
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
