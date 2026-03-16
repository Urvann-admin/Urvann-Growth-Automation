'use client';

import { Pencil } from 'lucide-react';

export interface CollectionRow {
  _id: string;
  name?: string;
  alias?: string;
  publish?: number;
  description?: string;
  type?: string;
  storeHippoId?: string;
}

interface CollectionTableProps {
  collections: CollectionRow[];
  onEdit: (row: CollectionRow) => void;
}

export function CollectionTable({
  collections,
  onEdit,
}: CollectionTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50/80">
          <tr className="border-b border-slate-200">
            <th className="text-left py-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">
              Name
            </th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">
              Alias
            </th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">
              Publish
            </th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">
              Description
            </th>
            <th className="text-right py-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {collections.map((row) => (
            <tr
              key={String(row._id)}
              className="hover:bg-pink-50/30 transition-colors"
            >
              <td className="py-3.5 px-4 font-medium text-slate-900">
                {row.name ?? '—'}
              </td>
              <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                {row.alias ?? '—'}
              </td>
              <td className="py-3.5 px-4 text-slate-600">
                {row.publish === 1 ? 'Published' : 'Draft'}
              </td>
              <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate">
                {row.description ?? '—'}
              </td>
              <td className="py-3.5 px-4 text-right">
                <button
                  type="button"
                  onClick={() => onEdit(row)}
                  className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-pink-50 hover:text-[#E6007A] transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                  aria-label="Edit collection"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
