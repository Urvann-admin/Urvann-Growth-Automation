'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ArrowLeft, LayoutList, FolderTree, Package, List, ChevronLeft, ChevronRight, ChevronDown, Plus, ListIcon } from 'lucide-react';
import { ChristmasTheme } from '@/components/theme/ChristmasTheme';
import { THEME_CONFIG, CHRISTMAS_COLORS } from '@/config/theme';
import { CategoryMasterForm } from './CategoryMasterForm';
import { ViewCategories } from './ViewCategories';
import { ProductMasterForm } from './ProductMasterForm';

type ListingTab = 'category-add' | 'category-view' | 'product-master' | 'listing';

const CATEGORY_SUB_TABS: { id: ListingTab; label: string }[] = [
  { id: 'category-add', label: 'Add Category' },
  { id: 'category-view', label: 'View Category' },
];

const TAB_CONFIG: { id: ListingTab; label: string; subtitle: string; icon: typeof FolderTree }[] = [
  { id: 'category-add', label: 'Add Category', subtitle: 'Create a new category', icon: Plus },
  { id: 'category-view', label: 'View Category', subtitle: 'View and edit categories', icon: ListIcon },
  { id: 'product-master', label: 'Product Master', subtitle: 'Manage products and catalog', icon: Package },
  { id: 'listing', label: 'Listing', subtitle: 'Listing rules and status', icon: List },
];

