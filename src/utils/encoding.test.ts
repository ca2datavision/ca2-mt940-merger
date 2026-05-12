import { describe, it, expect } from 'vitest';
import { detectAndDecode, decodeText } from './encoding';

describe('detectAndDecode', () => {
  it('detects UTF-8 with BOM', () => {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const text = new TextEncoder().encode('Hello');
    const data = new Uint8Array([...bom, ...text]);

    const result = detectAndDecode(data);
    expect(result.encoding).toBe('utf-8');
    expect(result.hasBOM).toBe(true);
    expect(result.text).toBe('Hello');
  });

  it('detects UTF-8 without BOM', () => {
    const data = new TextEncoder().encode('Hello UTF-8');
    const result = detectAndDecode(data);

    expect(result.encoding).toBe('utf-8');
    expect(result.hasBOM).toBe(false);
    expect(result.text).toBe('Hello UTF-8');
  });

  it('detects UTF-8 with special characters', () => {
    const data = new TextEncoder().encode('Übung macht den Meister');
    const result = detectAndDecode(data);

    expect(result.encoding).toBe('utf-8');
    expect(result.text).toBe('Übung macht den Meister');
  });

  it('falls back when UTF-8 fails', () => {
    // Bytes 0x80-0x9F are invalid standalone UTF-8 but valid in Windows-1250/ISO-8859-1
    const data = new Uint8Array([0x80, 0x81, 0x82, 0x83]);
    const result = detectAndDecode(data);

    // Should fall back to windows-1250 or iso-8859-1
    expect(['windows-1250', 'iso-8859-1']).toContain(result.encoding);
    expect(result.hasBOM).toBe(false);
  });

  it('handles empty input', () => {
    const result = detectAndDecode(new Uint8Array(0));
    expect(result.encoding).toBe('utf-8');
    expect(result.text).toBe('');
  });
});

describe('decodeText', () => {
  it('returns decoded text string', () => {
    const data = new TextEncoder().encode('Test string');
    expect(decodeText(data)).toBe('Test string');
  });
});
