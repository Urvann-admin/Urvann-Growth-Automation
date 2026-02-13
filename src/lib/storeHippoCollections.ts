// StoreHippo Collections API – fetch manual collections

const BASE_URL = process.env.STOREHIPPO_BASE_URL || 'https://uaturvann.storehippo.com';
const ACCESS_KEY = process.env.URVANN_API_ACCESS_KEY || '';

const FILTER_MANUAL = encodeURIComponent(
  JSON.stringify([{ field: 'type', operator: 'eq', value: 'manual' }])
);
const PAGE_SIZE = 50;

export interface StoreHippoCollectionItem {
  _id: string;
  name?: string;
  type?: string;
  alias?: string;
  filters?: unknown[];
  images?: unknown[];
  SEO?: Record<string, unknown>;
  publish?: number;
  metafields?: Record<string, unknown>;
  _size?: number;
  sort_order?: number;
  created_on?: string;
  _created_by?: string;
  entity_type?: string;
  description?: string;
  default_sort_order?: string;
  facet_group?: string;
  substore?: unknown[];
  updated_on?: string;
  _updated_by?: string;
  [key: string]: unknown;
}

export interface StoreHippoCollectionsResponse {
  messages?: { name?: string; level?: string }[];
  fileBaseUrl?: string;
  data: StoreHippoCollectionItem[];
  paging?: {
    limit: number;
    start: number;
    count: number;
    total: number;
  };
}

/**
 * Fetch one page of manual collections from StoreHippo.
 */
async function fetchPage(start: number): Promise<StoreHippoCollectionsResponse> {
  const url = `${BASE_URL}/api/1.1/entity/ms.collections/?filters=${FILTER_MANUAL}&limit=${PAGE_SIZE}&start=${start}`;
  const response = await fetch(url, {
    headers: { 'access-key': ACCESS_KEY },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`StoreHippo collections API error (${response.status}): ${text}`);
  }

  const json = (await response.json()) as StoreHippoCollectionsResponse;
  if (!json.data || !Array.isArray(json.data)) {
    throw new Error('StoreHippo collections API returned invalid data');
  }
  return json;
}

/**
 * Fetch all manual collections from StoreHippo (handles pagination).
 */
export async function fetchAllManualCollections(): Promise<StoreHippoCollectionItem[]> {
  const all: StoreHippoCollectionItem[] = [];
  let start = 0;
  let total = 0;

  do {
    const res = await fetchPage(start);
    all.push(...res.data);
    const paging = res.paging;
    if (paging) {
      total = paging.total;
      start += paging.count;
      if (paging.count < PAGE_SIZE || start >= total) break;
    } else {
      break;
    }
  } while (true);

  return all;
}
