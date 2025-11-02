'use client';

import { useEffect, useState } from 'react';
import { UrvannApiService } from '@/shared/services/urvannApi';
import SubstoreSelector from '@/components/analytics/SubstoreSelector';
import { TableSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { getAllSubstores, HUB_MAPPINGS, getHubBySubstore } from '@/shared/constants/hubs';

interface ProductCountData {
  [category: string]: {
    [substore: string]: number;
  };
}

interface HubData {
  [hub: string]: number;
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
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<ProductCountData>({});
  const [selectedSubstores, setSelectedSubstores] = useState<string[]>(getAllSubstores());
  const [selectedCategoryType, setSelectedCategoryType] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, ExpandedCategory>>({});

  // Function to get substores from selected hubs
  const getSubstoresFromSelectedHubs = (): string[] => {
    const substores = new Set<string>();
    selectedSubstores.forEach(substore => {
      substores.add(substore);
    });
    return Array.from(substores);
  };

  // Get selected hubs based on selected substores
  const getSelectedHubs = (): string[] => {
    const selectedHubs = new Set<string>();
    selectedSubstores.forEach(substore => {
      const hub = getHubBySubstore(substore);
      if (hub) selectedHubs.add(hub);
    });
    return Array.from(selectedHubs);
  };

  useEffect(() => {
    loadData();
  }, [selectedSubstores, selectedCategoryType]);

  // Function to handle category type selection and expansion
  const handleCategoryTypeSelect = async (category: Category, selectedType: string) => {
    const categoryId = category._id || category.alias;

    // If already expanded with same type, collapse it
    if (expandedCategories[categoryId]?.selectedType === selectedType) {
      const newExpandedCategories = { ...expandedCategories };
      delete newExpandedCategories[categoryId];
      setExpandedCategories(newExpandedCategories);
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
        // Get product counts for child categories
        const childCategories = result.data;
        const childAliases = childCategories.map((cat: Category) => cat.alias);
        const counts = await UrvannApiService.getAllProductCounts(
          childAliases, 
          selectedSubstores
        );

        // Update product counts
        setProductCounts(prev => ({
          ...prev,
          ...counts
        }));

        // Update expanded categories
        setExpandedCategories(prev => ({
          ...prev,
          [categoryId]: {
            categoryId,
            selectedType,
            isLoading: false,
            children: childCategories
          }
        }));
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

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadingProgress(0);
      setLoadingMessage('Loading categories...');
      
      // Get all published categories in priority order from API
      const response = await fetch('/api/categories');
      const result = await response.json();
      
      if (result.success) {
        let allCategories = result.data;
        
        // Filter by category type if not 'all'
        if (selectedCategoryType !== 'all') {
          allCategories = allCategories.filter((cat: Category) => cat.typeOfCategory === selectedCategoryType);
        }
        
        setCategories(allCategories);
        setLoadingProgress(20);
        setLoadingMessage('Categories loaded, fetching product counts...');

        // Get all category aliases (no pagination - load all at once)
        const allCategoryAliases = allCategories.map((cat: Category) => cat.alias);

        // Get product counts for all categories
        if (selectedSubstores.length > 0 && allCategoryAliases.length > 0) {
          setLoadingMessage(`Fetching product counts for ${allCategoryAliases.length} categories across ${selectedSubstores.length} substores...`);
          
          // Fetch counts with progress tracking
          const counts = await UrvannApiService.getAllProductCounts(
            allCategoryAliases, 
            selectedSubstores,
            (completed, total) => {
              const progress = 20 + (completed / total) * 70; // 20-90% range
              setLoadingProgress(Math.min(progress, 90));
              setLoadingMessage(`Fetching product counts... (${completed}/${total})`);
            }
          );
          
          setProductCounts(counts);
        }
        
        setLoadingProgress(100);
        setLoadingMessage('Complete!');
      } else {
        console.error('Failed to fetch categories:', result.message);
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header Container */}
        <div className="bg-linear-to-r from-blue-600 via-purple-600 to-indigo-700 shadow-lg">
          <div className="px-6 py-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Growth Analytics</h1>
                  <p className="text-blue-100 text-sm mt-1">Track product performance across categories and hubs</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="inline-flex items-center px-4 py-2 bg-white/20 text-white rounded-lg">
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {loadingMessage}
                </div>
                
                {/* Progress Bar */}
                <div className="w-64 bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-white h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
                
                <div className="text-white text-sm font-medium">
                  {Math.round(loadingProgress)}%
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="w-48">
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="w-64">
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{loadingMessage}</h3>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">{Math.round(loadingProgress)}% Complete</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Container */}
      <div className="bg-linear-to-r from-blue-600 via-purple-600 to-indigo-700 shadow-lg">
        <div className="px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Growth Analytics</h1>
                <p className="text-blue-100 text-sm mt-1">Track product performance across categories and hubs</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? 'Loading...' : 'Reload Data'}
              </button>
              
              <div className="flex items-center space-x-4">
                <div className="w-48">
                  <label className="block text-sm font-medium text-white mb-1">Category Type</label>
                  <select
                    value={selectedCategoryType}
                    onChange={(e) => setSelectedCategoryType(e.target.value)}
                    className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-md text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50"
                  >
                    <option value="all" className="text-gray-900">All Types</option>
                    <option value="L1" className="text-gray-900">L1</option>
                    <option value="L2" className="text-gray-900">L2</option>
                    <option value="L3" className="text-gray-900">L3</option>
                  </select>
                </div>
                
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
      </div>

      {/* Main Content */}
      <div className="p-6">
      
      {selectedSubstores.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Please select at least one substore to view analytics</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-linear-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-200">
                      Category
                    </th>
                    {getSubstoresFromSelectedHubs().map(substore => (
                      <th key={substore} className="px-6 py-4 text-center text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">
                        <div className="flex flex-col items-center">
                          <span className="font-medium">{substore}</span>
                          <span className="text-xs text-gray-500 font-normal">Products</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {categories.map((category, index) => {
                    const isUnpublished = category.publish === 0 || category.publish === false;
                    return (
                      <tr key={category._id || category.category} className={`hover:bg-gray-50 transition-colors duration-150 ${
                        isUnpublished 
                          ? 'bg-gray-200' 
                          : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <div className={`w-2 h-2 rounded-full mr-3 ${
                                isUnpublished ? 'bg-gray-400' : 'bg-green-500'
                              }`}></div>
                              <span className={`text-sm font-medium ${
                                isUnpublished ? 'text-gray-500' : 'text-gray-900'
                              }`}>
                                {category.category}
                                {isUnpublished && <span className="ml-2 text-xs text-gray-400">(Unpublished)</span>}
                              </span>
                            </div>
                            
                            {/* Category Type Selector */}
                            <div className="flex items-center space-x-2">
                              <select
                                value={expandedCategories[category._id || category.alias]?.selectedType || ''}
                                onChange={(e) => handleCategoryTypeSelect(category, e.target.value)}
                                className={`text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                                  isUnpublished ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-900'
                                }`}
                                disabled={isUnpublished}
                              >
                                <option value="">Select Type</option>
                                {category.typeOfCategory === 'L1' && <option value="L2">Show L2</option>}
                                {category.typeOfCategory === 'L2' && <option value="L3">Show L3</option>}
                              </select>
                              
                              {/* Loading Spinner */}
                              {expandedCategories[category._id || category.alias]?.isLoading && (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                              )}
                            </div>
                          </div>
                        </td>
                        {getSubstoresFromSelectedHubs().map(substore => {
                          const count = productCounts[category.alias]?.[substore] || 0;
                          const getCountStyle = (count: number) => {
                            if (count === 0) return 'bg-red-50 text-red-700 border-red-200';
                            if (count > 1000) return 'bg-green-50 text-green-700 border-green-200';
                            if (count > 500) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                            if (count > 100) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
                            return 'bg-blue-50 text-blue-700 border-blue-200';
                          };
                          
                          return (
                            <td key={`${category.category}-${substore}`} className="px-6 py-4 whitespace-nowrap text-center">
                              <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${
                                isUnpublished ? 'bg-gray-100 text-gray-500 border-gray-300' : getCountStyle(count)
                              }`}>
                                {count.toLocaleString()}
                              </div>
                            </td>
                          );
                        })}
                      {/* Expanded Child Categories */}
                      {expandedCategories[category._id || category.alias]?.children.map((childCategory) => (
                        <tr key={childCategory._id || childCategory.category} className="bg-blue-50/30">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="pl-8 flex items-center">
                                <svg className="w-4 h-4 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span className="text-sm font-medium text-blue-900">
                                  {childCategory.category}
                                  <span className="ml-2 text-xs text-blue-600">({childCategory.typeOfCategory})</span>
                                </span>
                              </div>
                            </div>
                          </td>
                          {getSubstoresFromSelectedHubs().map(substore => {
                            const count = productCounts[childCategory.alias]?.[substore] || 0;
                            const getCountStyle = (count: number) => {
                              if (count === 0) return 'bg-blue-50 text-blue-700 border-blue-200';
                              if (count > 1000) return 'bg-green-50/70 text-green-700 border-green-200';
                              if (count > 500) return 'bg-emerald-50/70 text-emerald-700 border-emerald-200';
                              if (count > 100) return 'bg-yellow-50/70 text-yellow-700 border-yellow-200';
                              return 'bg-blue-50/70 text-blue-700 border-blue-200';
                            };
                            
                            return (
                              <td key={`${childCategory.category}-${substore}`} className="px-6 py-4 whitespace-nowrap text-center">
                                <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${getCountStyle(count)}`}>
                                  {count.toLocaleString()}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Categories Summary */}
          <div className="mt-6 flex justify-center items-center bg-gray-50 rounded-lg px-4 py-3">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{categories.length}</span> {categories.length === 1 ? 'category' : 'categories'}
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
