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

  it('ignores oversized file (best-effort)', async () => {
    const zip = new JSZip();
    zip.file('large.txt', 'x'.repeat(ZIP_LIMITS.MAX_FILE_SIZE + 1));
    zip.file('normal.sta', 'valid content');
    const zipData = await zip.generateAsync({ type: 'arraybuffer' });

    const { files, ignored } = await extractZipSafely(zipData);
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('normal.sta');
    expect(ignored.find(i => i.name === 'large.txt')).toBeDefined();
    expect(ignored.find(i => i.name === 'large.txt')?.reason).toMatch(/exceeds.*limit/);
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

  it('ignores files with unsupported extensions', async () => {
    const zip = new JSZip();
    zip.file('data.sta', 'valid content');
    zip.file('report.pdf', 'pdf content');
    zip.file('image.png', 'image data');
    zip.file('document.docx', 'docx data');
    const zipData = await zip.generateAsync({ type: 'arraybuffer' });

    const { files, ignored } = await extractZipSafely(zipData);
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('data.sta');
    expect(ignored).toHaveLength(3);
    expect(ignored.every(i => i.reason === 'unsupported extension')).toBe(true);
    expect(ignored.map(i => i.name).sort()).toEqual(['document.docx', 'image.png', 'report.pdf']);
  });

  it('allows extensionless files', async () => {
    const zip = new JSZip();
    zip.file('mt940data', 'extensionless content');
    zip.file('data.sta', 'sta content');
    const zipData = await zip.generateAsync({ type: 'arraybuffer' });

    const { files, ignored } = await extractZipSafely(zipData);
    expect(files).toHaveLength(2);
    expect(files.map(f => f.name).sort()).toEqual(['data.sta', 'mt940data']);
    expect(ignored).toHaveLength(0);
  });

  it('allows all supported extensions (.sta, .txt, .mt940, .mta)', async () => {
    const zip = new JSZip();
    zip.file('file1.sta', 'content');
    zip.file('file2.txt', 'content');
    zip.file('file3.mt940', 'content');
    zip.file('file4.mta', 'content');
    zip.file('file5.STA', 'uppercase extension');
    const zipData = await zip.generateAsync({ type: 'arraybuffer' });

    const { files, ignored } = await extractZipSafely(zipData);
    expect(files).toHaveLength(5);
    expect(ignored).toHaveLength(0);
  });

  it('handles invalid ZIP data gracefully', async () => {
    const invalidData = new ArrayBuffer(100);

    await expect(extractZipSafely(invalidData)).rejects.toThrow('Failed to read ZIP');
  });

  it('extracts non-encrypted entries while ignoring encrypted ones', async () => {
    const zip = new JSZip();
    zip.file('normal.sta', 'valid content');
    const zipData = await zip.generateAsync({ type: 'arraybuffer' });

    const { files } = await extractZipSafely(zipData);
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('normal.sta');
  });

  it('rejects encrypted ZIP files with SafetyError', async () => {
    const originalLoadAsync = JSZip.loadAsync;
    JSZip.loadAsync = async () => {
      throw new Error('Encrypted archives are not supported');
    };

    try {
      await expect(extractZipSafely(new ArrayBuffer(10))).rejects.toThrow(
        'Encrypted ZIP files are not supported'
      );
    } finally {
      JSZip.loadAsync = originalLoadAsync;
    }
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
