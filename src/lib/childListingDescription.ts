import type { ParentMaster } from '@/models/parentMaster';

function stripHtmlToPlain(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Trim trailing punctuation/spaces so joins don’t read like “…end. and …”. */
function trimTrailingPunctuation(s: string): string {
  return s.replace(/[.,;:\s]+$/u, '').trim();
}

/**
 * Child listing: merge each parent’s `description` into one plain-text sentence.
 * Multiple non-empty parts are joined with the word “and”; result ends with “.” when needed.
 */
export function mergeParentDescriptionsForChildListing(
  items: Array<{ parent?: ParentMaster }>
): string {
  const parts: string[] = [];
  for (const item of items) {
    const raw = item.parent?.description;
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const plain = stripHtmlToPlain(raw);
    const normalized = plain.replace(/\s+/g, ' ').trim();
    if (normalized) parts.push(normalized);
  }
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!;

  const cleaned = parts.map(trimTrailingPunctuation).filter(Boolean);
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return cleaned[0]!;

  let body = cleaned.join(' and ');
  body = body.charAt(0).toUpperCase() + body.slice(1);
  if (!/[.!?]\s*$/.test(body)) body = `${body}.`;
  return body;
}
