import AdmZip from 'adm-zip';
import {
  validateFileExtension,
  validateFileSize,
  shouldSkipFile,
  getContentTypeFromFilename,
} from './validation';

export interface ExtractedFile {
  buffer: Buffer;
  filename: string;
  contentType: string;
  size: number;
  originalPath: string;
}

export interface ZipExtractionResult {
  success: boolean;
  files: ExtractedFile[];
  skippedFiles: string[];
  errors: Array<{ filename: string; error: string }>;
  totalSize: number;
}

/**
 * Extract image files from a ZIP buffer
 */
export async function extractImagesFromZip(
  zipBuffer: Buffer
): Promise<ZipExtractionResult> {
  const result: ZipExtractionResult = {
    success: false,
    files: [],
    skippedFiles: [],
    errors: [],
    totalSize: 0,
  };

  try {
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    for (const entry of zipEntries) {
      // Skip directories
      if (entry.isDirectory) {
        continue;
      }

      const filename = entry.entryName;

      // Skip system files
      if (shouldSkipFile(filename)) {
        result.skippedFiles.push(filename);
        continue;
      }

      // Validate file extension
      const extensionValidation = validateFileExtension(filename);
      if (!extensionValidation.valid) {
        result.skippedFiles.push(filename);
        continue;
      }

      // Get the file buffer
      const fileBuffer = entry.getData();
      const fileSize = fileBuffer.length;

      // Validate file size
      const sizeValidation = validateFileSize(fileSize);
      if (!sizeValidation.valid) {
        result.errors.push({
          filename,
          error: sizeValidation.error || 'File too large',
        });
        continue;
      }

      // Get content type
      const contentType = getContentTypeFromFilename(filename);

      // Extract filename from path (remove directory structure)
      const filenameOnly = filename.split('/').pop() || filename;

      result.files.push({
        buffer: fileBuffer,
        filename: filenameOnly,
        contentType,
        size: fileSize,
        originalPath: filename,
      });

      result.totalSize += fileSize;
    }

    result.success = result.files.length > 0;

    return result;
  } catch (error) {
    console.error('ZIP extraction error:', error);
    return {
      ...result,
      success: false,
      errors: [
        {
          filename: 'ZIP',
          error: error instanceof Error ? error.message : 'Failed to extract ZIP',
        },
      ],
    };
  }
}

/**
 * Validate ZIP file before extraction
 */
export function validateZipFile(file: File): { valid: boolean; error?: string } {
  // Check file extension
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return {
      valid: false,
      error: 'File must be a ZIP archive',
    };
  }

  // Check file size (max 100MB for ZIP)
  const maxZipSize = 100 * 1024 * 1024;
  if (file.size > maxZipSize) {
    return {
      valid: false,
      error: `ZIP file too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum: 100MB`,
    };
  }

  return { valid: true };
}
