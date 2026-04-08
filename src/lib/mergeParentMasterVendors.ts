import type { ParentMaster } from '@/models/parentMaster';

/**
 * Builds unique vendor id list and optional new primary when none was set.
 * Does not remove or replace an existing primary `vendorMasterId`.
 */
export function mergeParentMasterVendorFields(
  parent: ParentMaster,
  newProcurementVendorId: string
): { vendorIds: string[]; vendorMasterId?: string } {
  const vid = String(newProcurementVendorId ?? '').trim();
  if (!vid) {
    const existing = collectExistingVendorIds(parent);
    return { vendorIds: existing };
  }

  const primary =
    String(parent.vendorMasterId ?? '').trim() || String(parent.vendor_id ?? '').trim();
  const fromArray = (parent.vendorIds ?? []).map((x) => String(x).trim()).filter(Boolean);
  const set = new Set<string>();
  if (primary) set.add(primary);
  for (const x of fromArray) set.add(x);
  set.add(vid);
  const vendorIds = [...set];

  if (!primary) {
    return { vendorIds, vendorMasterId: vid };
  }
  return { vendorIds };
}

function collectExistingVendorIds(parent: ParentMaster): string[] {
  const primary =
    String(parent.vendorMasterId ?? '').trim() || String(parent.vendor_id ?? '').trim();
  const fromArray = (parent.vendorIds ?? []).map((x) => String(x).trim()).filter(Boolean);
  const set = new Set<string>();
  if (primary) set.add(primary);
  for (const x of fromArray) set.add(x);
  return [...set];
}
