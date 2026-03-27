'use client';

import type { LucideIcon } from 'lucide-react';
import { LayoutList, FolderTree, Package, Store, FileText, Layers, ChevronLeft, ChevronRight, ChevronDown, Plus, ListIcon, Image as ImageIcon, ScrollText, Upload, List } from 'lucide-react';
import { THEME_CONFIG, CHRISTMAS_COLORS, LISTING_SIDEBAR_THEME } from '@/config/theme';
import {
  CATEGORY_SUB_TABS,
  PRODUCT_SUB_TABS,
  IMAGE_SUB_TABS,
  SELLER_SUB_TABS,
  INVOICE_SUB_TABS,
  COLLECTION_SUB_TABS,
  TAB_CONFIG,
  LISTING_TOP_LEVEL_TABS,
  LISTING_SECTION_TABS,
  type ListingTab,
  type ListingSectionTab,
} from '../config';

export interface ListingSidebarProps {
  activeTab: ListingTab;
  onTabChange: (id: ListingTab) => void;
  listingSectionTab: ListingSectionTab;
  onListingSectionChange: (section: ListingSectionTab) => void;
  listingSectionOpen: boolean;
  onListingSectionToggle: () => void;
  canAccessListing?: boolean;
  categorySectionOpen: boolean;
  onCategorySectionToggle: () => void;
  productSectionOpen: boolean;
  onProductSectionToggle: () => void;
  imageSectionOpen: boolean;
  onImageSectionToggle: () => void;
  sellerSectionOpen: boolean;
  onSellerSectionToggle: () => void;
  invoiceSectionOpen: boolean;
  onInvoiceSectionToggle: () => void;
  collectionSectionOpen: boolean;
  onCollectionSectionToggle: () => void;
  sidebarCollapsed: boolean;
  onSidebarCollapsedToggle: () => void;
}

