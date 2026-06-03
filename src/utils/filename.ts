/**
 * Filename sanitization utility
 *
 * Sanitizes filenames to remove characters that could cause filesystem issues
 * across different operating systems.
 */

/**
 * Characters unsafe for filenames across platforms:
 * - < > : " / \ | ? * - Reserved in Windows
 * - Control characters (0x00-0x1f) - Invalid on most systems
 */
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

/**
 * Windows reserved device names (case-insensitive)
 */
const RESERVED_NAMES = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;

/**
 * Maximum filename length (conservative limit for cross-platform compatibility)
 */
const MAX_LENGTH = 200;

/**
 * Sanitizes a string for safe use as a filename.
 *
 * @param name - The string to sanitize
 * @param fallback - Fallback value if sanitization results in empty string (default: 'export')
 * @returns A filesystem-safe filename
 */
export function sanitizeFilename(name: string, fallback = 'export'): string {
  if (!name) return fallback;

  let safe = name
    .replace(UNSAFE_CHARS, '_')    // Replace unsafe chars with underscore
    .replace(/_{2,}/g, '_')        // Collapse multiple underscores
    .replace(/^\.+/, '')           // Remove leading dots (hidden files / parent traversal)
    .replace(/\.+$/, '')           // Remove trailing dots (Windows issue)
    .trim()
    .slice(0, MAX_LENGTH);         // Limit length

  // Check for reserved names or empty result
  if (!safe || RESERVED_NAMES.test(safe.split('.')[0])) {
    safe = fallback;
  }

  return safe;
}
