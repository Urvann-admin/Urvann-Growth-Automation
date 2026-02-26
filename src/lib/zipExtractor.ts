import AdmZip from 'adm-zip';

export interface ExtractedFile {
  buffer: Buffer;
  filename: string;
  size: number;
  mimeType: string;
}

export interface ZipExtractionOptions {
  /** Maximum number of files to extract */
  maxFiles?: number;
  /** Maximum size per file in bytes */
  maxFileSize?: number;
  /** Allowed MIME types */
  allowedTypes?: string[];
  /** Skip hidden files and system folders */
  skipSystemFiles?: boolean;
}

const DEFAULT_OPTIONS: ZipExtractionOptions = {
  maxFiles: 500,
  maxFileSize: 10 * 1024 * 1024, // 10MB per file
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  skipSystemFiles: true,
};

/**
 * Determine MIME type from file extension
 */
function getMimeTypeFromExtension(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || '';
  
  const mimeMap: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
  };
  
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * Check if a file should be skipped (system files, hidden files)
 */
function shouldSkipFile(filename: string, skipSystemFiles: boolean): boolean {
  if (!skipSystemFiles) return false;
  
  const lowerName = filename.toLowerCase();
  
  // Skip macOS system files
  if (lowerName.includes('__macosx')) return true;
  if (lowerName.includes('.ds_store')) return true;
  
  // Skip hidden files (starting with .)
  const parts = filename.split('/');
  const lastName = parts[parts.length - 1];
  if (lastName.startsWith('.')) return true;
  
  // Skip Thumbs.db (Windows)
  if (lowerName.includes('thumbs.db')) return true;
  
  return false;
}

/**
 * Check if MIME type is allowed
 */
function isAllowedMimeType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.some(allowed => {
    if (allowed.endsWith('/*')) {
      // Wildcard matching (e.g., 'image/*')
      const prefix = allowed.slice(0, -2);
      return mimeType.startsWith(prefix);
    }
    return mimeType === allowed;
  });
}

/**
 * Extract image files from a ZIP buffer
 */
export async function extractImagesFromZip(
  zipBuffer: Buffer,
  options: ZipExtractionOptions = {}
): Promise<{
  success: boolean;
  files: ExtractedFile[];
  errors: string[];
  skipped: number;
}> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const files: ExtractedFile[] = [];
  const errors: string[] = [];
  let skipped = 0;

  try {
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();

    for (const entry of entries) {
      // Skip directories
      if (entry.isDirectory) continue;

      const filename = entry.entryName;

      // Skip system files
      if (shouldSkipFile(filename, opts.skipSystemFiles ?? true)) {
        skipped++;
        continue;
      }

      // Check max files limit
      if (files.length >= (opts.maxFiles ?? DEFAULT_OPTIONS.maxFiles!)) {
        errors.push(`Maximum file limit (${opts.maxFiles}) reached. Some files were skipped.`);
        break;
      }

      // Get file buffer
      let buffer: Buffer;
      try {
        buffer = entry.getData();
      } catch (err) {
        errors.push(`Failed to extract ${filename}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        skipped++;
        continue;
      }

      // Check file size
      if (buffer.length > (opts.maxFileSize ?? DEFAULT_OPTIONS.maxFileSize!)) {
        errors.push(
          `File ${filename} (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds max size (${((opts.maxFileSize ?? DEFAULT_OPTIONS.maxFileSize!) / 1024 / 1024).toFixed(2)}MB)`
        );
        skipped++;
        continue;
      }

      // Determine MIME type
      const mimeType = getMimeTypeFromExtension(filename);

      // Check if allowed
      if (!isAllowedMimeType(mimeType, opts.allowedTypes ?? DEFAULT_OPTIONS.allowedTypes!)) {
        skipped++;
        continue;
      }

      // Extract just the filename (remove path)
      const justFilename = filename.split('/').pop() || filename;

      files.push({
        buffer,
        filename: justFilename,
        size: buffer.length,
        mimeType,
      });
    }

    return {
      success: files.length > 0,
      files,
      errors,
      skipped,
    };
  } catch (error) {
    return {
      success: false,
      files: [],
      errors: [
        `Failed to process ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`
      ],
      skipped: 0,
    };
  }
}

/**
 * Validate ZIP file before processing
 */
export function validateZipFile(
  file: File,
  maxSize: number = 100 * 1024 * 1024 // 100MB default
): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['application/zip', 'application/x-zip-compressed'];
  const validExtensions = ['.zip'];
  
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (!validTypes.includes(file.type) && !validExtensions.includes(extension)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a ZIP file.',
    };
  }

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `ZIP file is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is ${(maxSize / 1024 / 1024).toFixed(2)}MB.`,
    };
  }

  return { valid: true };
}