export function ListingSidebar({
  activeTab,
  onTabChange,
  listingSectionTab,
  onListingSectionChange,
  listingSectionOpen,
  onListingSectionToggle,
  canAccessListing = false,
  categorySectionOpen,
  onCategorySectionToggle,
  productSectionOpen,
  onProductSectionToggle,
  imageSectionOpen,
  onImageSectionToggle,
  sellerSectionOpen,
  onSellerSectionToggle,
  invoiceSectionOpen,
  onInvoiceSectionToggle,
  collectionSectionOpen,
  onCollectionSectionToggle,
  sidebarCollapsed,
  onSidebarCollapsedToggle,
}: ListingSidebarProps) {
  const isChristmasTheme = THEME_CONFIG.ENABLE_CHRISTMAS_THEME;

  return (
    <aside
      className={`shrink-0 h-screen sticky top-0 rounded-r-xl shadow-lg overflow-hidden transition-[width] duration-300 ease-in-out ${
        sidebarCollapsed ? 'w-[72px]' : 'w-60'
      } ${isChristmasTheme ? '' : 'bg-[#330033] border-r border-[#330033]'}`}
      style={
        isChristmasTheme
          ? {
              background: CHRISTMAS_COLORS.white,
              borderRight: `2px solid ${CHRISTMAS_COLORS.light}`,
              borderTop: `1px solid ${CHRISTMAS_COLORS.light}`,
              borderBottom: `1px solid ${CHRISTMAS_COLORS.light}`,
              boxShadow: `0 4px 6px -1px ${CHRISTMAS_COLORS.primary}/10`,
            }
          : {}
      }
    >
      <ListingSidebarHeader
        collapsed={sidebarCollapsed}
        onToggle={onSidebarCollapsedToggle}
        isChristmasTheme={isChristmasTheme}
      />
      <nav className="p-2 space-y-0.5">
        {canAccessListing && (
        <ListingNavSection
          activeTab={activeTab}
          onTabChange={onTabChange}
          listingSectionTab={listingSectionTab}
          onListingSectionChange={onListingSectionChange}
          sectionOpen={listingSectionOpen}
          onSectionToggle={onListingSectionToggle}
          collapsed={sidebarCollapsed}
          isChristmasTheme={isChristmasTheme}
        />
        )}
        <InvoiceNavSection
          activeTab={activeTab}
          onTabChange={onTabChange}
          sectionOpen={invoiceSectionOpen}
          onSectionToggle={onInvoiceSectionToggle}
          collapsed={sidebarCollapsed}
          isChristmasTheme={isChristmasTheme}
        />
        <ImageNavSection
          activeTab={activeTab}
          onTabChange={onTabChange}
          sectionOpen={imageSectionOpen}
          onSectionToggle={onImageSectionToggle}
          collapsed={sidebarCollapsed}
          isChristmasTheme={isChristmasTheme}
        />
        <ProductNavSection
          activeTab={activeTab}
          onTabChange={onTabChange}
          sectionOpen={productSectionOpen}
          onSectionToggle={onProductSectionToggle}
          collapsed={sidebarCollapsed}
          isChristmasTheme={isChristmasTheme}
        />
        <SellerNavSection
          activeTab={activeTab}
          onTabChange={onTabChange}
          sectionOpen={sellerSectionOpen}
          onSectionToggle={onSellerSectionToggle}
          collapsed={sidebarCollapsed}
          isChristmasTheme={isChristmasTheme}
        />
        <CollectionNavSection
          activeTab={activeTab}
          onTabChange={onTabChange}
          sectionOpen={collectionSectionOpen}
          onSectionToggle={onCollectionSectionToggle}
          collapsed={sidebarCollapsed}
          isChristmasTheme={isChristmasTheme}
        />
        <CategoryNavSection
          activeTab={activeTab}
          onTabChange={onTabChange}
          sectionOpen={categorySectionOpen}
          onSectionToggle={onCategorySectionToggle}
          collapsed={sidebarCollapsed}
          isChristmasTheme={isChristmasTheme}
        />
        <TopLevelNavItems
          tabIds={LISTING_TOP_LEVEL_TABS}
          activeTab={activeTab}
          onTabChange={onTabChange}
          collapsed={sidebarCollapsed}
          isChristmasTheme={isChristmasTheme}
        />
      </nav>
    </aside>
  );
}

