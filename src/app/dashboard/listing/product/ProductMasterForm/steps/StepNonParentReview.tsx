'use client';

import type { ParentMaster } from '@/models/parentMaster';
import type { ProcurementSellerMaster } from '@/models/procurementSellerMaster';
import type { NonParentFormData, ProductFlowType } from '../types';
import { effectiveBaseSkuForParentRow } from '@/lib/parentMasterBaseSku';

export interface StepNonParentReviewProps {
  productFlowType: Exclude<ProductFlowType, 'parent'>;
  data: NonParentFormData;
  vendors: ProcurementSellerMaster[];
  baseParents: ParentMaster[];
  selectedFileCount: number;
  growingProductCodePreview?: string;
  growingProductCodeLoading?: boolean;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 py-2 border-b border-slate-100 last:border-0">
      <dt className="text-sm font-medium text-slate-500 min-w-[10rem] shrink-0">{label}</dt>
      <dd className="text-sm text-slate-900">{value ?? '—'}</dd>
    </div>
  );
}

const typeLabel: Record<Exclude<ProductFlowType, 'parent'>, string> = {
  growing_product: 'Growing product',
  consumable: 'Consumable',
};

export function StepNonParentReview({
  productFlowType,
  data,
  vendors,
  baseParents,
  selectedFileCount,
  growingProductCodePreview = '',
  growingProductCodeLoading = false,
}: StepNonParentReviewProps) {
  const vendor = data.vendorMasterId
    ? vendors.find((v) => String(v._id) === data.vendorMasterId)
    : null;
  const parent = data.parentSku
    ? baseParents.find((p) =>
        productFlowType === 'growing_product'
          ? effectiveBaseSkuForParentRow(p) === data.parentSku.trim()
          : (p.sku ?? '').trim() === data.parentSku.trim()
      )
    : null;

  return (
    <div>
      <p className="text-sm text-slate-600 mb-6">
        Please review your product details below. Click &quot;Create product&quot; to submit.
      </p>
      <dl className="space-y-0">
        <Row label="Product type" value={typeLabel[productFlowType]} />
        <Row label="Name" value={data.plant || '—'} />
        <Row
          label="Primary vendor"
          value={
            vendor
              ? vendor.vendorCode
                ? `${vendor.seller_name} (${vendor.vendorCode})`
                : vendor.seller_name
              : '—'
          }
        />
        <Row
          label="Product code"
          value={
            productFlowType === 'growing_product' ? (
              growingProductCodeLoading ? (
                <span className="text-slate-500">Loading preview…</span>
              ) : growingProductCodePreview ? (
                <span className="font-mono">{growingProductCodePreview}</span>
              ) : (
                <span className="text-slate-600">Assigned when you create (preview unavailable)</span>
              )
            ) : (
              data.productCode || '—'
            )
          }
        />
        <Row
          label={productFlowType === 'growing_product' ? 'Base parent SKU' : 'Parent SKU'}
          value={
            data.parentSku
              ? `${data.parentSku}${parent ? ` — ${parent.finalName || parent.plant || ''}` : ''}`
              : '—'
          }
        />
        <Row
          label="Images"
          value={
            (data.images.length > 0 || selectedFileCount > 0) ? (
              <span className="text-slate-600">
                {data.images.length} uploaded, {selectedFileCount} pending upload
              </span>
            ) : (
              '—'
            )
          }
        />
      </dl>
    </div>
  );
}
