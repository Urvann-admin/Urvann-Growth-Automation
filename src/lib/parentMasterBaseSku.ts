import type { ParentMaster } from '@/models/parentMaster';
import { baseSkuForParentMasterRow } from '@/lib/skuParentCanon';

/** Canonical base SKU for a parent row (`base_sku` when set, else derived from `sku` + `hub`). */
export function effectiveBaseSkuForParentRow(p: ParentMaster): string {
  const stored = String(p.base_sku ?? '').trim();
  if (stored) return stored;
  const sku = String(p.sku ?? '').trim();
  const hub = p.hub != null ? String(p.hub).trim() : undefined;
  return baseSkuForParentMasterRow(sku, hub);
}

/**
 * One representative row per unique base SKU (for growing-product parent picker).
 * Prefers a row whose `sku` equals the canonical base (global parent) when present.
 */
export function dedupeParentsByBaseSku(parents: ParentMaster[]): ParentMaster[] {
  const map = new Map<string, ParentMaster>();
  for (const p of parents) {
    const key = effectiveBaseSkuForParentRow(p);
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, p);
      continue;
    }
    const exSku = String(existing.sku ?? '').trim();
    const pSku = String(p.sku ?? '').trim();
    if (exSku !== key && pSku === key) {
      map.set(key, p);
    }
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, doc]) => doc);
}