function ListingSidebarHeader({
  collapsed,
  onToggle,
  isChristmasTheme,
}: {
  collapsed: boolean;
  onToggle: () => void;
  isChristmasTheme: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-4 ${
        isChristmasTheme ? 'border-b border-slate-100' : 'border-b border-white/15'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isChristmasTheme ? '' : 'bg-white/10'}`}
          style={isChristmasTheme ? { background: `${CHRISTMAS_COLORS.light}/60` } : {}}
        >
          <LayoutList
            className={`w-5 h-5 ${isChristmasTheme ? 'text-slate-600' : 'text-white'}`}
            strokeWidth={2}
            style={isChristmasTheme ? { color: CHRISTMAS_COLORS.primary } : {}}
          />
        </div>
        {!collapsed && (
          <div className="min-w-0 overflow-hidden">
            <p className={`text-sm font-semibold truncate ${isChristmasTheme ? 'text-slate-900' : 'text-white'}`}>
              Listing
            </p>
            <p className={`text-[10px] truncate ${isChristmasTheme ? 'text-slate-500' : 'text-white/70'}`}>
              Master
            </p>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`p-1.5 rounded-lg transition-colors shrink-0 ${
          isChristmasTheme ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-700' : 'text-white/80 hover:bg-white/15 hover:text-white'
        }`}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>
  );
}

function CategoryNavSection({
  activeTab,
  onTabChange,
  sectionOpen,
  onSectionToggle,
  collapsed,
  isChristmasTheme,
}: {
  activeTab: ListingTab;
  onTabChange: (id: ListingTab) => void;
  sectionOpen: boolean;
  onSectionToggle: () => void;
  collapsed: boolean;
  isChristmasTheme: boolean;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => !collapsed && onSectionToggle()}
        title={collapsed ? 'Category' : undefined}
        className={`w-full flex items-center gap-3 rounded-lg text-left text-sm font-medium transition-all duration-200 ${
          collapsed ? 'justify-center px-0 py-3' : 'px-3 py-3'
        } ${
          isChristmasTheme
            ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            : 'text-white hover:bg-white/10'
        }`}
      >
        <FolderTree className="w-5 h-5 shrink-0" strokeWidth={2} />
        {!collapsed && (
          <>
            <span className="truncate flex-1">Category</span>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${sectionOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>
      {!collapsed && sectionOpen && (
        <div className="ml-4 mt-0.5 space-y-0.5 pl-2">
          {CATEGORY_SUB_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`w-full flex items-center gap-2 rounded-md py-2 px-2 text-left text-sm transition-all focus:outline-none focus-visible:ring-0 ${
                activeTab === id
                  ? isChristmasTheme
                    ? 'bg-slate-100 text-slate-900 font-medium'
                    : 'bg-[#E6007A] text-white font-medium'
                  : isChristmasTheme
                    ? 'text-slate-600 hover:bg-slate-50'
                    : 'text-white/90 hover:bg-white/10'
              }`}
              style={
                activeTab === id && isChristmasTheme
                  ? { background: `${CHRISTMAS_COLORS.light}/60`, color: CHRISTMAS_COLORS.primary }
                  : {}
              }
            >
              {id === 'category-add' ? (
                <Plus className="w-4 h-4 shrink-0" />
              ) : (
                <ListIcon className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductNavSection({
  activeTab,
  onTabChange,
  sectionOpen,
  onSectionToggle,
  collapsed,
  isChristmasTheme,
}: {
  activeTab: ListingTab;
  onTabChange: (id: ListingTab) => void;
  sectionOpen: boolean;
  onSectionToggle: () => void;
  collapsed: boolean;
  isChristmasTheme: boolean;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => !collapsed && onSectionToggle()}
        title={collapsed ? 'Product Master' : undefined}
        className={`w-full flex items-center gap-3 rounded-lg text-left text-sm font-medium transition-all duration-200 ${
          collapsed ? 'justify-center px-0 py-3' : 'px-3 py-3'
        } ${
          isChristmasTheme
            ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            : 'text-white hover:bg-white/10'
        }`}
      >
        <Package className="w-5 h-5 shrink-0" strokeWidth={2} />
        {!collapsed && (
          <>
            <span className="truncate flex-1">Product Master</span>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${sectionOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>
      {!collapsed && sectionOpen && (
        <div className="ml-4 mt-0.5 space-y-0.5 pl-2">
          {PRODUCT_SUB_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`w-full flex items-center gap-2 rounded-md py-2 px-2 text-left text-sm transition-all focus:outline-none focus-visible:ring-0 ${
                activeTab === id
                  ? isChristmasTheme
                    ? 'bg-slate-100 text-slate-900 font-medium'
                    : 'bg-[#E6007A] text-white font-medium'
                  : isChristmasTheme
                    ? 'text-slate-600 hover:bg-slate-50'
                    : 'text-white/90 hover:bg-white/10'
              }`}
              style={
                activeTab === id && isChristmasTheme
                  ? { background: `${CHRISTMAS_COLORS.light}/60`, color: CHRISTMAS_COLORS.primary }
                  : {}
              }
            >
              {id === 'product-add' ? (
                <Plus className="w-4 h-4 shrink-0" />
              ) : (
                <ListIcon className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ListingNavSection({
  activeTab,
  onTabChange,
  listingSectionTab,
  onListingSectionChange,
  sectionOpen,
  onSectionToggle,
  collapsed,
  isChristmasTheme,
}: {
  activeTab: ListingTab;
  onTabChange: (id: ListingTab) => void;
  listingSectionTab: ListingSectionTab;
  onListingSectionChange: (section: ListingSectionTab) => void;
  sectionOpen: boolean;
  onSectionToggle: () => void;
  collapsed: boolean;
  isChristmasTheme: boolean;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => !collapsed && onSectionToggle()}
        title={collapsed ? 'Listing' : undefined}
        className={`w-full flex items-center gap-3 rounded-lg text-left text-sm font-medium transition-all duration-200 ${
          collapsed ? 'justify-center px-0 py-3' : 'px-3 py-3'
        } ${
          isChristmasTheme
            ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            : 'text-white hover:bg-white/10'
        }`}
      >
        <List className="w-5 h-5 shrink-0" strokeWidth={2} />
        {!collapsed && (
          <>
            <span className="truncate flex-1">Listing</span>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${sectionOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>
      {!collapsed && sectionOpen && (
        <div className="ml-4 mt-0.5 space-y-0.5 pl-2">
          {LISTING_SECTION_TABS.map(({ id, label }) => {
            const isActive = activeTab === 'listing' && listingSectionTab === id;
            return (
              <button
                key={id}
                onClick={() => {
                  onTabChange('listing');
                  onListingSectionChange(id);
                }}
                className={`w-full flex items-center gap-2 rounded-md py-2 px-2 text-left text-sm transition-all focus:outline-none focus-visible:ring-0 ${
                  isActive
                    ? isChristmasTheme
                      ? 'bg-slate-100 text-slate-900 font-medium'
                      : 'bg-[#E6007A] text-white font-medium'
                    : isChristmasTheme
                      ? 'text-slate-600 hover:bg-slate-50 bg-transparent'
                      : 'text-white/90 bg-transparent hover:bg-white/10'
                }`}
                style={
                  isActive && !isChristmasTheme
                    ? { backgroundColor: '#E6007A', color: '#fff' }
                    : isActive && isChristmasTheme
                    ? { background: `${CHRISTMAS_COLORS.light}/60`, color: CHRISTMAS_COLORS.primary }
                    : {}
                }
              >
                <ListIcon className="w-4 h-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ImageNavSection({
  activeTab,
  onTabChange,
  sectionOpen,
  onSectionToggle,
  collapsed,
  isChristmasTheme,
}: {
  activeTab: ListingTab;
  onTabChange: (id: ListingTab) => void;
  sectionOpen: boolean;
  onSectionToggle: () => void;
  collapsed: boolean;
  isChristmasTheme: boolean;
}) {
  const subIcons: Record<string, LucideIcon> = {
    'image-upload': Upload,
    'image-view': ListIcon,
    'upload-logs': ScrollText,
  };
  return (
    <div>
      <button
        type="button"
        onClick={() => !collapsed && onSectionToggle()}
        title={collapsed ? 'Image' : undefined}
        className={`w-full flex items-center gap-3 rounded-lg text-left text-sm font-medium transition-all duration-200 ${
          collapsed ? 'justify-center px-0 py-3' : 'px-3 py-3'
        } ${
          isChristmasTheme
            ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            : 'text-white hover:bg-white/10'
        }`}
      >
        <ImageIcon className="w-5 h-5 shrink-0" strokeWidth={2} />
        {!collapsed && (
          <>
            <span className="truncate flex-1">Image</span>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${sectionOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>
      {!collapsed && sectionOpen && (
        <div className="ml-4 mt-0.5 space-y-0.5 pl-2">
          {IMAGE_SUB_TABS.map(({ id, label }) => {
            const Icon = subIcons[id] ?? ListIcon;
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`w-full flex items-center gap-2 rounded-md py-2 px-2 text-left text-sm transition-all focus:outline-none focus-visible:ring-0 ${
                  isActive
                    ? isChristmasTheme
                      ? 'bg-slate-100 text-slate-900 font-medium'
                      : 'font-medium'
                    : isChristmasTheme
                      ? 'text-slate-600 hover:bg-slate-50'
                      : 'hover:bg-white/10'
                }`}
                style={
                  isActive && isChristmasTheme
                    ? { background: `${CHRISTMAS_COLORS.light}/60`, color: CHRISTMAS_COLORS.primary }
                    : isActive && !isChristmasTheme
                    ? { backgroundColor: LISTING_SIDEBAR_THEME.accent, color: '#fff' }
                    : !isChristmasTheme
                    ? { color: LISTING_SIDEBAR_THEME.text }
                    : {}
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SellerNavSection({
  activeTab,
  onTabChange,
  sectionOpen,
  onSectionToggle,
  collapsed,
  isChristmasTheme,
}: {
  activeTab: ListingTab;
  onTabChange: (id: ListingTab) => void;
  sectionOpen: boolean;
  onSectionToggle: () => void;
  collapsed: boolean;
  isChristmasTheme: boolean;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => !collapsed && onSectionToggle()}
        title={collapsed ? 'Vendor Master' : undefined}
        className={`w-full flex items-center gap-3 rounded-lg text-left text-sm font-medium transition-all duration-200 ${
          collapsed ? 'justify-center px-0 py-3' : 'px-3 py-3'
        } ${
          isChristmasTheme
            ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            : 'text-white hover:bg-white/10'
        }`}
      >
        <Store className="w-5 h-5 shrink-0" strokeWidth={2} />
        {!collapsed && (
          <>
            <span className="truncate flex-1">Vendor Master</span>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${sectionOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>
      {!collapsed && sectionOpen && (
        <div className="ml-3 mt-1 space-y-1 pr-2">
          {SELLER_SUB_TABS.map(({ id, label }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`w-full flex items-center gap-2.5 rounded-lg py-2.5 px-3 text-left text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#330033] ${
                  isActive
                    ? isChristmasTheme
                      ? 'bg-slate-100 text-slate-900 shadow-sm'
                      : 'text-white shadow-md'
                    : isChristmasTheme
                      ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`}
                style={
                  isActive && isChristmasTheme
                    ? { background: `${CHRISTMAS_COLORS.light}/60`, color: CHRISTMAS_COLORS.primary }
                    : isActive && !isChristmasTheme
                    ? {
                        background: LISTING_SIDEBAR_THEME.accent,
                        borderLeft: '3px solid rgba(255,255,255,0.35)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }
                    : {}
                }
              >
                {id === 'seller-add' ? (
                  <Plus className="w-4 h-4 shrink-0" strokeWidth={2} />
                ) : (
                  <ListIcon className="w-4 h-4 shrink-0" strokeWidth={2} />
                )}
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InvoiceNavSection({
  activeTab,
  onTabChange,
  sectionOpen,
  onSectionToggle,
  collapsed,
  isChristmasTheme,
}: {
  activeTab: ListingTab;
  onTabChange: (id: ListingTab) => void;
  sectionOpen: boolean;
  onSectionToggle: () => void;
  collapsed: boolean;
  isChristmasTheme: boolean;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => !collapsed && onSectionToggle()}
        title={collapsed ? 'Invoice Recording' : undefined}
        className={`w-full flex items-center gap-3 rounded-lg text-left text-sm font-medium transition-all duration-200 ${
          collapsed ? 'justify-center px-0 py-3' : 'px-3 py-3'
        } ${
          isChristmasTheme
            ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            : 'text-white hover:bg-white/10'
        }`}
      >
        <FileText className="w-5 h-5 shrink-0" strokeWidth={2} />
        {!collapsed && (
          <>
            <span className="truncate flex-1">Invoice Recording</span>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${sectionOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>
      {!collapsed && sectionOpen && (
        <div className="ml-4 mt-0.5 space-y-0.5 pl-2">
          {INVOICE_SUB_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`w-full flex items-center gap-2 rounded-md py-2 px-2 text-left text-sm transition-all focus:outline-none focus-visible:ring-0 ${
                activeTab === id
                  ? isChristmasTheme
                    ? 'bg-slate-100 text-slate-900 font-medium'
                    : 'bg-[#E6007A] text-white font-medium'
                  : isChristmasTheme
                    ? 'text-slate-600 hover:bg-slate-50'
                    : 'text-white/90 hover:bg-white/10'
              }`}
              style={
                activeTab === id && isChristmasTheme
                  ? { background: `${CHRISTMAS_COLORS.light}/60`, color: CHRISTMAS_COLORS.primary }
                  : {}
              }
            >
              <ListIcon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CollectionNavSection({
  activeTab,
  onTabChange,
  sectionOpen,
  onSectionToggle,
  collapsed,
  isChristmasTheme,
}: {
  activeTab: ListingTab;
  onTabChange: (id: ListingTab) => void;
  sectionOpen: boolean;
  onSectionToggle: () => void;
  collapsed: boolean;
  isChristmasTheme: boolean;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => !collapsed && onSectionToggle()}
        title={collapsed ? 'Collection' : undefined}
        className={`w-full flex items-center gap-3 rounded-lg text-left text-sm font-medium transition-all duration-200 ${
          collapsed ? 'justify-center px-0 py-3' : 'px-3 py-3'
        } ${
          isChristmasTheme
            ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            : 'text-white hover:bg-white/10'
        }`}
      >
        <Layers className="w-5 h-5 shrink-0" strokeWidth={2} />
        {!collapsed && (
          <>
            <span className="truncate flex-1">Collection</span>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${sectionOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>
      {!collapsed && sectionOpen && (
        <div className="ml-4 mt-0.5 space-y-0.5 pl-2">
          {COLLECTION_SUB_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`w-full flex items-center gap-2 rounded-md py-2 px-2 text-left text-sm transition-all focus:outline-none focus-visible:ring-0 ${
                activeTab === id
                  ? isChristmasTheme
                    ? 'bg-slate-100 text-slate-900 font-medium'
                    : 'bg-[#E6007A] text-white font-medium'
                  : isChristmasTheme
                    ? 'text-slate-600 hover:bg-slate-50'
                    : 'text-white/90 hover:bg-white/10'
              }`}
              style={
                activeTab === id && isChristmasTheme
                  ? { background: `${CHRISTMAS_COLORS.light}/60`, color: CHRISTMAS_COLORS.primary }
                  : {}
              }
            >
              {id === 'collection-add' ? (
                <Plus className="w-4 h-4 shrink-0" />
              ) : (
                <ListIcon className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TopLevelNavItems({
  tabIds,
  activeTab,
  onTabChange,
  collapsed,
  isChristmasTheme,
}: {
  tabIds: ListingTab[];
  activeTab: ListingTab;
  onTabChange: (id: ListingTab) => void;
  collapsed: boolean;
  isChristmasTheme: boolean;
}) {
  return (
    <>
      {tabIds.map((id) => {
        const tab = TAB_CONFIG.find((t) => t.id === id);
        if (!tab) return null;
        const Icon = tab.icon;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            title={collapsed ? tab.label : undefined}
            className={`w-full flex items-center gap-3 rounded-lg text-left text-sm font-medium transition-all duration-200 ${
              collapsed ? 'justify-center px-0 py-3' : 'px-3 py-3'
            } ${
              activeTab === id
                ? isChristmasTheme
                  ? 'bg-slate-100 text-slate-900'
                  : 'bg-[#E6007A] text-white'
                : isChristmasTheme
                  ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  : 'text-white hover:bg-white/10'
            }`}
            style={
              activeTab === id && isChristmasTheme
                ? {
                    background: `${CHRISTMAS_COLORS.light}/60`,
                    color: CHRISTMAS_COLORS.primary,
                  }
                : {}
            }
          >
            <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
            {!collapsed && <span className="truncate">{tab.label}</span>}
          </button>
        );
      })}
    </>
  );
}
