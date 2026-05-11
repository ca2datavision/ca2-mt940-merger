/**
 * SWIFT Block Wrapper Parser
 * Handles both wrapped ({1:...}{2:...}{4:...}) and unwrapped MT940 formats.
 */

export interface SwiftBlocks {
  block1?: string;
  block2?: string;
  block3?: string;
  block4?: string;
  block5?: string;
}

export interface SwiftParseResult {
  isWrapped: boolean;
  blocks?: SwiftBlocks;
  mt940Content: string;
}

const BLOCK_PATTERN = /\{(\d):([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
const SWIFT_WRAPPER_INDICATOR = /^\s*\{1:/;

export function isSwiftWrapped(content: string): boolean {
  return SWIFT_WRAPPER_INDICATOR.test(content);
}

export function parseSwiftBlocks(content: string): SwiftBlocks {
  const blocks: SwiftBlocks = {};
  let match: RegExpExecArray | null;

  BLOCK_PATTERN.lastIndex = 0;
  while ((match = BLOCK_PATTERN.exec(content)) !== null) {
    const blockNum = match[1];
    const blockContent = match[2];

    switch (blockNum) {
      case '1':
        blocks.block1 = blockContent;
        break;
      case '2':
        blocks.block2 = blockContent;
        break;
      case '3':
        blocks.block3 = blockContent;
        break;
      case '4':
        blocks.block4 = blockContent;
        break;
      case '5':
        blocks.block5 = blockContent;
        break;
    }
  }

  return blocks;
}

export function extractMT940Content(blocks: SwiftBlocks): string {
  if (!blocks.block4) {
    return '';
  }

  let content = blocks.block4;

  if (content.startsWith('\r\n')) {
    content = content.slice(2);
  } else if (content.startsWith('\n')) {
    content = content.slice(1);
  }

  if (content.endsWith('-}')) {
    content = content.slice(0, -2) + '-';
  } else if (content.endsWith('-\r\n')) {
    content = content.slice(0, -3) + '-';
  } else if (content.endsWith('-\n')) {
    content = content.slice(0, -2) + '-';
  }

  return content.trim();
}

export function parseSwiftContent(content: string): SwiftParseResult {
  const trimmed = content.trim();

  if (!isSwiftWrapped(trimmed)) {
    return {
      isWrapped: false,
      mt940Content: trimmed,
    };
  }

  const blocks = parseSwiftBlocks(trimmed);
  const mt940Content = extractMT940Content(blocks);

  return {
    isWrapped: true,
    blocks,
    mt940Content: mt940Content || trimmed,
  };
}

export function unwrapSwiftContent(content: string): string {
  const result = parseSwiftContent(content);
  return result.mt940Content;
}
