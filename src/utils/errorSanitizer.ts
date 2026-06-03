/**
 * Sanitizes error messages by removing file paths to prevent information disclosure.
 * Security: Prevents exposure of internal file paths in error messages.
 */
export function sanitizeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message
      .replace(/[A-Za-z]:\\[^\s:]+/g, '[path]')
      .replace(/\/(?:home|usr|var|tmp|etc|data|opt)[^\s:]+/gi, '[path]')
      .replace(/\/[^\s:]*\/[^\s:]*\.[a-z]{1,4}/gi, '[path]');
  }
  return fallback;
}