export default function ListingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ListingTab>('category-add');
  const [categorySectionOpen, setCategorySectionOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setLoading(false);
  }, [user, isLoading, router]);

  // Sync active tab with hash (e.g. /dashboard/listing#category-add)
  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    if (hash === 'category-add' || hash === 'category-view' || hash === 'product-master' || hash === 'listing') {
      setActiveTab(hash);
    }
  }, []);

  const isChristmasTheme = THEME_CONFIG.ENABLE_CHRISTMAS_THEME;

  if (loading) {
    return (
      <ChristmasTheme variant="dashboard">
        <div
          className={`min-h-screen flex items-center justify-center ${isChristmasTheme ? '' : 'bg-gradient-to-br from-slate-50 via-white to-emerald-50/30'}`}
          style={isChristmasTheme ? {
            background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.background} 0%, ${CHRISTMAS_COLORS.white} 50%, ${CHRISTMAS_COLORS.light} 100%)`,
          } : {}}
        >
          <div className="flex flex-col items-center space-y-4">
            <div
              className={`animate-spin rounded-full h-12 w-12 border-3 border-t-transparent ${isChristmasTheme ? '' : 'border-emerald-500'}`}
              style={isChristmasTheme ? {
                borderColor: `${CHRISTMAS_COLORS.primary} transparent transparent transparent`,
              } : {}}
            />
            <p className={`text-sm ${isChristmasTheme ? 'text-slate-700' : 'text-slate-600'}`}>
              Loading...
            </p>
          </div>
        </div>
      </ChristmasTheme>
    );
  }

  if (!user) return null;

  return (
    <ChristmasTheme variant="dashboard">
      <div
        className={`min-h-screen flex ${isChristmasTheme ? '' : 'bg-[#F4F6F8]'}`}
        style={isChristmasTheme ? {
          background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.background} 0%, ${CHRISTMAS_COLORS.white} 50%, ${CHRISTMAS_COLORS.light} 100%)`,
        } : {}}
      >
        {/* Collapsible Sidebar - dark purple, magenta active (College Finder theme) */}
        <aside
          className={`flex-shrink-0 h-screen sticky top-0 rounded-r-xl shadow-lg overflow-hidden transition-[width] duration-300 ease-in-out ${
            sidebarCollapsed ? 'w-[72px]' : 'w-60'
          } ${isChristmasTheme ? '' : 'bg-[#330033] border-r border-[#330033]'}`}
          style={isChristmasTheme ? {
            background: CHRISTMAS_COLORS.white,
            borderRight: `2px solid ${CHRISTMAS_COLORS.light}`,
            borderTop: `1px solid ${CHRISTMAS_COLORS.light}`,
            borderBottom: `1px solid ${CHRISTMAS_COLORS.light}`,
            boxShadow: `0 4px 6px -1px ${CHRISTMAS_COLORS.primary}/10`,
          } : {}}
        >
            {/* Sidebar header: logo + title + collapse toggle */}
            <div className={`flex items-center justify-between gap-2 px-3 py-4 ${isChristmasTheme ? 'border-b border-slate-100' : 'border-b border-white/15'}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isChristmasTheme ? '' : 'bg-white/10'}`}
                  style={isChristmasTheme ? { background: `${CHRISTMAS_COLORS.light}/60` } : {}}
                >
                  <LayoutList className={`w-5 h-5 ${isChristmasTheme ? 'text-slate-600' : 'text-white'}`} strokeWidth={2} style={isChristmasTheme ? { color: CHRISTMAS_COLORS.primary } : {}} />
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0 overflow-hidden">
                    <p className={`text-sm font-semibold truncate ${isChristmasTheme ? 'text-slate-900' : 'text-white'}`}>Listing</p>
                    <p className={`text-[10px] truncate ${isChristmasTheme ? 'text-slate-500' : 'text-white/70'}`}>Master</p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((c) => !c)}
                className={`p-1.5 rounded-lg transition-colors shrink-0 ${isChristmasTheme ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-700' : 'text-white/80 hover:bg-white/15 hover:text-white'}`}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Nav items - Category collapsible with Add / View */}
            <nav className="p-2 space-y-0.5">
              {/* Category (collapsible) */}
              <div>
                <button
                  type="button"
                  onClick={() => !sidebarCollapsed && setCategorySectionOpen((o) => !o)}
                  title={sidebarCollapsed ? 'Category' : undefined}
                  className={`w-full flex items-center gap-3 rounded-lg text-left text-sm font-medium transition-all duration-200 ${
                    sidebarCollapsed ? 'justify-center px-0 py-3' : 'px-3 py-3'
                  } ${
                    isChristmasTheme
                      ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <FolderTree className="w-5 h-5 shrink-0" strokeWidth={2} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="truncate flex-1">Category</span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 transition-transform ${categorySectionOpen ? 'rotate-180' : ''}`}
                      />
                    </>
                  )}
                </button>
                {!sidebarCollapsed && categorySectionOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 pl-2">
                    {CATEGORY_SUB_TABS.map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => {
                          setActiveTab(id);
                          if (typeof window !== 'undefined') window.location.hash = id;
                        }}
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
              {/* Product Master, Listing */}
              {(['product-master', 'listing'] as const).map((id) => {
                const tab = TAB_CONFIG.find((t) => t.id === id);
                if (!tab) return null;
                const Icon = tab.icon;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveTab(id);
                      if (typeof window !== 'undefined') window.location.hash = id;
                    }}
                    title={sidebarCollapsed ? tab.label : undefined}
                    className={`w-full flex items-center gap-3 rounded-lg text-left text-sm font-medium transition-all duration-200 ${
                      sidebarCollapsed ? 'justify-center px-0 py-3' : 'px-3 py-3'
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
                    {!sidebarCollapsed && <span className="truncate">{tab.label}</span>}
                  </button>
                );
              })}
            </nav>
          </aside>

        {/* Right side: header + main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar - white/light gray, magenta accent */}
          <div
            className={`bg-white shadow-sm shrink-0 sticky top-0 z-10 ${isChristmasTheme ? '' : 'border-b border-slate-200'}`}
            style={isChristmasTheme ? {
              borderBottom: `2px solid ${CHRISTMAS_COLORS.light}`,
              boxShadow: `0 4px 6px -1px ${CHRISTMAS_COLORS.primary}/10`,
            } : {}}
          >
            <div className="px-6 py-3">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className={`p-2 rounded-lg transition-colors ${isChristmasTheme ? 'hover:bg-slate-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'}`}
                  aria-label="Back to dashboard"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${isChristmasTheme ? '' : 'bg-[#E6007A]'}`}
                    style={isChristmasTheme ? {
                      background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.primary} 0%, ${CHRISTMAS_COLORS.secondary} 100%)`,
                    } : {}}
                  >
                    {(() => {
                      const tab = TAB_CONFIG.find((t) => t.id === activeTab);
                      const iconId = activeTab === 'category-view' ? 'category-view' : activeTab;
                      const t = TAB_CONFIG.find((x) => x.id === iconId) ?? TAB_CONFIG[0];
                      const Icon = t?.icon ?? LayoutList;
                      return <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />;
                    })()}
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-slate-900">
                      {TAB_CONFIG.find((t) => t.id === activeTab)?.label ?? 'Listing'}
                    </h1>
                    <p className={`text-xs ${isChristmasTheme ? 'text-slate-600' : 'text-slate-500'}`}>
                      {TAB_CONFIG.find((t) => t.id === activeTab)?.subtitle ?? 'Category Master, Product Master & Listing'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main content area */}
          <main
            className={`flex-1 min-w-0 p-6 overflow-auto ${isChristmasTheme ? '' : 'bg-[#F4F6F8]'}`}
          >
            {activeTab === 'category-add' && <CategoryMasterForm />}
            {activeTab === 'category-view' && <ViewCategories />}
            {activeTab === 'product-master' && <ProductMasterForm />}
            {activeTab === 'listing' && (
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Listing</h2>
                <p className="text-sm text-slate-600">
                  Listing management. This section can host listing rules, bulk listing, and listing status.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </ChristmasTheme>
  );
}
