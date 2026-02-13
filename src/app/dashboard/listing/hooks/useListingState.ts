'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { ListingTab } from '../config';

const VALID_HASHES: ListingTab[] = ['category-add', 'category-view', 'product-add', 'product-view-parent', 'listing'];

function getInitialTab(): ListingTab {
  if (typeof window === 'undefined') return 'category-add';
  const hash = window.location.hash.slice(1) as ListingTab;
  return VALID_HASHES.includes(hash) ? hash : 'category-add';
}

export function useListingState() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ListingTab>(getInitialTab);
  const [categorySectionOpen, setCategorySectionOpen] = useState(true);
  const [productSectionOpen, setProductSectionOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    queueMicrotask(() => setLoading(false));
  }, [user, isLoading, router]);

  // Sync activeTab when hash changes (e.g. browser back/forward)
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1) as ListingTab;
      if (VALID_HASHES.includes(hash)) {
        setActiveTab(hash);
        if (hash === 'product-add' || hash === 'product-view-parent') setProductSectionOpen(true);
        if (hash === 'category-add' || hash === 'category-view') setCategorySectionOpen(true);
      }
    };
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const setActiveTabWithHash = (id: ListingTab) => {
    setActiveTab(id);
    if (typeof window !== 'undefined') {
      window.location.hash = id;
    }
  };

  return {
    user,
    isLoading,
    loading,
    activeTab,
    setActiveTab: setActiveTabWithHash,
    categorySectionOpen,
    setCategorySectionOpen,
    productSectionOpen,
    setProductSectionOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
  };
}
