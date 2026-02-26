'use client';

/** Detect if the page was loaded via full refresh (F5 / reload). */
export function isPageReload(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === 'reload';
}

/** Remove persisted form state so it’s not restored after a manual refresh. */
export function clearFormStorageOnReload(key: string): void {
  if (typeof window === 'undefined') return;
  if (isPageReload()) {
    try {
      sessionStorage.removeItem(key);
    } catch {}
  }
}

export function getPersistedForm<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setPersistedForm(key: string, data: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

export function removePersistedForm(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(key);
  } catch {}
}
