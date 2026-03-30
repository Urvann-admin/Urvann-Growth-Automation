/**
 * Normalize image URLs so the same asset matches across listing DB rows and image collections
 * (trim, strip hash, lowercase hostname).
 */
export function normalizeListingImageUrlForMatch(url: string): string {
  const t = String(url ?? '').trim();
  if (!t) return '';
  try {
    const u = new URL(t);
    u.hash = '';
    if (u.hostname) u.hostname = u.hostname.toLowerCase();
    return u.href;
  } catch {
    return t;
  }
}
