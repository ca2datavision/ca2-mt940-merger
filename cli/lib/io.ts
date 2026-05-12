/**
 * CLI I/O Utilities
 * Handles file operations with safety guarantees.
 */

import { readFileSync, writeFileSync, renameSync, existsSync, unlinkSync } from 'fs';
import { resolve, basename } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

export interface WriteOptions {
  force?: boolean;
}

/**
 * Read file contents safely
 */
export function readFile(path: string): string {
  const resolved = resolve(path);
  if (!existsSync(resolved)) {
    throw new Error(`File not found: ${path}`);
  }
  return readFileSync(resolved, 'utf-8');
}

/**
 * Write file atomically (write to temp, then rename)
 * Refuses to overwrite existing files unless force=true
 */
export function writeFileAtomic(path: string, content: string, options: WriteOptions = {}): void {
  const resolved = resolve(path);

  if (existsSync(resolved) && !options.force) {
    throw new Error(`File already exists: ${path}. Use --force to overwrite.`);
  }

  const tempName = `${basename(path)}.${randomBytes(8).toString('hex')}.tmp`;
  const tempPath = resolve(tmpdir(), tempName);

  try {
    writeFileSync(tempPath, content, 'utf-8');
    renameSync(tempPath, resolved);
  } catch (err) {
    try {
      unlinkSync(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw err;
  }
}

/**
 * Check if a file exists
 */
export function fileExists(path: string): boolean {
  return existsSync(resolve(path));
}

/**
 * Validate input file exists and is readable
 */
export function validateInputFile(path: string): string {
  const resolved = resolve(path);
  if (!existsSync(resolved)) {
    throw new Error(`Input file not found: ${path}`);
  }
  return resolved;
}
