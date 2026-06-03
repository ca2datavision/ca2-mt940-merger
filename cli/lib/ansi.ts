/**
 * ANSI escape sequence stripping utility
 *
 * Sanitizes user-derived content to prevent terminal injection attacks
 * where malicious ANSI sequences could manipulate terminal output.
 */

/**
 * Pattern matching ANSI escape sequences:
 * - CSI sequences: \x1b[...m (colors, cursor movement, etc.)
 * - OSC sequences: \x1b]...\x07 (window title, hyperlinks, etc.)
 */
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07/g;

/**
 * Strips ANSI escape sequences from a string.
 * Use on any user-derived content before terminal output.
 *
 * @param input - String that may contain ANSI escape sequences
 * @returns Sanitized string with ANSI sequences removed
 */
export function stripAnsi(input: string): string {
  if (!input) return input;
  return input.replace(ANSI_PATTERN, '');
}
