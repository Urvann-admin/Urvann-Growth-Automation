'use client';

import { LayoutList, FolderTree, Package, ChevronLeft, ChevronRight, ChevronDown, Plus, ListIcon } from 'lucide-react';
import { THEME_CONFIG, CHRISTMAS_COLORS } from '@/config/theme';
import {
  CATEGORY_SUB_TABS,
  PRODUCT_SUB_TABS,
  TAB_CONFIG,
  LISTING_TOP_LEVEL_TABS,
  type ListingTab,
} from '../config';

export interface ListingSidebarProps {
  activeTab: ListingTab;
  onTabChange: (id: ListingTab) => void;
  categorySectionOpen: boolean;
  onCategorySectionToggle: () => void;
  productSectionOpen: boolean;
  onProductSectionToggle: () => void;
  sidebarCollapsed: boolean;
  onSidebarCollapsedToggle: () => void;
}

export function ListingSidebar({
  activeTab,
  onTabChange,
  categorySectionOpen,
  onCategorySectionToggle,
  productSectionOpen,
  onProductSectionToggle,
  sidebarCollapsed,
  onSidebarCollapsedToggle,
}: ListingSidebarProps) {
  const isChristmasTheme = THEME_CONFIG.ENABLE_CHRISTMAS_THEME;

  return (
    <aside
      className={`flex-shrink-0 h-screen sticky top-0 rounded-r-xl shadow-lg overflow-hidden transition-[width] duration-300 ease-in-out ${
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
        <CategoryNavSection
          activeTab={activeTab}
          onTabChange={onTabChange}
          sectionOpen={categorySectionOpen}
          onSectionToggle={onCategorySectionToggle}
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
