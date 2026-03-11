'use client';

import type { ProductFormData } from '../types';
import type { Category } from '@/models/category';
import type { CollectionMaster } from '@/models/collectionMaster';
import type { ProcurementSellerMaster } from '@/models/procurementSellerMaster';

export interface StepReviewProps {
  data: ProductFormData;
  finalName: string;
  categories: Category[];
  /** Count of images selected in step 4 (not yet uploaded; uploaded on submit) */
  selectedImageCount?: number;
  collections: CollectionMaster[];
  /** Procurement sellers (for listing price = sellingPrice × seller.multiplicationFactor) */
  procurementSellers?: ProcurementSellerMaster[];
}

function getCategoryName(categories: Category[], categoryAlias: string): string {
  const cat = categories.find((c) => c.alias === categoryAlias);
  return cat?.category || categoryAlias;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 py-2 border-b border-slate-100 last:border-0">
      <dt className="text-sm font-medium text-slate-500 min-w-[10rem] shrink-0">{label}</dt>
      <dd className="text-sm text-slate-900">{value ?? '—'}</dd>
    </div>
  );
}

export function StepReview({ data, finalName, categories, selectedImageCount = 0, collections, procurementSellers = [] }: StepReviewProps) {
  const categoryNames = data.categories.map((id) => getCategoryName(categories, id));
  const totalImageCount = data.images.length + selectedImageCount;
  const collectionNames = (data.collectionIds ?? []).map((id) =>
    collections.find((c) => String(c._id) === id)?.name ?? id
  );
  const selectedSeller = data.seller ? procurementSellers.find((s) => String(s._id) === data.seller) : null;
  const listingPrice =
    selectedSeller && typeof data.sellingPrice === 'number'
      ? data.sellingPrice * (selectedSeller.multiplicationFactor ?? 1)
      : null;

  return (
    <div>
      <p className="text-sm text-slate-600 mb-6">
        Please review your product details below. Click &quot;Create product&quot; to submit.
      </p>
      <dl className="space-y-0">
        <Row label="Plant name" value={data.plant || '—'} />
        <Row label="Other names" value={data.otherNames || '—'} />
        <Row label="Variety" value={data.variety || '—'} />
        <Row label="Colour" value={data.colour || '—'} />
        <Row label="Height (feet)" value={data.height !== '' ? data.height : '—'} />
        <Row label="Moss stick" value={data.mossStick || '—'} />
        <Row label="Size (inches)" value={data.size !== '' ? data.size : '—'} />
        <Row label="Pot Type" value={data.potType || '—'} />
        <Row label="Procurement seller" value={selectedSeller?.seller_name ?? '—'} />
        <Row label="Features" value={data.features || '—'} />
        <Row label="Redirects" value={data.redirects || '—'} />
        <Row label="Final name" value={finalName || '—'} />
        <Row label="Selling Price" value={data.sellingPrice !== '' ? data.sellingPrice : '—'} />
        <Row label="Listing price" value={listingPrice != null ? listingPrice : '—'} />
        <Row
          label="Categories"
          value={
            categoryNames.length > 0 ? (
              <span className="flex flex-wrap gap-1.5">
                {categoryNames.map((name) => (
                  <span
                    key={name}
                    className="inline-flex rounded-lg border border-slate-200 bg-[#F4F6F8] px-2 py-0.5 text-xs text-slate-800"
                  >
                    {name}
                  </span>
                ))}
              </span>
            ) : (
              '—'
            )
          }
        />
        <Row
          label="Collections"
          value={
            collectionNames.length > 0 ? (
              <span className="flex flex-wrap gap-1.5">
                {collectionNames.map((name) => (
                  <span
                    key={name}
                    className="inline-flex rounded-lg border border-slate-200 bg-[#F4F6F8] px-2 py-0.5 text-xs text-slate-800"
                  >
                    {name}
                  </span>
                ))}
              </span>
            ) : (
              '—'
            )
          }
        />
        <Row
          label="Images"
          value={
            totalImageCount > 0 ? (
              <span className="text-slate-600">{totalImageCount} image(s)</span>
            ) : (
              '—'
            )
          }
        />
      </dl>
    </div>
  );
}
