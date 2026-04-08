import type { PurchaseTypeBreakdown } from '@/models/purchaseMaster';
import type { OverheadAllocationMethod } from '@/models/purchaseMaster';

export interface DraftPurchaseRow {
  billNumber: string;
  productCode: string;
  productName: string;
  quantity: number;
  productPrice: number;
  amount: number;
  parentSku: string;
  /** Set after server resolve from product code + hub */
  resolveError?: string;
  seller?: string;
  type: PurchaseTypeBreakdown;
  overhead?: {
    overheadAmount: number;
    overheadNature?: string;
    bill?: string;
    allocationMethod: OverheadAllocationMethod;
    allocatedAmount: number;
  };
}

export interface ParentOption {
  _id: string;
  sku?: string;
  plant: string;
}
