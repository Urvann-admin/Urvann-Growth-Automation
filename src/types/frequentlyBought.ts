// Types for Frequently Bought Together feature

export interface PairedProduct {
  sku: string;
  name: string;
  count: number;
}

export interface FrequentlyBoughtItem {
  sku: string;
  name: string;
  totalPairings: number;
  topPaired: PairedProduct[];
}

export interface UniqueSku {
  sku: string;
  name?: string;
  orderCount?: number;
}

export interface FrequentlyBoughtPagination {
  page: number;
  pageSize: number;
  totalSkus: number;
  totalPages: number;
  hasMore: boolean;
}

export interface SubstoreOption {
  value: string;
  label: string;
}

export interface AnalysisApiResponse {
  success: boolean;
  data?: FrequentlyBoughtItem[];
  pagination?: FrequentlyBoughtPagination;
  message?: string;
}

export interface SkusApiResponse {
  success: boolean;
  data?: UniqueSku[];
  total?: number;
  message?: string;
}

export interface SubstoresApiResponse {
  success: boolean;
  data?: string[];
  total?: number;
  message?: string;
}

