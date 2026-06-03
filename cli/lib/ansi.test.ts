import { describe, it, expect } from 'vitest';
import { stripAnsi } from './ansi';

describe('stripAnsi', () => {
  it('returns empty string unchanged', () => {
    expect(stripAnsi('')).toBe('');
  });

  it('returns null/undefined unchanged', () => {
    expect(stripAnsi(null as unknown as string)).toBe(null);
    expect(stripAnsi(undefined as unknown as string)).toBe(undefined);
  });

  it('returns plain text unchanged', () => {
    expect(stripAnsi('Hello World')).toBe('Hello World');
    expect(stripAnsi('PAYMENT REF-2024/001')).toBe('PAYMENT REF-2024/001');
  });

  it('strips CSI color sequences', () => {
    expect(stripAnsi('\x1b[31mRed Text\x1b[0m')).toBe('Red Text');
    expect(stripAnsi('\x1b[1;32mBold Green\x1b[0m')).toBe('Bold Green');
  });

  it('strips CSI cursor movement sequences', () => {
    expect(stripAnsi('\x1b[2AMove up')).toBe('Move up');
    expect(stripAnsi('\x1b[10DMove left')).toBe('Move left');
    expect(stripAnsi('\x1b[HHome position')).toBe('Home position');
  });

  it('strips CSI clear sequences', () => {
    expect(stripAnsi('\x1b[2JClear screen')).toBe('Clear screen');
    expect(stripAnsi('\x1b[KClear line')).toBe('Clear line');
  });

  it('strips OSC window title sequences', () => {
    expect(stripAnsi('\x1b]0;Malicious Title\x07Normal text')).toBe('Normal text');
  });

  it('strips OSC hyperlink sequences', () => {
    expect(stripAnsi('\x1b]8;;http://evil.com\x07Click me\x1b]8;;\x07')).toBe('Click me');
  });

  it('strips multiple sequences in one string', () => {
    const malicious = '\x1b[31mRed\x1b[0m \x1b[2J\x1b]0;Evil\x07 Normal';
    expect(stripAnsi(malicious)).toBe('Red  Normal');
  });

  it('handles real-world MT940 content with injected sequences', () => {
    const payload = 'PAYMENT\x1b[2J\x1b[H TO SUPPLIER';
    expect(stripAnsi(payload)).toBe('PAYMENT TO SUPPLIER');
  });
});
