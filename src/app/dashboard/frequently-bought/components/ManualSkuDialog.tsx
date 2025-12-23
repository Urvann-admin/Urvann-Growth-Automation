'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Plus, Trash2, Package, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { UniqueSku } from '@/types/frequentlyBought';
import { HUB_MAPPINGS, getSubstoresByHub } from '@/shared/constants/hubs';

interface ManualSkuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (hubSkus: Record<string, string[]>) => void;
  topSkus?: UniqueSku[]; // Top SKUs for auto-population
}

export default function ManualSkuDialog({ open, onOpenChange, onConfirm, topSkus = [] }: ManualSkuDialogProps) {
  // State: hub -> array of SKUs (each hub can have 1-6 SKUs)
  const [hubSkus, setHubSkus] = useState<Record<string, string[]>>({});
  // Loading state for auto-populate per hub
  const [loadingHub, setLoadingHub] = useState<string | null>(null);
  // Loading state for overall populate
  const [loadingAll, setLoadingAll] = useState(false);

  // Initialize hubs with empty arrays when dialog opens
  useEffect(() => {
    if (open) {
      const initialHubSkus: Record<string, string[]> = {};
      HUB_MAPPINGS.forEach(hub => {
        initialHubSkus[hub.hub] = ['']; // Each hub starts with one empty field
      });
      setHubSkus(initialHubSkus);
    }
  }, [open]);

  const handleAddSku = (hub: string) => {
    const currentSkus = hubSkus[hub] || [''];
    if (currentSkus.length < 6) {
      setHubSkus({
        ...hubSkus,
        [hub]: [...currentSkus, '']
      });
    }
  };

  const handleRemoveSku = (hub: string, index: number) => {
    const currentSkus = hubSkus[hub] || [''];
    if (currentSkus.length > 1) {
      setHubSkus({
        ...hubSkus,
        [hub]: currentSkus.filter((_, i) => i !== index)
      });
    } else {
      // If only one input, just clear it
      setHubSkus({
        ...hubSkus,
        [hub]: ['']
      });
    }
  };

  const handleSkuChange = (hub: string, index: number, value: string) => {
    const currentSkus = hubSkus[hub] || [''];
    const newSkus = [...currentSkus];
    newSkus[index] = value.trim().toUpperCase();
    setHubSkus({
      ...hubSkus,
      [hub]: newSkus
    });
  };

  const handleAutoPopulateHub = async (hub: string) => {
    setLoadingHub(hub);
    try {
      // NEW LOGIC: Get substore arrays from topSkus that belong to this hub
      const hubSubstores = getSubstoresByHub(hub);
      const allSubstores = new Set<string>();
      
      // Collect all substores from topSkus that match this hub's substores
      for (const sku of topSkus) {
        const skuSubstores = Array.isArray(sku.substore) ? sku.substore : (sku.substore ? [sku.substore] : []);
        for (const substore of skuSubstores) {
          if (hubSubstores.includes(substore.toLowerCase())) {
            allSubstores.add(substore.toLowerCase());
          }
        }
      }
      
      // If no substores found from topSkus, fallback to hub's substores
      const substoresToUse = allSubstores.size > 0 ? Array.from(allSubstores) : hubSubstores;
      
      if (substoresToUse.length === 0) {
        alert(`No substores found for hub: ${hub}`);
        setLoadingHub(null);
        return;
      }

      // Fetch top SKUs for the collected substores
      const allTopSkus: UniqueSku[] = [];
      
      // Use substores array for query
      const substoresParam = substoresToUse.join(',');
      try {
        const response = await fetch(`/api/frequently-bought/top-skus?substores=${encodeURIComponent(substoresParam)}&page=1&pageSize=100`);
        const data = await response.json();
        
        if (data.success && data.data) {
          allTopSkus.push(...data.data);
        }
      } catch (error) {
        console.error(`Error fetching top SKUs for substores ${substoresParam}:`, error);
      }

      // Remove duplicates and filter for available products only (publish == "1" and inventory > 0)
      const uniqueSkus = new Map<string, UniqueSku>();
      for (const sku of allTopSkus) {
        // Check if SKU is available (publish == "1" and inventory > 0)
        const isAvailable = String(sku.publish || '0').trim() === '1' && (sku.inventory || 0) > 0;
        
        // Only include available products
        if (isAvailable) {
          if (!uniqueSkus.has(sku.sku) || (uniqueSkus.get(sku.sku)?.orderCount || 0) < (sku.orderCount || 0)) {
            uniqueSkus.set(sku.sku, sku);
          }
        }
      }

      const top6Skus = Array.from(uniqueSkus.values())
        .sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0))
        .slice(0, 6)
        .map(sku => sku.sku);

      // Populate the hub's SKU fields
      if (top6Skus.length > 0) {
        // Fill up to 6 fields with top SKUs
        const newSkus: string[] = [];
        for (let i = 0; i < 6; i++) {
          newSkus.push(top6Skus[i] || '');
        }
        setHubSkus({
          ...hubSkus,
          [hub]: newSkus
        });
      } else {
        alert(`No top SKUs found for ${hub} hub substores`);
      }
    } catch (error) {
      console.error(`Error auto-populating for hub ${hub}:`, error);
      alert(`Failed to auto-populate SKUs for ${hub}`);
    } finally {
      setLoadingHub(null);
    }
  };

  const handleAutoPopulateAll = async () => {
    setLoadingAll(true);
    try {
      // Populate all hubs in parallel
      const populatePromises = HUB_MAPPINGS.map(async (hubMapping) => {
        const hub = hubMapping.hub;
        try {
          // NEW LOGIC: Get substore arrays from topSkus that belong to this hub
          const hubSubstores = getSubstoresByHub(hub);
          const allSubstores = new Set<string>();
          
          // Collect all substores from topSkus that match this hub's substores
          for (const sku of topSkus) {
            const skuSubstores = Array.isArray(sku.substore) ? sku.substore : (sku.substore ? [sku.substore] : []);
            for (const substore of skuSubstores) {
              if (hubSubstores.includes(substore.toLowerCase())) {
                allSubstores.add(substore.toLowerCase());
              }
            }
          }
          
          // If no substores found from topSkus, fallback to hub's substores
          const substoresToUse = allSubstores.size > 0 ? Array.from(allSubstores) : hubSubstores;
          
          if (substoresToUse.length === 0) {
            return;
          }

          // Fetch top SKUs for the collected substores
          const allTopSkus: UniqueSku[] = [];
          
          // Use substores array for query
          const substoresParam = substoresToUse.join(',');
          try {
            const response = await fetch(`/api/frequently-bought/top-skus?substores=${encodeURIComponent(substoresParam)}&page=1&pageSize=100`);
            const data = await response.json();
            
            if (data.success && data.data) {
              allTopSkus.push(...data.data);
            }
          } catch (error) {
            console.error(`Error fetching top SKUs for substores ${substoresParam}:`, error);
          }

          // Remove duplicates and filter for available products only
          const uniqueSkus = new Map<string, UniqueSku>();
          for (const sku of allTopSkus) {
            const isAvailable = String(sku.publish || '0').trim() === '1' && (sku.inventory || 0) > 0;
            
            if (isAvailable) {
              if (!uniqueSkus.has(sku.sku) || (uniqueSkus.get(sku.sku)?.orderCount || 0) < (sku.orderCount || 0)) {
                uniqueSkus.set(sku.sku, sku);
              }
            }
          }

          const top6Skus = Array.from(uniqueSkus.values())
            .sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0))
            .slice(0, 6)
            .map(sku => sku.sku);

          // Populate the hub's SKU fields
          if (top6Skus.length > 0) {
            const newSkus: string[] = [];
            for (let i = 0; i < 6; i++) {
              newSkus.push(top6Skus[i] || '');
            }
            
            setHubSkus(prev => ({
              ...prev,
              [hub]: newSkus
            }));
          }
        } catch (error) {
          console.error(`Error auto-populating for hub ${hub}:`, error);
        }
      });
      
      await Promise.all(populatePromises);
    } catch (error) {
      console.error('Error auto-populating all hubs:', error);
      alert('Failed to auto-populate some hubs');
    } finally {
      setLoadingAll(false);
    }
  };

  const handleConfirm = () => {
    // Filter out empty SKUs for each hub
    const validHubSkus: Record<string, string[]> = {};
    Object.keys(hubSkus).forEach(hub => {
      const validSkus = hubSkus[hub].filter(sku => sku.trim() !== '');
      if (validSkus.length > 0) {
        validHubSkus[hub] = validSkus;
      }
    });
    
    // Validate: each hub with SKUs must have at least 1 and at most 6
    const invalidHubs = Object.entries(validHubSkus).filter(([_, skus]) => skus.length < 1 || skus.length > 6);
    if (invalidHubs.length > 0) {
      alert(`Each hub must have 1-6 SKUs. Please check: ${invalidHubs.map(([hub]) => hub).join(', ')}`);
      return;
    }
    
    onConfirm(validHubSkus);
    // Reset for next time
    const resetHubSkus: Record<string, string[]> = {};
    HUB_MAPPINGS.forEach(hub => {
      resetHubSkus[hub.hub] = [''];
    });
    setHubSkus(resetHubSkus);
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset for next time
    const resetHubSkus: Record<string, string[]> = {};
    HUB_MAPPINGS.forEach(hub => {
      resetHubSkus[hub.hub] = [''];
    });
    setHubSkus(resetHubSkus);
  };

  // Calculate total valid SKUs across all hubs
  const totalValidSkus = Object.values(hubSkus).reduce((sum, skus) => {
    return sum + skus.filter(sku => sku.trim() !== '').length;
  }, 0);
  
  // Get hubs that have at least one valid SKU
  const hubsWithSkus = Object.entries(hubSkus).filter(([_, skus]) => 
    skus.some(sku => sku.trim() !== '')
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-lg z-50 animate-in fade-in zoom-in-95 duration-200">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-t-2xl px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Package className="text-white" size={24} />
                </div>
                <div>
                  <Dialog.Title className="text-xl font-bold text-white">
                    Add Manual SKUs by Hub
                  </Dialog.Title>
                </div>
              </div>
              <Dialog.Close asChild>
                <button
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
                  onClick={handleCancel}
                >
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Overall Auto-Populate Button */}
            <div className="mb-6">
              <button
                onClick={handleAutoPopulateAll}
                disabled={loadingAll}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingAll ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Populating all hubs...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Auto-Populate All Hubs</span>
                  </>
                )}
              </button>
            </div>

            {/* Hub-wise SKU Inputs - Space Optimized */}
            <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
              {HUB_MAPPINGS.map((hubMapping) => {
                const hub = hubMapping.hub;
                const skus = hubSkus[hub] || [''];
                const validSkus = skus.filter(sku => sku.trim() !== '');
                const canAddMore = skus.length < 6;
                
                return (
                  <div key={hub} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    {/* Hub Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        <h3 className="font-semibold text-slate-800 text-sm">{hub}</h3>
                        {validSkus.length > 0 && (
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                            {validSkus.length}/6
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Auto-Populate Button */}
                        <button
                          onClick={() => handleAutoPopulateHub(hub)}
                          disabled={loadingHub === hub}
                          className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Auto-fill with top 6 SKUs from this hub"
                        >
                          {loadingHub === hub ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Sparkles size={16} />
                          )}
                        </button>
                        {canAddMore && (
                          <button
                            onClick={() => handleAddSku(hub)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Add SKU"
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* SKU Inputs for this Hub */}
                    <div className="space-y-2">
                      {skus.map((sku, index) => {
                        const isValid = sku.trim() !== '';
                        return (
                          <div 
                            key={index} 
                            className="group flex items-center gap-2"
                          >
                            <div className="flex-shrink-0 w-6 h-6 rounded bg-gradient-to-br from-indigo-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-xs">
                              {index + 1}
                            </div>
                            <div className="flex-1 relative">
                              <input
                                type="text"
                                value={sku}
                                onChange={(e) => handleSkuChange(hub, index, e.target.value)}
                                placeholder="SKU code"
                                className={`w-full px-3 py-2 bg-white border rounded-lg text-sm font-medium transition-all ${
                                  isValid 
                                    ? 'border-green-300 focus:border-green-500 focus:ring-1 focus:ring-green-500/20' 
                                    : 'border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20'
                                } focus:outline-none placeholder:text-slate-400`}
                              />
                              {isValid && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                  <CheckCircle2 className="text-green-500" size={14} />
                                </div>
                              )}
                            </div>
                            {skus.length > 1 && (
                              <button
                                onClick={() => handleRemoveSku(hub, index)}
                                className="flex-shrink-0 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                title="Remove"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Success Banner */}
            {totalValidSkus > 0 && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 className="text-green-600 flex-shrink-0" size={20} />
                  <p className="text-sm text-green-800 font-semibold">
                    {totalValidSkus} SKU{totalValidSkus > 1 ? 's' : ''} across {hubsWithSkus.length} hub{hubsWithSkus.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-xs text-green-700 ml-8">
                  {hubsWithSkus.map(([hub, skus]) => (
                    <span key={hub} className="inline-block mr-3">
                      {hub}: {skus.length} SKU{skus.length > 1 ? 's' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleCancel}
                className="flex-1 px-5 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={totalValidSkus === 0}
                className={`flex-1 px-5 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  totalValidSkus > 0
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {totalValidSkus > 0 && <CheckCircle2 size={18} />}
                <span>Confirm</span>
                {totalValidSkus > 0 && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                    {totalValidSkus}
                  </span>
                )}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

