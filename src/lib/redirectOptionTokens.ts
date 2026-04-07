/** Separates stable id prefix from browse URL in redirect dropdown values. */
const SEP = '\t';

/** Legacy: multiple picks joined with this char (still parsed when loading old data). */
export const REDIRECT_FORM_MULTI_SEP = '\x1e';

export function splitRedirectFormValues(s: string): string[] {
  const t = String(s ?? '').trim();
  if (!t) return [];
  if (t.includes(REDIRECT_FORM_MULTI_SEP)) {
    return t.split(REDIRECT_FORM_MULTI_SEP).map((x) => x.trim()).filter(Boolean);
  }
  return t.split(',').map((x) => x.trim()).filter(Boolean);
}

export function joinRedirectFormValues(parts: string[]): string {
  return parts.map((p) => String(p).trim()).filter(Boolean).join(REDIRECT_FORM_MULTI_SEP);
}

export function makeRedirectOptionValue(kind: 'c' | 'k', id: string, url: string): string {
  const sid = String(id ?? '').trim();
  const u = String(url ?? '').trim();
  if (!u) return '';
  if (!sid) return u;
  return `${kind}:${sid}${SEP}${u}`;
}

/** Extract browse URL for API / parent `redirects` field. */
export function redirectOptionTokenToUrl(token: string): string {
  const t = String(token ?? '').trim();
  const i = t.indexOf(SEP);
  if (i === -1) return t;
  return t.slice(i + 1).trim();
}

/** Form tokens (record-sep or comma) → single browse URL for API (first pick only). */
export function redirectsCsvToUrlCsv(csv: string): string {
  const urls = splitRedirectFormValues(csv)
    .map((s) => redirectOptionTokenToUrl(s.trim()))
    .map((s) => s.trim())
    .filter(Boolean);
  const uniq = [...new Set(urls)];
  return uniq[0] ?? '';
}

/** Map legacy URL-only CSV to internal tokens using current options (first match per URL). */
export function mapLegacyRedirectCsvToInternal(
  csv: string,
  options: { value: string; label: string }[]
): string {
  if (!String(csv ?? '').trim()) return '';
  const parts = splitRedirectFormValues(csv);
  const next = parts.map((part) => {
    if (part.includes(SEP)) return part;
    const opt = options.find((o) => redirectOptionTokenToUrl(o.value) === part);
    return opt?.value ?? part;
  });
  const first = next[0] ?? '';
  return first;
}

export function redirectsArrayToUrlArray(arr: string[]): string[] {
  const urls = [...new Set(arr.map((s) => redirectOptionTokenToUrl(String(s).trim())).filter(Boolean))];
  return urls[0] !== undefined ? [urls[0]] : [];
}

/** Label for a stored redirect token or plain URL (chips / display). */
export function redirectChipLabel(
  stored: string,
  options: { value: string; label: string }[]
): string {
  const v = String(stored ?? '').trim();
  if (!v) return '';
  const byValue = options.find((o) => o.value === v);
  if (byValue) return byValue.label;
  const byUrl = options.find((o) => redirectOptionTokenToUrl(o.value) === v);
  if (byUrl) return byUrl.label;
  return redirectOptionTokenToUrl(v);
}
