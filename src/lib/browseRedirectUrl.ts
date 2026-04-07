/**
 * Build storefront browse URLs from env templates (server-side).
 *
 * **Docker Compose / shell:** Do not use `${category.alias}` in `.env` — Compose treats `${...}` as
 * variable substitution and can strip it, leaving broken URLs like `https://www.urvann.com/browse/.alias}`.
 * Prefer `__ALIAS__` in `REDIRECT_URL` / `REDIRECT_URL_COLLECTION`, or escape in Compose as `$$` if needed.
 */

const SAFE_DEFAULT = 'https://www.urvann.com/browse/__ALIAS__';

/** Known placeholders → replaced with the real category/collection alias. */
export function applyAliasToRedirectTemplate(template: string, alias: string): string {
  const a = String(alias ?? '').trim();
  if (!a) return '';
  let out = String(template ?? '').trim();
  if (!out) return '';

  out = out
    .replace(/\$\{category\.alias\}/g, a)
    .replace(/\$\{alias\}/g, a)
    .replace(/\{\{alias\}\}/gi, a)
    .replace(/\{category\.alias\}/g, a)
    .replace(/\{alias\}/gi, a)
    .replace(/__ALIAS__/g, a);

  // Docker Compose often mangles `${category.alias}` → leaves `.alias}` on the URL
  if (out.includes('.alias}')) {
    out = out.replace(/\.alias\}/g, a);
  }

  return out;
}

export function buildBrowseRedirectUrl(
  alias: string,
  kind: 'category' | 'collection' = 'category'
): string {
  const a = String(alias ?? '').trim();
  if (!a) return '';
  const collectionTemplate = process.env.REDIRECT_URL_COLLECTION?.trim();
  const raw =
    kind === 'collection' && collectionTemplate
      ? collectionTemplate
      : process.env.REDIRECT_URL?.trim() || SAFE_DEFAULT;
  return applyAliasToRedirectTemplate(raw, a);
}
