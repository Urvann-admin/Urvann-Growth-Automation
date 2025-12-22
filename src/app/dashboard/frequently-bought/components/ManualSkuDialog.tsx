'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Plus, Trash2, Package, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { UniqueSku } from '@/types/frequentlyBought';

interface ManualSkuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (skus: string[]) => void;
  topSkus?: UniqueSku[]; // Top SKUs for auto-population
}

export default function ManualSkuDialog({ open, onOpenChange, onConfirm, topSkus = [] }: ManualSkuDialogProps) {
  const [manualSkus, setManualSkus] = useState<string[]>(['']);

  // Reset to single empty field when dialog opens
  useEffect(() => {
    if (open) {
      setManualSkus(['']);
    }
  }, [open]);

  const handleAddSku = () => {
    if (manualSkus.length < 6) {
      setManualSkus([...manualSkus, '']);
    }
  };

  const handleAutoPopulate = () => {
    // Get top 6 SKUs from topSkus
    const top6Skus = topSkus.slice(0, 6).map(sku => sku.sku);
    
    // Fill up to 6 fields with top SKUs
    const newSkus: string[] = [];
    for (let i = 0; i < 6; i++) {
      newSkus.push(top6Skus[i] || '');
    }
    
    setManualSkus(newSkus);
  };

  const handleRemoveSku = (index: number) => {
    if (manualSkus.length > 1) {
      setManualSkus(manualSkus.filter((_, i) => i !== index));
    } else {
      // If only one input, just clear it
      setManualSkus(['']);
    }
  };

  const handleSkuChange = (index: number, value: string) => {
    const newSkus = [...manualSkus];
    newSkus[index] = value.trim().toUpperCase();
    setManualSkus(newSkus);
  };

  const handleConfirm = () => {
    const validSkus = manualSkus.filter(sku => sku.trim() !== '');
    onConfirm(validSkus);
    // Reset for next time
    setManualSkus(['']);
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset for next time
    setManualSkus(['']);
  };

  const validSkuCount = manualSkus.filter(sku => sku.trim() !== '').length;
  const canAddMore = manualSkus.length < 6;

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
                    Add Manual SKUs
                  </Dialog.Title>
                  <p className="text-green-50 text-sm mt-0.5">
                    Up to 6 SKUs can be added
                  </p>
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
            <Dialog.Description className="text-sm text-gray-600 mb-6 leading-relaxed">
              Add SKUs that will be pushed along with automatically found frequently bought together products. 
              These will be merged intelligently based on availability.
            </Dialog.Description>

            {/* SKU Inputs */}
            <div className="space-y-3 mb-6 max-h-[320px] overflow-y-auto pr-2">
              {manualSkus.map((sku, index) => {
                const isValid = sku.trim() !== '';
                return (
                  <div 
                    key={index} 
                    className="group flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200 border border-transparent hover:border-gray-200"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={sku}
                        onChange={(e) => handleSkuChange(index, e.target.value)}
                        placeholder="Enter SKU code"
                        className={`w-full px-4 py-2.5 bg-white border-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isValid 
                            ? 'border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20' 
                            : 'border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-500/20'
                        } focus:outline-none placeholder:text-gray-400`}
                      />
                      {isValid && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <CheckCircle2 className="text-green-500" size={18} />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveSku(index)}
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 group-hover:bg-red-50"
                      title="Remove SKU"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Auto-Populate Button */}
            {topSkus.length > 0 && (
              <button
                onClick={handleAutoPopulate}
                className="w-full mb-3 py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 font-semibold group"
              >
                <Sparkles size={18} className="group-hover:scale-110 transition-transform duration-200" />
                <span>Auto-Fill with Top {Math.min(topSkus.length, 6)} SKUs</span>
              </button>
            )}

            {/* Add More Button */}
            {canAddMore && (
              <button
                onClick={handleAddSku}
                className="w-full mb-6 py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-green-400 hover:text-green-600 hover:bg-green-50/50 transition-all duration-200 flex items-center justify-center gap-2 font-medium group"
              >
                <Plus size={18} className="group-hover:scale-110 transition-transform duration-200" />
                <span>Add More SKU</span>
                <span className="text-xs bg-gray-200 group-hover:bg-green-200 px-2 py-0.5 rounded-full font-semibold">
                  {manualSkus.length}/6
                </span>
              </button>
            )}

            {/* Info Banner */}
            {validSkuCount === 0 && manualSkus.some(s => s.trim() !== '') === false && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">No SKUs entered.</span> Please add at least one SKU to proceed.
                </p>
              </div>
            )}

            {/* Success Banner */}
            {validSkuCount > 0 && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="text-green-600 flex-shrink-0" size={20} />
                <p className="text-sm text-green-800">
                  <span className="font-semibold">{validSkuCount} SKU{validSkuCount > 1 ? 's' : ''}</span> ready to be added
                </p>
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
                disabled={validSkuCount === 0}
                className={`flex-1 px-5 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  validSkuCount > 0
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {validSkuCount > 0 && <CheckCircle2 size={18} />}
                <span>Confirm</span>
                {validSkuCount > 0 && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                    {validSkuCount}
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

