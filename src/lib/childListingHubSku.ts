import { HUB_MAPPINGS } from '@/shared/constants/hubs';

class HubSkuError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HubSkuError';
  }
}

function getHubCode(hub: string): string {
  const normalized = hub.trim();
  const hubMapping = HUB_MAPPINGS.find((m) => m.hub.toLowerCase() === normalized.toLowerCase());
  if (!hubMapping) {
    throw new HubSkuError(`Invalid hub: "${hub}"`);
  }
  const firstWord = hubMapping.hub.split(/\s+/)[0];
  return firstWord.charAt(0).toUpperCase();
}

/** Hub letter + base parent SKU (client-safe; mirrors skuGenerator.appendHubLetterToParentSku). */
function appendHubLetterToParentSkuLocal(hub: string, canonicalParentSku: string): string {
  const base = String(canonicalParentSku ?? '').trim();
  if (!base) return base;
  const code = getHubCode(hub);
  return `${code}${base}`;
}

/** Strip a single known hub letter prefix if present. */
function stripKnownHubPrefix(storedSku: string): string {
  const r = String(storedSku ?? '').trim();
  if (!r) return '';
  for (const mapping of HUB_MAPPINGS) {
    try {
      const code = getHubCode(mapping.hub);
      if (r.startsWith(code) && r.length > code.length) {
        return r.slice(code.length);
      }
    } catch {
      /* skip */
    }
  }
  return r;
}

export type HubParentCheckResult = {
  hub: string;
  canonicalParentSku: string;
  expectedSku: string;
  ok: boolean;
};

/** Minimal parent line shape (client row / API payload). */
export type ParentItemLike = {
  parentSku: string;
  parent?: { sku?: string };
};

/**
 * Hub letter + base parent SKU as stored on parent-type listing docs / lines
 * (e.g. Noida + TES000401 → NTES000401).
 * If `canonicalBaseSku` already starts with this hub’s letter (hub-scoped parent row), returns it unchanged — no double prefix.
 */
export function expectedParentSkuForHub(hub: string, canonicalBaseSku: string): string {
  const h = String(hub ?? '').trim();
  const b = String(canonicalBaseSku ?? '').trim();
  if (!h || !b) return '';
  try {
    const code = getHubCode(h);
    if (b.startsWith(code) && b.length > code.length) {
      return b;
    }
    return appendHubLetterToParentSkuLocal(h, b);
  } catch (e) {
    if (e instanceof HubSkuError) return '';
    throw e;
  }
}

/**
 * Canonical Parent Master SKU for a row line: prefer embedded parent, else strip a known hub prefix.
 */
export function canonicalBaseSkuForParentItem(item: ParentItemLike): string {
  const fromMaster = String(item.parent?.sku ?? '').trim();
  if (fromMaster) return fromMaster;
  const raw = String(item.parentSku ?? '').trim();
  if (!raw) return '';
  const stripped = stripKnownHubPrefix(raw);
  return stripped || raw;
}

/** Build unique (hub × parent line) checks for the verify API. */
export function buildChildHubParentChecksPayload(
  section: string,
  hubs: string[],
  parentItems: ParentItemLike[]
): { section: string; checks: { hub: string; canonicalParentSku: string }[] } {
  const hubList = [...new Set(hubs.map((h) => String(h).trim()).filter(Boolean))];
  const checks: { hub: string; canonicalParentSku: string }[] = [];
  const seen = new Set<string>();
  for (const hub of hubList) {
    for (const item of parentItems) {
      const canonical = canonicalBaseSkuForParentItem(item);
      if (!canonical) continue;
      const key = `${hub}\0${canonical}`;
      if (seen.has(key)) continue;
      seen.add(key);
      checks.push({ hub, canonicalParentSku: canonical });
    }
  }
  return { section, checks };
}

export function mergeVerifyResults(
  apiResults: { hub: string; canonicalParentSku: string; expectedSku: string; exists: boolean }[]
): HubParentCheckResult[] {
  return apiResults.map((r) => ({
    hub: r.hub,
    canonicalParentSku: r.canonicalParentSku,
    expectedSku: r.expectedSku,
    ok: r.exists,
  }));
}

/** Hubs where every parent line has ok === true for that hub. */
export function passedHubsFromChecks(
  hubs: string[],
  parentItems: ParentItemLike[],
  checks: HubParentCheckResult[]
): string[] {
  const hubList = [...new Set(hubs.map((h) => String(h).trim()).filter(Boolean))];
  const canonicals = parentItems
    .map((item) => canonicalBaseSkuForParentItem(item))
    .filter(Boolean);
  if (canonicals.length === 0 || hubList.length === 0) return [];

  return hubList.filter((hub) =>
    canonicals.every((canonical) => {
      const row = checks.find((c) => c.hub === hub && c.canonicalParentSku === canonical);
      return row?.ok === true;
    })
  );
}

/**
 * Child listing: parents come from the hub-scoped listing picker only, so every selected hub is valid
 * once each line has an embedded parent from that flow (no second DB verify).
 */
export function passedHubsForChildListingFromPicker(
  hubs: string[],
  parentItems: ParentItemLike[]
): string[] {
  const hubList = [...new Set(hubs.map((h) => String(h).trim()).filter(Boolean))];
  if (hubList.length === 0 || parentItems.length === 0) return [];
  const everyLineFromPicker = parentItems.every(
    (item) =>
      item.parent &&
      String((item.parent as { sku?: string }).sku ?? '').trim() &&
      Boolean(canonicalBaseSkuForParentItem(item))
  );
  if (!everyLineFromPicker) return [];
  return hubList;
}
