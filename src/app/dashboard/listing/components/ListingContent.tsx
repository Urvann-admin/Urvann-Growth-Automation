'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, X, Upload } from 'lucide-react';
import { THEME_CONFIG, CHRISTMAS_COLORS } from '@/config/theme';
import type { ListingTab, ListingSectionTab } from '../config';
import { CategoryMasterForm, ViewCategories } from '../category';
import { ProductMasterForm, ViewParents } from '../product';
import { ImageUploader } from '../image/components/ImageUploader';
import { ImageCollectionsView } from '../image/components/ImageCollectionsView';
import { UploadLogsView } from '../image/components/UploadLogsView';
import { ViewSellers, AddSellerForm } from '../seller';
import { ViewInvoices } from '../invoice';
import { CollectionMasterForm, ViewCollections } from '../collection';
import {
  ListingProductForm,
  ViewListingProducts,
  ListingScreen,
  GrowthProductsView,
} from '../listing-screen';

export type ListingViewMode = 'create' | 'view-all';

export interface ListingContentProps {
  activeTab: ListingTab;
  listingSectionTab?: ListingSectionTab;
  onListingSectionTabChange?: (tab: ListingSectionTab) => void;
  listingViewMode?: ListingViewMode;
  sidebarCollapsed?: boolean;
}

export function ListingContent({
  activeTab,
  listingSectionTab = 'listing',
  onListingSectionTabChange,
  listingViewMode = 'create',
  sidebarCollapsed = false,
}: ListingContentProps) {
  const isChristmasTheme = THEME_CONFIG.ENABLE_CHRISTMAS_THEME;

  const isProductAdd = activeTab === 'product-add';

  return (
    <main
      className={`flex-1 min-w-0 overflow-auto ${isChristmasTheme ? '' : 'bg-[#F4F6F8]'} ${isProductAdd || activeTab === 'listing' ? 'p-0' : 'p-6'}`}
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
      {activeTab === 'invoice-view' && (
        <div className="max-w-[90rem] mx-auto w-full">
          <ViewInvoices />
        </div>
      )}
      {activeTab === 'collection-add' && (
        <div className="max-w-6xl mx-auto w-full">
          <CollectionMasterForm />
        </div>
      )}
      {activeTab === 'collection-view' && (
        <div className="max-w-5xl mx-auto w-full">
          <ViewCollections />
        </div>
      )}
      {activeTab === 'listing' && (
        <ListingSectionContent
          sectionTab={listingSectionTab}
          listingViewMode={listingViewMode}
          sidebarCollapsed={sidebarCollapsed}
        />
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

interface ListingNotification {
  _id: string;
  type: string;
  parentSkus: string[];
  childSkus: string[];
  listingProductIds?: string[];
  message: string;
  read: boolean;
  createdAt: string;
}

function InventoryNotificationBanner() {
  const [notifications, setNotifications] = useState<ListingNotification[]>([]);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/listing-notifications');
      const json = await res.json();
      if (json.success && json.data?.length) {
        setNotifications(json.data);
      } else {
        setNotifications([]);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const dismiss = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    try {
      await fetch('/api/listing-notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {
      // silent
    }
  };

  const dismissAll = async () => {
    setNotifications([]);
    try {
      await fetch('/api/listing-notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
    } catch {
      // silent
    }
  };

  const approveAndPublish = async (notificationId: string) => {
    setPublishingId(notificationId);
    try {
      const res = await fetch('/api/listing-notifications/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || 'Could not publish');
        return;
      }
      const count = json.publishedCount ?? 0;
      if (json.clearedWithoutPublish) {
        toast.success('Products were already published. Notification cleared.');
      } else if (count > 0) {
        toast.success(
          `Published ${count} product(s): ${(json.publishedSkus as string[]).join(', ')}`
        );
      } else {
        toast.error('Nothing was published. Check inventory or status.');
      }
      if (Array.isArray(json.skipped) && json.skipped.length > 0) {
        toast((t) => (
          <span className="text-sm">
            Skipped: {json.skipped.join('; ')}
          </span>
        ));
      }
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    } catch {
      toast.error('Publish request failed');
    } finally {
      setPublishingId(null);
    }
  };

  if (!notifications.length) return null;

  return (
    <div className="px-6 pt-4 space-y-2">
      {notifications.map((n) => (
        <div
          key={n._id}
          className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">{n.message}</p>
            <p className="mt-1 text-xs text-amber-700 break-words">
              SKUs: {n.childSkus.join(', ')}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={publishingId === n._id}
                onClick={() => approveAndPublish(n._id)}
                className="inline-flex items-center gap-1.5 rounded-md bg-fuchsia-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-fuchsia-700 disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                {publishingId === n._id ? 'Publishing…' : 'Approve & publish'}
              </button>
              <button
                type="button"
                disabled={publishingId === n._id}
                onClick={() => dismiss(n._id)}
                className="text-xs text-amber-800 underline hover:text-amber-950 disabled:opacity-50"
              >
                Dismiss without publishing
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dismiss(n._id)}
            className="shrink-0 rounded p-1 hover:bg-amber-200 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      {notifications.length > 1 && (
        <button
          onClick={dismissAll}
          className="text-xs text-amber-700 underline hover:text-amber-900"
        >
          Dismiss all
        </button>
      )}
    </div>
  );
}

function ListingSectionContent({
  sectionTab,
  listingViewMode,
  sidebarCollapsed = false,
}: {
  sectionTab: ListingSectionTab;
  listingViewMode: ListingViewMode;
  sidebarCollapsed?: boolean;
}) {
  return (
    <div className="h-full">
      <InventoryNotificationBanner />

      {sectionTab === 'listing' && listingViewMode === 'create' && (
        <ListingScreen
          section={sectionTab}
          onSuccess={(products) => {
            console.log('Listing products created:', products);
          }}
          sidebarCollapsed={sidebarCollapsed}
        />
      )}

      {sectionTab === 'listing' && listingViewMode === 'view-all' && (
        <div className="space-y-6 p-6">
          <ViewListingProducts section={sectionTab} />
        </div>
      )}

      {sectionTab === 'growth' && (
        <div className="h-full">
          <GrowthProductsView />
        </div>
      )}

      {sectionTab !== 'listing' && sectionTab !== 'growth' && (
        <div className="space-y-6 p-6">
          <ViewListingProducts section={sectionTab} />
        </div>
      )}
    </div>
  );
}
