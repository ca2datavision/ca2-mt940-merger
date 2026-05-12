import { describe, it, expect } from 'vitest';
import {
  isSwiftWrapped,
  parseSwiftBlocks,
  extractMT940Content,
  parseSwiftContent,
  unwrapSwiftContent,
} from './swiftBlock';

const WRAPPED_CONTENT = `{1:F01BANKBEBBAXXX0000000000}{2:O9400000000000BANKBEBBAXXX00000000000000000000N}{4:
:20:STARTUMS
:25:BE12345678901234
:28C:1/1
:60F:C260501EUR1000,00
:62F:C260510EUR1500,00
-}`;

const UNWRAPPED_CONTENT = `:20:STARTUMS
:25:BE12345678901234
:28C:1/1
:60F:C260501EUR1000,00
:62F:C260510EUR1500,00
-`;

describe('isSwiftWrapped', () => {
  it('detects wrapped content', () => {
    expect(isSwiftWrapped(WRAPPED_CONTENT)).toBe(true);
  });

  it('detects unwrapped content', () => {
    expect(isSwiftWrapped(UNWRAPPED_CONTENT)).toBe(false);
  });

  it('handles whitespace', () => {
    expect(isSwiftWrapped('  {1:F01BANK...')).toBe(true);
  });
});

describe('parseSwiftBlocks', () => {
  it('extracts all blocks', () => {
    const blocks = parseSwiftBlocks(WRAPPED_CONTENT);
    expect(blocks.block1).toBe('F01BANKBEBBAXXX0000000000');
    expect(blocks.block2).toBe('O9400000000000BANKBEBBAXXX00000000000000000000N');
    expect(blocks.block4).toContain(':20:STARTUMS');
  });

  it('handles missing blocks', () => {
    const blocks = parseSwiftBlocks('{1:test}{4:content}');
    expect(blocks.block1).toBe('test');
    expect(blocks.block2).toBeUndefined();
    expect(blocks.block4).toBe('content');
  });
});

describe('extractMT940Content', () => {
  it('extracts content from block 4', () => {
    const blocks = parseSwiftBlocks(WRAPPED_CONTENT);
    const content = extractMT940Content(blocks);
    expect(content).toContain(':20:STARTUMS');
    expect(content).toContain(':25:BE12345678901234');
  });

  it('returns empty for missing block 4', () => {
    const content = extractMT940Content({});
    expect(content).toBe('');
  });
});

describe('parseSwiftContent', () => {
  it('parses wrapped content', () => {
    const result = parseSwiftContent(WRAPPED_CONTENT);
    expect(result.isWrapped).toBe(true);
    expect(result.blocks?.block1).toBeDefined();
    expect(result.mt940Content).toContain(':20:STARTUMS');
  });

  it('passes through unwrapped content', () => {
    const result = parseSwiftContent(UNWRAPPED_CONTENT);
    expect(result.isWrapped).toBe(false);
    expect(result.blocks).toBeUndefined();
    expect(result.mt940Content).toBe(UNWRAPPED_CONTENT.trim());
  });
});

describe('unwrapSwiftContent', () => {
  it('unwraps wrapped content', () => {
    const content = unwrapSwiftContent(WRAPPED_CONTENT);
    expect(content).toContain(':20:STARTUMS');
    expect(content).not.toContain('{1:');
  });

  it('returns unwrapped content unchanged', () => {
    const content = unwrapSwiftContent(UNWRAPPED_CONTENT);
    expect(content).toBe(UNWRAPPED_CONTENT.trim());
  });
});
