'use client';

import React, { useEffect, useState } from 'react';
import { useRealtimeCounts } from '@/shared/hooks';
import SubstoreSelector from '@/components/analytics/SubstoreSelector';
import { getAllSubstores, getHubBySubstore, formatSubstoreForDisplay } from '@/shared/constants/hubs';

interface ProductCountData {
  [category: string]: {
    [substore: string]: number;
  };
}

interface Category {
  _id?: string;
  category: string;
  alias: string;
  typeOfCategory: string;
  l1Parent: string;
  l2Parent: string;
  l3Parent: string;
  publish: boolean | number;
  priorityOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ExpandedCategory {
  categoryId: string;
  selectedType: string;
  isLoading: boolean;
  children: Category[];
}

export default function GrowthAnalyticsPage() {
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedSubstores, setSelectedSubstores] = useState<string[]>(getAllSubstores());
  const [expandedCategories, setExpandedCategories] = useState<Record<string, ExpandedCategory>>({});

  // Use real-time counts hook
  const categoryAliases = categories.map(cat => cat.alias);
  const { 
    counts: productCounts, 
    connected, 
    loading: loadingCounts, 
    lastUpdate,
    error: countsError 
  } = useRealtimeCounts(categoryAliases, selectedSubstores);

  // Get substores from selected hubs
  const getSubstoresFromSelectedHubs = (): string[] => {
    const substores = new Set<string>();
    selectedSubstores.forEach(substore => {
      substores.add(substore);
    });
    return Array.from(substores);
  };

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Function to handle category type selection and expansion
  const handleCategoryTypeSelect = async (category: Category, selectedType: string) => {
    const categoryId = category._id || category.alias;

    // If empty string selected (close/collapse) or already expanded with same type, collapse it
    if (selectedType === '' || expandedCategories[categoryId]?.selectedType === selectedType) {
      const expanded = expandedCategories[categoryId];
      const newExpandedCategories = { ...expandedCategories };
      delete newExpandedCategories[categoryId];
      setExpandedCategories(newExpandedCategories);
      
      // Remove child categories from the categories list
      if (expanded?.children) {
        const childIds = expanded.children.map((child: Category) => child._id || child.alias);
        setCategories(prev => prev.filter(cat => {
          const catId = cat._id || cat.alias;
          return !childIds.includes(catId);
        }));
      }
      return;
    }

    // Start loading state
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: {
        categoryId,
        selectedType,
        isLoading: true,
        children: []
      }
    }));

    try {
      // Fetch child categories
      const response = await fetch(`/api/categories/children?parentAlias=${category.alias}&parentType=${category.typeOfCategory}`);
      const result = await response.json();

      if (result.success) {
        // Get child categories
        const childCategories = result.data;

        // Update expanded categories (counts will come from real-time hook automatically)
        setExpandedCategories(prev => ({
          ...prev,
          [categoryId]: {
            categoryId,
            selectedType,
            isLoading: false,
            children: childCategories
          }
        }));
        
        // Add child categories to main categories list so they get counted
        setCategories(prev => [...prev, ...childCategories]);
      } else {
        console.error('Failed to fetch child categories:', result.message);
        // Remove loading state on error
        const newExpandedCategories = { ...expandedCategories };
        delete newExpandedCategories[categoryId];
        setExpandedCategories(newExpandedCategories);
      }
    } catch (error) {
      console.error('Error expanding category:', error);
      // Remove loading state on error
      const newExpandedCategories = { ...expandedCategories };
      delete newExpandedCategories[categoryId];
      setExpandedCategories(newExpandedCategories);
    }
  };

  // Load categories only (counts come from real-time hook)
  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      
      // Get all published categories in priority order from API
      const response = await fetch('/api/categories');
      const result = await response.json();
      
      if (result.success) {
        const allCategories = result.data;
        setCategories(allCategories);
      } else {
        console.error('Failed to fetch categories:', result.message);
      }

    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loading = loadingCategories || loadingCounts;

  if (loadingCategories) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4">
        <div className="max-w-[1600px] mx-auto">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-6">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
              <span className="text-sm text-slate-700">Loading categories...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Modern Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Title Section */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Growth Analytics</h1>
                <p className="text-xs text-slate-500">Product performance tracking</p>
              </div>
            </div>
            
            {/* Status and Controls */}
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-50/50 rounded-lg border border-slate-200/60 backdrop-blur-sm">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500'}`}></div>
                <span className="text-xs font-medium text-slate-700">
                  {connected ? 'Live' : 'Offline'}
                </span>
                {lastUpdate && (
                  <span className="text-xs text-slate-400">
                    • {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
                </div>
                
              {/* Substore Selector */}
                <div className="w-64">
                  <SubstoreSelector 
                    selectedSubstores={selectedSubstores}
                    onSubstoreChange={setSelectedSubstores}
                  />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto p-4">
      {selectedSubstores.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-8 text-center">
            <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-slate-700 font-medium">No substores selected</p>
            <p className="text-sm text-slate-500 mt-1">Please select at least one substore to view analytics</p>
        </div>
      ) : (
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
            {/* Compact Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200/60">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="sticky left-0 z-10 bg-slate-50 px-2 py-1.5 text-left text-[10px] font-semibold text-slate-700 uppercase tracking-wide border-r border-slate-200">
                      Category
                    </th>
                    {getSubstoresFromSelectedHubs().map(substore => (
                      <th key={substore} className="px-2 py-1.5 text-center text-[10px] font-semibold text-slate-700 uppercase tracking-wide">
                        {formatSubstoreForDisplay(substore)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-slate-100">
                  {categories.map((category, index) => {
                    const isUnpublished = category.publish === 0 || category.publish === false;
                    const categoryId = category._id || category.alias;
                    const uniqueKey = `${category._id || 'no-id'}-${category.alias}-${index}`;
                    const isExpanded = expandedCategories[categoryId];
                    
                    return (
                      <React.Fragment key={uniqueKey}>
                        <tr className={`hover:bg-slate-50/50 transition-all duration-200 ${isUnpublished ? 'bg-slate-100/40' : ''}`}>
                          <td className="sticky left-0 z-10 bg-white px-2 py-1.5 whitespace-nowrap border-r border-slate-200">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="relative group min-w-0">
                                  <span 
                                    className={`text-xs font-medium truncate block ${isUnpublished ? 'text-slate-500' : 'text-slate-900'}`}
                                  >
                                    {category.category.length > 15 ? category.category.substring(0, 15) + '...' : category.category}
                                  </span>
                                  {category.category.length > 15 && (
                                    <div className="absolute bottom-full left-0 mb-2 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-[100] shadow-xl">
                                {category.category}
                                      <div className="absolute top-full left-3 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-slate-900"></div>
                                    </div>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-normal flex-shrink-0">
                                  {category.typeOfCategory}
                              </span>
                            </div>
                            
                              {/* Expand/Collapse Button */}
                              {!isUnpublished && (
                              <select
                                  value={isExpanded?.selectedType || ''}
                                onChange={(e) => handleCategoryTypeSelect(category, e.target.value)}
                                  className="text-[10px] px-1 py-0.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500/30 flex-shrink-0 transition-all"
                              >
                                  <option value="">{isExpanded ? '−' : '+'}</option>
                                  {category.typeOfCategory === 'L1' && <option value="L2">L2</option>}
                                  {category.typeOfCategory === 'L2' && <option value="L3">L3</option>}
                              </select>
                              )}
                          </div>
                        </td>
                        {getSubstoresFromSelectedHubs().map(substore => {
                          const count = productCounts[category.alias]?.[substore] || 0;
                            const getCountColor = (count: number) => {
                              if (count === 0) return 'text-rose-700 bg-rose-50/80 border border-rose-200/30';
                              if (count > 1000) return 'text-emerald-700 bg-emerald-50/80 border border-emerald-200/30';
                              if (count > 500) return 'text-teal-700 bg-teal-50/80 border border-teal-200/30';
                              if (count > 100) return 'text-amber-700 bg-amber-50/80 border border-amber-200/30';
                              return 'text-indigo-700 bg-indigo-50/80 border border-indigo-200/30';
                          };
                          
                          return (
                              <td key={`${category.alias}-${substore}`} className="px-2 py-1.5 whitespace-nowrap text-center">
                                <span className={`inline-block px-1.5 py-0.5 rounded-md text-[11px] font-semibold ${isUnpublished ? 'bg-slate-100 text-slate-500' : getCountColor(count)}`}>
                                {count.toLocaleString()}
                                </span>
                            </td>
                          );
                        })}
                        </tr>
                        
                      {/* Expanded Child Categories */}
                        {isExpanded?.children.map((childCategory, childIndex) => (
                          <tr key={`${childCategory._id || 'no-id'}-${childCategory.alias}-${categoryId}-${childIndex}`} className="bg-indigo-50/20 backdrop-blur-sm">
                            <td className="sticky left-0 z-10 bg-indigo-50 px-2 py-1.5 whitespace-nowrap border-r border-indigo-200">
                              <div className="flex items-center pl-4 gap-1.5">
                                <svg className="w-2.5 h-2.5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <div className="relative group min-w-0">
                                  <span 
                                    className="text-xs font-medium text-indigo-900 truncate block"
                                  >
                                    {childCategory.category.length > 12 ? childCategory.category.substring(0, 12) + '...' : childCategory.category}
                                  </span>
                                  {childCategory.category.length > 12 && (
                                    <div className="absolute bottom-full left-0 mb-2 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-[100] shadow-xl">
                                  {childCategory.category}
                                      <div className="absolute top-full left-3 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-slate-900"></div>
                                    </div>
                                  )}
                                </div>
                                <span className="text-[10px] text-indigo-600 font-normal flex-shrink-0">
                                  {childCategory.typeOfCategory}
                                </span>
                            </div>
                          </td>
                          {getSubstoresFromSelectedHubs().map(substore => {
                            const count = productCounts[childCategory.alias]?.[substore] || 0;
                              const getCountColor = (count: number) => {
                                if (count === 0) return 'text-slate-600 bg-slate-100/80 border border-slate-200/40';
                                if (count > 1000) return 'text-emerald-700 bg-emerald-100/80 border border-emerald-200/40';
                                if (count > 500) return 'text-teal-700 bg-teal-100/80 border border-teal-200/40';
                                if (count > 100) return 'text-amber-700 bg-amber-100/80 border border-amber-200/40';
                                return 'text-indigo-700 bg-indigo-100/80 border border-indigo-200/40';
                            };
                            
                            return (
                                <td key={`${childCategory.alias}-${substore}`} className="px-2 py-1.5 whitespace-nowrap text-center">
                                  <span className={`inline-block px-1.5 py-0.5 rounded-md text-[11px] font-semibold ${getCountColor(count)}`}>
                                  {count.toLocaleString()}
                                  </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Stats */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{categories.length}</span> {categories.length === 1 ? 'category' : 'categories'}
          </div>
          {countsError && (
            <div className="text-rose-600 font-medium">
              ⚠️ {countsError}
            </div>
          )}
          </div>
      </div>
    </div>
  );
}
