import { describe, it, expect } from 'vitest';
import { sanitizeErrorMessage } from './errorSanitizer';

describe('sanitizeErrorMessage', () => {
  it('returns fallback for non-Error types', () => {
    expect(sanitizeErrorMessage('string error', 'fallback')).toBe('fallback');
    expect(sanitizeErrorMessage(null, 'fallback')).toBe('fallback');
    expect(sanitizeErrorMessage(undefined, 'fallback')).toBe('fallback');
    expect(sanitizeErrorMessage(123, 'fallback')).toBe('fallback');
  });

  it('sanitizes Windows paths', () => {
    const error = new Error('Failed to read C:\\Users\\admin\\secret\\file.txt');
    expect(sanitizeErrorMessage(error, 'fallback')).toBe('Failed to read [path]');
  });

  it('sanitizes Unix paths starting with common directories', () => {
    const error = new Error('Cannot open /home/user/documents/secret.txt');
    expect(sanitizeErrorMessage(error, 'fallback')).toBe('Cannot open [path]');
  });

  it('sanitizes paths with file extensions', () => {
    const error = new Error('Error in /var/log/app.log and /tmp/data.json');
    expect(sanitizeErrorMessage(error, 'fallback')).toBe('Error in [path] and [path]');
  });

  it('preserves non-path error messages', () => {
    const error = new Error('Invalid MT940 format: missing :20: tag');
    expect(sanitizeErrorMessage(error, 'fallback')).toBe('Invalid MT940 format: missing :20: tag');
  });

  it('sanitizes deep nested paths', () => {
    const error = new Error('File /data/projects/app/src/utils/parser.ts not found');
    expect(sanitizeErrorMessage(error, 'fallback')).toBe('File [path] not found');
  });
});
