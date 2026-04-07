'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Search, Check, ChevronRight, ChevronDown } from 'lucide-react';
import type { Category } from '@/models/category';
import { buildCategoryTree, filterCategoryTree, type CategoryTreeNode } from '@/lib/categoryTree';
import { ModalContainer, ModalHeader } from '../../../shared';

export interface CategoryHierarchyPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategoryIds: string[];
  onCategoryToggle: (categoryAlias: string) => void;
  onClearError: (key: string) => void;
}

function rowKey(n: CategoryTreeNode): string {
  const a = n.alias?.trim();
  if (a) return a;
  return String(n.category._id ?? n.category.categoryId ?? n.category.category ?? '');
}

function collectKeys(nodes: CategoryTreeNode[]): string[] {
  const out: string[] = [];
  const walk = (list: CategoryTreeNode[]) => {
    for (const n of list) {
      out.push(rowKey(n));
      if (n.children.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

/** Hide trailing " L1" / " L2" / " L3" in picker only (stored names unchanged). */
function displayCategoryName(raw: string): string {
  const s = String(raw ?? '').trim();
  const stripped = s.replace(/\s+L[123]$/i, '').trim();
  return stripped || s;
}

const DEPTH_STYLES = [
  {
    label: 'text-teal-900 font-semibold',
    chevron: 'text-teal-600 hover:bg-teal-100/80 hover:text-teal-800',
    guide: 'border-l-teal-300/90',
    rowSelected: 'bg-teal-50/90 border-teal-200/70',
    rowHover: 'hover:bg-teal-50/40',
  },
  {
    label: 'text-indigo-800 font-medium',
    chevron: 'text-indigo-500 hover:bg-indigo-100/70 hover:text-indigo-800',
    guide: 'border-l-indigo-300/85',
    rowSelected: 'bg-indigo-50 border-indigo-200/80',
    rowHover: 'hover:bg-indigo-50/50',
  },
  {
    label: 'text-violet-800 font-medium',
    chevron: 'text-violet-500 hover:bg-violet-100/70 hover:text-violet-900',
    guide: 'border-l-violet-300/80',
    rowHover: 'hover:bg-violet-50/50',
    rowSelected: 'bg-violet-50 border-violet-200/80',
  },
] as const;

function depthStyle(depth: number) {
  return DEPTH_STYLES[Math.min(depth, DEPTH_STYLES.length - 1)];
}

function TreeRows({
  nodes,
  depth,
  selectedCategoryIds,
  onSelectToggle,
  expanded,
  toggleExpand,
}: {
  nodes: CategoryTreeNode[];
  depth: number;
  selectedCategoryIds: string[];
  onSelectToggle: (alias: string) => void;
  expanded: Set<string>;
  toggleExpand: (key: string) => void;
}) {
  return (
    <>
      {nodes.map((n) => {
        const key = rowKey(n);
        const hasChildren = n.children.length > 0;
        const isExpanded = expanded.has(key);
        const alias = n.alias || '';
        const isSelected = alias ? selectedCategoryIds.includes(alias) : false;
        const indentPx = 6 + depth * 14;
        const ds = depthStyle(depth);

        return (
          <div key={key} className="select-none">
            <div
              className={`group grid grid-cols-[1.625rem_minmax(0,1fr)_1.375rem] gap-x-2 items-center py-0.5 pr-1 rounded-md border border-transparent transition-colors ${
                isSelected ? ds.rowSelected : `${ds.rowHover} border-transparent`
              }`}
              style={{ paddingLeft: indentPx }}
            >
              <div className="flex justify-center">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggleExpand(key)}
                    className={`p-0.5 rounded transition-colors ${ds.chevron}`}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                    )}
                  </button>
                ) : (
                  <span className="w-3.5 h-3.5 block shrink-0" aria-hidden />
                )}
              </div>

              <button
                type="button"
                onClick={() => onSelectToggle(alias)}
                className={`min-w-0 text-left text-[15px] leading-tight truncate py-0.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-teal-400/70 focus-visible:ring-offset-1 ${ds.label}`}
              >
                {displayCategoryName(n.category.category)}
              </button>

              <button
                type="button"
                onClick={() => onSelectToggle(alias)}
                aria-label={isSelected ? 'Deselect category' : 'Select category'}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  isSelected
                    ? 'border-teal-600 bg-teal-600 text-white'
                    : 'border-slate-300/90 bg-white text-transparent hover:border-teal-400/60'
                }`}
              >
                <Check className="w-3 h-3" strokeWidth={3} />
              </button>
            </div>

            {hasChildren && isExpanded && (
              <div className={`relative ml-1.5 pl-2 border-l ${ds.guide}`}>
                <TreeRows
                  nodes={n.children}
                  depth={depth + 1}
                  selectedCategoryIds={selectedCategoryIds}
                  onSelectToggle={onSelectToggle}
                  expanded={expanded}
                  toggleExpand={toggleExpand}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

export function CategoryHierarchyPickerModal({
  isOpen,
  onClose,
  categories,
  selectedCategoryIds,
  onCategoryToggle,
  onClearError,
}: CategoryHierarchyPickerModalProps) {
  const [search, setSearch] = useState('');
  const { roots, orphans } = useMemo(() => buildCategoryTree(categories), [categories]);
  const filteredRoots = useMemo(() => filterCategoryTree(roots, search), [roots, search]);
  const filteredOrphans = useMemo(() => filterCategoryTree(orphans, search), [orphans, search]);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  /** Collapsed by default when opening or after clearing search. */
  useEffect(() => {
    if (!isOpen) return;
    if (!search.trim()) setExpanded(new Set());
  }, [isOpen, search]);

  /** With search, expand filtered branches so matches are visible. */
  useLayoutEffect(() => {
    if (!isOpen || !search.trim()) return;
    setExpanded(new Set([...collectKeys(filteredRoots), ...collectKeys(filteredOrphans)]));
  }, [isOpen, search, filteredRoots, filteredOrphans]);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectToggle = (alias: string) => {
    onCategoryToggle(alias);
    onClearError('categories');
  };

  const showOrphans = filteredOrphans.length > 0;
  const empty = filteredRoots.length === 0 && filteredOrphans.length === 0;

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} contentClassName="max-w-3xl">
      <div className="rounded-t-xl bg-gradient-to-r from-teal-600/10 via-indigo-500/10 to-violet-500/10 border-b border-slate-200/80">
        <ModalHeader title="Select categories" onClose={onClose} />
      </div>
      <div className="flex flex-col flex-1 min-h-0 px-5 sm:px-7 pt-4 pb-1.5">
        <div className="relative shrink-0 mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-600/70 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories…"
            className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200/90 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-teal-500/25 focus:border-teal-400 outline-none transition-shadow"
          />
        </div>
        <div className="rounded-lg border border-slate-200/80 bg-white/90 overflow-hidden flex flex-col max-h-[min(58vh,500px)]">
          <div
            className="grid grid-cols-[1.625rem_minmax(0,1fr)_1.375rem] gap-x-2 items-center shrink-0 py-1.5 pr-2 bg-slate-100/90 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
            style={{ paddingLeft: 6 }}
          >
            <span className="text-center text-slate-400" aria-hidden>
              ▸
            </span>
            <span>Category</span>
            <span className="text-center">Pick</span>
          </div>
          <div className="overflow-y-auto min-h-[200px] px-1 py-0.5 bg-gradient-to-b from-slate-50/50 to-white">
            {empty ? (
              <p className="text-slate-500 text-sm py-6 px-3 text-center">No categories found</p>
            ) : (
              <>
                {filteredRoots.length > 0 && (
                  <TreeRows
                    nodes={filteredRoots}
                    depth={0}
                    selectedCategoryIds={selectedCategoryIds}
                    onSelectToggle={handleSelectToggle}
                    expanded={expanded}
                    toggleExpand={toggleExpand}
                  />
                )}
                {showOrphans && (
                  <div className={filteredRoots.length > 0 ? 'mt-1 pt-1 border-t border-amber-200/70' : ''}>
                    {filteredRoots.length > 0 && (
                      <div className="px-2 py-1">
                        <p className="text-[10px] font-semibold text-amber-900/90 uppercase tracking-wide">
                          Other categories
                        </p>
                      </div>
                    )}
                    <TreeRows
                      nodes={filteredOrphans}
                      depth={0}
                      selectedCategoryIds={selectedCategoryIds}
                      onSelectToggle={handleSelectToggle}
                      expanded={expanded}
                      toggleExpand={toggleExpand}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/90 bg-slate-50/95 px-5 sm:px-7 py-2.5 rounded-b-xl">
        <p className="text-xs text-slate-500 hidden sm:block mr-auto max-w-[60%] leading-relaxed">
          <span className="font-medium text-teal-800">Teal</span> = top level ·{' '}
          <span className="font-medium text-indigo-800">Indigo</span> = sub ·{' '}
          <span className="font-medium text-violet-800">Violet</span> = deeper
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-600/20 hover:from-teal-500 hover:to-teal-600 transition-all"
        >
          Done
        </button>
      </div>
    </ModalContainer>
  );
}
