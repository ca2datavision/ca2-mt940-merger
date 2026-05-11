import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  isBinaryContent,
  validateUtf8,
  validateTextFile,
  extractZipSafely,
  getZipEntryDeclaredSize,
  ZIP_LIMITS,
} from './safety';

describe('isBinaryContent', () => {
  it('returns false for ASCII text', () => {
    const text = new TextEncoder().encode('Hello, World!\nThis is a test.');
    expect(isBinaryContent(text)).toBe(false);
  });

  it('returns false for UTF-8 text', () => {
    const text = new TextEncoder().encode('Ümlauts and émojis 🎉');
    expect(isBinaryContent(text)).toBe(false);
  });

  it('returns true for binary data', () => {
    const binary = new Uint8Array(100);
    for (let i = 0; i < 100; i++) binary[i] = i % 256;
    expect(isBinaryContent(binary)).toBe(true);
  });

  it('returns false for empty content', () => {
    expect(isBinaryContent(new Uint8Array(0))).toBe(false);
  });
});

describe('validateUtf8', () => {
  it('returns true for valid UTF-8', () => {
    const text = new TextEncoder().encode('Valid UTF-8 text');
    expect(validateUtf8(text)).toBe(true);
  });

  it('returns false for invalid UTF-8', () => {
    const invalid = new Uint8Array([0xFF, 0xFE, 0x00, 0x00]);
    expect(validateUtf8(invalid)).toBe(false);
  });
});

describe('validateTextFile', () => {
  it('accepts valid UTF-8 text', () => {
    const text = new TextEncoder().encode('Valid text file');
    expect(() => validateTextFile(text)).not.toThrow();
  });

  it('rejects binary files', () => {
    const binary = new Uint8Array(100);
    for (let i = 0; i < 100; i++) binary[i] = i % 32;
    expect(() => validateTextFile(binary)).toThrow('Binary file not supported');
  });

  it('rejects non-UTF-8 files', () => {
    const invalid = new Uint8Array([0x80, 0x81, 0x82]);
    expect(() => validateTextFile(invalid)).toThrow('Only UTF-8 encoding supported');
  });
});

describe('extractZipSafely', () => {
  it('extracts valid ZIP files', async () => {
    const zip = new JSZip();
    zip.file('test.txt', 'Hello World');
    const zipData = await zip.generateAsync({ type: 'arraybuffer' });

    const { files, ignored } = await extractZipSafely(zipData);
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('test.txt');
    expect(ignored).toHaveLength(0);
  });

  it('rejects ZIP with too many entries', async () => {
    const zip = new JSZip();
    for (let i = 0; i <= ZIP_LIMITS.MAX_ENTRIES; i++) {
      zip.file(`file${i}.txt`, 'content');
    }
    const zipData = await zip.generateAsync({ type: 'arraybuffer' });

    await expect(extractZipSafely(zipData)).rejects.toThrow('too many files');
  });

  it('rejects ZIP with oversized file', async () => {
    const zip = new JSZip();
    zip.file('large.txt', 'x'.repeat(ZIP_LIMITS.MAX_FILE_SIZE + 1));
    const zipData = await zip.generateAsync({ type: 'arraybuffer' });

    await expect(extractZipSafely(zipData)).rejects.toThrow(/exceeds.*limit/);
  });

  it('filters out __MACOSX directory', async () => {
    const zip = new JSZip();
    zip.file('data.sta', 'content');
    zip.file('__MACOSX/._data.sta', 'metadata');
    const zipData = await zip.generateAsync({ type: 'arraybuffer' });

    const { files, ignored } = await extractZipSafely(zipData);
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('data.sta');
    expect(ignored.find(i => i.name === '__MACOSX/._data.sta')).toBeDefined();
    expect(ignored[0].reason).toBe('macOS metadata');
  });

  it('filters out .DS_Store files', async () => {
    const zip = new JSZip();
    zip.file('data.sta', 'content');
    zip.file('.DS_Store', 'metadata');
    zip.file('subdir/.DS_Store', 'metadata');
    const zipData = await zip.generateAsync({ type: 'arraybuffer' });

    const { files, ignored } = await extractZipSafely(zipData);
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('data.sta');
    expect(ignored).toHaveLength(2);
    expect(ignored.some(i => i.name === '.DS_Store')).toBe(true);
    expect(ignored.some(i => i.name === 'subdir/.DS_Store')).toBe(true);
    expect(ignored.every(i => i.reason === 'macOS metadata')).toBe(true);
  });
});

describe('getZipEntryDeclaredSize', () => {
  it('returns declared size when metadata present', async () => {
    const zip = new JSZip();
    zip.file('test.txt', 'Hello World');
    const zipData = await zip.generateAsync({ type: 'arraybuffer' });
    const loadedZip = await JSZip.loadAsync(zipData);
    const entry = loadedZip.files['test.txt'];

    const size = getZipEntryDeclaredSize(entry);
    expect(size).toBe(11); // 'Hello World'.length
  });

  it('returns 0 when metadata missing', () => {
    const mockEntry = {} as JSZip.JSZipObject;
    expect(getZipEntryDeclaredSize(mockEntry)).toBe(0);
  });
});
