'use client';

import type { ProductFlowType } from '../types';

export interface StepSelectProductTypeProps {
  value: ProductFlowType | null;
  onSelect: (t: ProductFlowType) => void;
}

const cards: { type: ProductFlowType; title: string; description: string }[] = [
  {
    type: 'parent',
    title: 'Parent',
    description: 'Base plant product with full attributes, auto SKU, categories, and pricing wizard.',
  },
  {
    type: 'growing_product',
    title: 'Growing product',
    description: 'Linked to a parent SKU with vendor master, manual code, and optional photo.',
  },
  {
    type: 'consumable',
    title: 'Consumable',
    description: 'Name and code required; vendor and parent link optional; optional photo.',
  },
];

export function StepSelectProductType({ value, onSelect }: StepSelectProductTypeProps) {
  return (
    <div className="mt-8 pt-2 space-y-4">
      <p className="text-sm text-slate-600">
        Choose what kind of product you are creating. You can change this later only by starting over.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c) => {
          const selected = value === c.type;
          return (
            <button
              key={c.type}
              type="button"
              onClick={() => onSelect(c.type)}
              className={`text-left rounded-xl border-2 p-4 transition-all hover:border-emerald-300 hover:bg-emerald-50/50 ${
                selected ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200' : 'border-slate-200 bg-white'
              }`}
            >
              <h3 className="font-semibold text-slate-900">{c.title}</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{c.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
