'use client';

import { Check, X, Pencil, Trash2 } from 'lucide-react';
import type { Category } from '@/models/category';

interface CategoryTableProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export function CategoryTable({ categories, onEdit, onDelete }: CategoryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Name</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Alias</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Type</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Published</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Priority</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Substores</th>
            <th className="text-right py-3 px-3 font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={String(cat._id)} className="border-b border-slate-100 hover:bg-slate-50/50">
              <td className="py-3 px-3 text-slate-900">{cat.category ?? '—'}</td>
              <td className="py-3 px-3 text-slate-600 font-mono text-xs">{cat.alias ?? '—'}</td>
              <td className="py-3 px-3 text-slate-600">{cat.typeOfCategory ?? '—'}</td>
              <td className="py-3 px-3">
                {cat.publish ? (
                  <Check className="w-5 h-5 text-emerald-600" strokeWidth={2.5} aria-label="Published" />
                ) : (
                  <X className="w-5 h-5 text-slate-400" strokeWidth={2.5} aria-label="Unpublished" />
                )}
              </td>
              <td className="py-3 px-3 text-slate-600">{cat.priorityOrder ?? 0}</td>
              <td className="py-3 px-3 text-slate-600">
                {Array.isArray(cat.substores) ? cat.substores.length : 0}
              </td>
              <td className="py-3 px-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(cat)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition-colors"
                    aria-label="Edit category"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(cat)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                    aria-label="Delete category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
