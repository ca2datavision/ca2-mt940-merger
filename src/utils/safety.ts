import JSZip from 'jszip';

export const ZIP_LIMITS = {
  MAX_ENTRIES: 100,
  MAX_TOTAL_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILE_SIZE: 5 * 1024 * 1024,   // 5MB
} as const;

export const BINARY_DETECTION = {
  SAMPLE_SIZE: 1024,
  NON_PRINTABLE_THRESHOLD: 0.10, // 10%
} as const;

export class SafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SafetyError';
  }
}

export function isBinaryContent(data: Uint8Array): boolean {
  const sampleSize = Math.min(data.length, BINARY_DETECTION.SAMPLE_SIZE);
  if (sampleSize === 0) return false;

  let nonPrintableCount = 0;
  for (let i = 0; i < sampleSize; i++) {
    const byte = data[i];
    // Non-printable: not tab(9), newline(10), carriage return(13), or printable ASCII (32-126)
    // Also allow UTF-8 continuation bytes (128-255)
    if (byte < 9 || (byte > 13 && byte < 32) || byte === 127) {
      nonPrintableCount++;
    }
  }

  return nonPrintableCount / sampleSize > BINARY_DETECTION.NON_PRINTABLE_THRESHOLD;
}

export function validateUtf8(data: Uint8Array): boolean {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    decoder.decode(data);
    return true;
  } catch {
    return false;
  }
}

export function validateTextFile(data: Uint8Array): void {
  if (isBinaryContent(data)) {
    throw new SafetyError('Binary file not supported');
  }
  if (!validateUtf8(data)) {
    throw new SafetyError('Only UTF-8 encoding supported');
  }
}

export interface ExtractedFile {
  name: string;
  content: Uint8Array;
}

export interface IgnoredFile {
  name: string;
  reason: string;
}

export interface ZipExtractionResult {
  files: ExtractedFile[];
  ignored: IgnoredFile[];
}

const ALLOWED_EXTENSIONS = ['.sta', '.txt', '.mt940', '.mta'];

function hasAllowedExtension(filename: string): boolean {
  const basename = filename.split('/').pop() || filename;
  const lastDot = basename.lastIndexOf('.');
  if (lastDot === -1) return true; // extensionless allowed
  const ext = basename.slice(lastDot).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

function isMacOSMetadata(name: string): boolean {
  return name.startsWith('__MACOSX/') || name.endsWith('.DS_Store') || name.includes('/.DS_Store');
}

/**
 * Get declared uncompressed size from JSZip entry metadata.
 * Uses internal _data.uncompressedSize property (JSZip 3.x).
 * Returns 0 if metadata unavailable - actual size check still occurs after decompression.
 */
export function getZipEntryDeclaredSize(file: JSZip.JSZipObject): number {
  const meta = file as unknown as { _data?: { uncompressedSize?: number } };
  return meta._data?.uncompressedSize ?? 0;
}

export async function extractZipSafely(zipData: ArrayBuffer): Promise<ZipExtractionResult> {
  const zip = await JSZip.loadAsync(zipData);
  const allEntries = Object.keys(zip.files).filter(name => !zip.files[name].dir);

  // Filter out macOS metadata and unsupported extensions
  const ignored: IgnoredFile[] = [];
  const entries = allEntries.filter(name => {
    if (isMacOSMetadata(name)) {
      ignored.push({ name, reason: 'macOS metadata' });
      return false;
    }
    if (!hasAllowedExtension(name)) {
      ignored.push({ name, reason: 'unsupported extension' });
      return false;
    }
    return true;
  });

  if (entries.length > ZIP_LIMITS.MAX_ENTRIES) {
    throw new SafetyError(`ZIP contains too many files (${entries.length} > ${ZIP_LIMITS.MAX_ENTRIES})`);
  }

  let projectedTotalSize = 0;
  for (const name of entries) {
    const declaredSize = getZipEntryDeclaredSize(zip.files[name]);

    if (declaredSize > ZIP_LIMITS.MAX_FILE_SIZE) {
      throw new SafetyError(`File "${name}" declared size exceeds limit (${declaredSize} > ${ZIP_LIMITS.MAX_FILE_SIZE})`);
    }
    projectedTotalSize += declaredSize;
  }

  if (projectedTotalSize > ZIP_LIMITS.MAX_TOTAL_SIZE) {
    throw new SafetyError(`ZIP declared total size exceeds limit (${projectedTotalSize} > ${ZIP_LIMITS.MAX_TOTAL_SIZE})`);
  }

  const files: ExtractedFile[] = [];
  let actualTotalSize = 0;

  for (const name of entries) {
    const file = zip.files[name];
    const content = await file.async('uint8array');

    if (content.length > ZIP_LIMITS.MAX_FILE_SIZE) {
      throw new SafetyError(`File "${name}" exceeds size limit (${content.length} > ${ZIP_LIMITS.MAX_FILE_SIZE})`);
    }

    actualTotalSize += content.length;
    if (actualTotalSize > ZIP_LIMITS.MAX_TOTAL_SIZE) {
      throw new SafetyError(`ZIP total uncompressed size exceeds limit (${actualTotalSize} > ${ZIP_LIMITS.MAX_TOTAL_SIZE})`);
    }

    files.push({ name, content });
  }

  return { files, ignored };
}
