import type { Category } from '@/models/category';

export interface CategoryTreeNode {
  category: Category;
  alias: string;
  children: CategoryTreeNode[];
}

function typeUpper(c: Category): string {
  return String(c.typeOfCategory || '').toUpperCase();
}

function sortTreeNodes(nodes: CategoryTreeNode[]): void {
  nodes.sort((a, b) => {
    const pa = Number(a.category.priorityOrder ?? 0);
    const pb = Number(b.category.priorityOrder ?? 0);
    if (pa !== pb) return pa - pb;
    return String(a.category.category || '').localeCompare(String(b.category.category || ''), undefined, {
      sensitivity: 'base',
    });
  });
  for (const n of nodes) sortTreeNodes(n.children);
}

/**
 * Build L1 → L2 → L3 tree using display names in l1Parent / l2Parent (same as Category Master hierarchy step).
 */
export function buildCategoryTree(categories: Category[]): {
  roots: CategoryTreeNode[];
  orphans: CategoryTreeNode[];
} {
  const l1s = categories.filter((c) => typeUpper(c) === 'L1');
  const l2s = categories.filter((c) => typeUpper(c) === 'L2');
  const l3s = categories.filter((c) => typeUpper(c) === 'L3');
  const others = categories.filter((c) => !['L1', 'L2', 'L3'].includes(typeUpper(c)));

  function node(cat: Category): CategoryTreeNode {
    return {
      category: cat,
      alias: String(cat.alias || ''),
      children: [],
    };
  }

  const nameToNode = new Map<string, CategoryTreeNode>();

  const roots: CategoryTreeNode[] = l1s.map(node);
  for (const r of roots) {
    const n = String(r.category.category || '').trim();
    if (n) nameToNode.set(n, r);
  }

  const orphans: CategoryTreeNode[] = [];

  for (const cat of l2s) {
    const n = node(cat);
    const pName = String(cat.l1Parent || '').trim();
    const parent = pName ? nameToNode.get(pName) : undefined;
    if (parent && typeUpper(parent.category) === 'L1') {
      parent.children.push(n);
    } else {
      orphans.push(n);
    }
    const cname = String(cat.category || '').trim();
    if (cname) nameToNode.set(cname, n);
  }

  for (const cat of l3s) {
    const n = node(cat);
    const pName = String(cat.l2Parent || '').trim();
    const parent = pName ? nameToNode.get(pName) : undefined;
    if (parent && typeUpper(parent.category) === 'L2') {
      parent.children.push(n);
    } else {
      const l1Name = String(cat.l1Parent || '').trim();
      const l1Node = l1Name ? nameToNode.get(l1Name) : undefined;
      if (l1Node && typeUpper(l1Node.category) === 'L1') {
        l1Node.children.push(n);
      } else {
        orphans.push(n);
      }
    }
    const cname = String(cat.category || '').trim();
    if (cname) nameToNode.set(cname, n);
  }

  for (const cat of others) {
    orphans.push(node(cat));
  }

  sortTreeNodes(roots);
  sortTreeNodes(orphans);

  return { roots, orphans };
}

function nodeMatchesQuery(n: CategoryTreeNode, q: string): boolean {
  const name = (n.category.category || '').toLowerCase();
  const als = (n.category.alias || '').toLowerCase();
  const typ = (n.category.typeOfCategory || '').toLowerCase();
  return name.includes(q) || als.includes(q) || typ.includes(q);
}

/** Returns a shallow-cloned tree that only includes nodes matching the query or ancestors of matches. */
export function filterCategoryTree(nodes: CategoryTreeNode[], query: string): CategoryTreeNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  function walk(n: CategoryTreeNode): CategoryTreeNode | null {
    const childFiltered = n.children.map(walk).filter(Boolean) as CategoryTreeNode[];
    if (nodeMatchesQuery(n, q) || childFiltered.length > 0) {
      return { ...n, children: childFiltered };
    }
    return null;
  }

  return nodes.map(walk).filter(Boolean) as CategoryTreeNode[];
}
