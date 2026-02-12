'use client';

import type { ProductFormData } from '../types';
import type { Category } from '@/models/category';

export interface StepReviewProps {
  data: ProductFormData;
  finalName: string;
  categories: Category[];
}

function getCategoryName(categories: Category[], categoryId: string): string {
  const cat = categories.find((c) => c._id === categoryId || c.categoryId === categoryId);
  return cat?.category || categoryId;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 py-2 border-b border-slate-100 last:border-0">
      <dt className="text-sm font-medium text-slate-500 min-w-[10rem] shrink-0">{label}</dt>
      <dd className="text-sm text-slate-900">{value ?? '—'}</dd>
    </div>
  );
}

export function StepReview({ data, finalName, categories }: StepReviewProps) {
  const categoryNames = data.categories.map((id) => getCategoryName(categories, id));

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
        <Row label="Type" value={data.type || '—'} />
        <Row label="Seller" value={data.seller || '—'} />
        <Row label="Final name" value={finalName || '—'} />
        <Row label="Price" value={data.price !== '' ? data.price : '—'} />
        <Row label="Inventory quantity" value={data.inventoryQuantity !== '' ? data.inventoryQuantity : '—'} />
        <Row label="Hub" value={data.hub || '—'} />
        <Row label="Publish" value={data.publish === 'published' ? 'Yes' : 'Draft'} />
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
          label="Images"
          value={
            data.images.length > 0 ? (
              <span className="text-slate-600">{data.images.length} image(s)</span>
            ) : (
              '—'
            )
          }
        />
      </dl>
    </div>
  );
}
