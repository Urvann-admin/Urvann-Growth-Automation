'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ArrowLeft, LayoutList, FolderTree, Package, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { ChristmasTheme } from '@/components/theme/ChristmasTheme';
import { THEME_CONFIG, CHRISTMAS_COLORS } from '@/config/theme';
import { CategoryMasterForm } from './components/CategoryMasterForm';

type ListingTab = 'category-master' | 'product-master' | 'listing';

const TAB_CONFIG: { id: ListingTab; label: string; icon: typeof FolderTree }[] = [
  { id: 'category-master', label: 'Category Master', icon: FolderTree },
  { id: 'product-master', label: 'Product Master', icon: Package },
  { id: 'listing', label: 'Listing', icon: List },
];

export default function ListingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ListingTab>('category-master');
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

  // Sync active tab with hash (e.g. /dashboard/listing#category-master)
  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    if (hash === 'category-master' || hash === 'product-master' || hash === 'listing') {
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
        className={`min-h-screen flex ${isChristmasTheme ? '' : 'bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-50'}`}
        style={isChristmasTheme ? {
          background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.background} 0%, ${CHRISTMAS_COLORS.white} 50%, ${CHRISTMAS_COLORS.light} 100%)`,
        } : {}}
      >
        {/* Collapsible Sidebar - attached left, full height */}
        <aside
          className={`flex-shrink-0 h-screen sticky top-0 rounded-r-xl shadow-md overflow-hidden transition-[width] duration-300 ease-in-out ${
            sidebarCollapsed ? 'w-[72px]' : 'w-60'
          } ${isChristmasTheme ? '' : 'bg-white border-y border-r border-slate-200'}`}
          style={isChristmasTheme ? {
            background: CHRISTMAS_COLORS.white,
            borderRight: `2px solid ${CHRISTMAS_COLORS.light}`,
            borderTop: `1px solid ${CHRISTMAS_COLORS.light}`,
            borderBottom: `1px solid ${CHRISTMAS_COLORS.light}`,
            boxShadow: `0 4px 6px -1px ${CHRISTMAS_COLORS.primary}/10`,
          } : {}}
        >
            {/* Sidebar header: logo + title + collapse toggle */}
            <div className="flex items-center justify-between gap-2 px-3 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isChristmasTheme ? '' : 'bg-slate-100'}`}
                  style={isChristmasTheme ? { background: `${CHRISTMAS_COLORS.light}/60` } : {}}
                >
                  <LayoutList className="w-5 h-5 text-slate-600" strokeWidth={2} style={isChristmasTheme ? { color: CHRISTMAS_COLORS.primary } : {}} />
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0 overflow-hidden">
                    <p className="text-sm font-semibold text-slate-900 truncate">Listing</p>
                    <p className="text-[10px] text-slate-500 truncate">Master</p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((c) => !c)}
                className={`p-1.5 rounded-lg transition-colors shrink-0 ${isChristmasTheme ? 'hover:bg-slate-100' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'}`}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Section label */}
            {!sidebarCollapsed && (
              <div className="px-3 pt-3 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Overview
                </p>
              </div>
            )}

            {/* Nav items */}
            <nav className="p-2">
              {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  title={sidebarCollapsed ? label : undefined}
                  className={`w-full flex items-center gap-3 rounded-lg text-left text-sm font-medium transition-colors ${
                    sidebarCollapsed ? 'justify-center px-0 py-3' : 'px-3 py-3'
                  } ${
                    activeTab === id
                      ? isChristmasTheme
                        ? ''
                        : 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
                  {!sidebarCollapsed && <span className="truncate">{label}</span>}
                </button>
              ))}
            </nav>
          </aside>

        {/* Right side: header + main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div
            className={`bg-white shadow-sm shrink-0 sticky top-0 z-10 ${isChristmasTheme ? '' : 'border-b border-emerald-100/50'}`}
            style={isChristmasTheme ? {
              borderBottom: `2px solid ${CHRISTMAS_COLORS.light}`,
              boxShadow: `0 4px 6px -1px ${CHRISTMAS_COLORS.primary}/10`,
            } : {}}
          >
            <div className="px-6 py-3">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className={`p-2 rounded-lg transition-colors ${isChristmasTheme ? 'hover:bg-slate-100' : 'hover:bg-emerald-50 text-slate-600 hover:text-emerald-700'}`}
                  aria-label="Back to dashboard"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-md ${isChristmasTheme ? '' : 'bg-gradient-to-br from-slate-600 to-slate-700'}`}
                    style={isChristmasTheme ? {
                      background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.primary} 0%, ${CHRISTMAS_COLORS.secondary} 100%)`,
                    } : {}}
                  >
                    <LayoutList className="w-6 h-6 text-white" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-slate-900">Listing</h1>
                    <p className={`text-xs ${isChristmasTheme ? 'text-slate-600' : 'text-slate-500'}`}>
                      Category Master, Product Master & Listing
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main content area */}
          <main
            className={`flex-1 min-w-0 p-6 overflow-auto ${isChristmasTheme ? '' : ''}`}
          >
            {activeTab === 'category-master' && <CategoryMasterForm />}
            {activeTab === 'product-master' && (
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Product Master</h2>
                <p className="text-sm text-slate-600">
                  Manage products here. This section can host product catalog, SKUs, and product details.
                </p>
              </div>
            )}
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
