/**
 * Validation utilities for image uploads
 */

// Allowed image MIME types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

// Allowed image extensions
export const ALLOWED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
] as const;

// Max file size: 10MB per image
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Max total size for a collection: 500MB
export const MAX_COLLECTION_SIZE = 500 * 1024 * 1024;

// Max number of images per collection
export const MAX_IMAGES_PER_COLLECTION = 500;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate file type by MIME type
 */
export function validateFileType(mimeType: string): ValidationResult {
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType as any)) {
    return {
      valid: false,
      error: `Invalid file type: ${mimeType}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }
  return { valid: true };
}

/**
 * Validate file extension
 */
export function validateFileExtension(filename: string): ValidationResult {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension as any)) {
    return {
      valid: false,
      error: `Invalid file extension: ${extension}. Allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`,
    };
  }
  return { valid: true };
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): ValidationResult {
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large: ${formatBytes(size)}. Maximum allowed: ${formatBytes(MAX_FILE_SIZE)}`,
    };
  }
  return { valid: true };
}

/**
 * Validate total collection size
 */
export function validateCollectionSize(totalSize: number): ValidationResult {
  if (totalSize > MAX_COLLECTION_SIZE) {
    return {
      valid: false,
      error: `Total size too large: ${formatBytes(totalSize)}. Maximum allowed: ${formatBytes(MAX_COLLECTION_SIZE)}`,
    };
  }
  return { valid: true };
}

/**
 * Validate number of images
 */
export function validateImageCount(count: number): ValidationResult {
  if (count > MAX_IMAGES_PER_COLLECTION) {
    return {
      valid: false,
      error: `Too many images: ${count}. Maximum allowed: ${MAX_IMAGES_PER_COLLECTION}`,
    };
  }
  if (count === 0) {
    return {
      valid: false,
      error: 'No images found',
    };
  }
  return { valid: true };
}

/**
 * Check if filename should be skipped (e.g., __MACOSX, .DS_Store)
 */
export function shouldSkipFile(filename: string): boolean {
  const skipPatterns = [
    '__MACOSX',
    '.DS_Store',
    'Thumbs.db',
    'desktop.ini',
    '.git',
    '.svn',
  ];

  return skipPatterns.some((pattern) => filename.includes(pattern));
}

/**
 * Get content type from filename
 */
export function getContentTypeFromFilename(filename: string): string {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  return mimeTypes[extension] || 'image/jpeg';
}

/**
 * Format bytes to human-readable format
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100);
}

/**
 * Generate a unique session ID for upload tracking
 */
export function generateSessionId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
