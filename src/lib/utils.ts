/**
 * Slugify a string for use as alias/URL: lowercase, replace non-alphanumeric with dash, collapse multiple dashes.
 */
export function slug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-') || 'collection';
}
