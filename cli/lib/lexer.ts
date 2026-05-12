/**
 * Line-Preserving MT940 Lexer
 *
 * Tokenizes MT940 content while preserving exact source positions
 * and raw text for human-readable explanation output.
 */

export interface LexerToken {
  lineNumber: number;
  rawText: string;
  tag?: string;
  tagContent?: string;
  isContinuation?: boolean;
  statementIndex?: number;
  tokenType: TokenType;
}

export type TokenType =
  | 'swift_header'      // {1:...}, {2:...}, {3:...}, {4:
  | 'swift_trailer'     // -}, {5:...}
  | 'tag'               // :XX: lines
  | 'continuation'      // Multi-line tag continuation
  | 'supplementary'     // :61: supplementary line (no tag prefix)
  | 'statement_end'     // Single dash line
  | 'empty'             // Empty or whitespace-only line
  | 'unknown';          // Unrecognized content

export interface LexerResult {
  tokens: LexerToken[];
  statementCount: number;
  lineCount: number;
}

const TAG_PATTERN = /^:(\d{2}[A-Z]?):(.*)$/;
const SWIFT_HEADER_PATTERN = /^\{[1-4]:/;
const SWIFT_TRAILER_PATTERN = /^-\}|\{5:/;

/**
 * Tokenize MT940 content preserving line numbers and raw text
 */
export function tokenize(content: string): LexerResult {
  const lines = splitLines(content);
  const tokens: LexerToken[] = [];
  let statementIndex = 0;
  let lastTag: string | undefined;
  let inStatement = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const rawText = lines[i];
    const trimmed = rawText.trim();

    // Empty line
    if (trimmed === '') {
      tokens.push({
        lineNumber,
        rawText,
        tokenType: 'empty',
        statementIndex: inStatement ? statementIndex : undefined,
      });
      continue;
    }

    // SWIFT header blocks
    if (SWIFT_HEADER_PATTERN.test(trimmed)) {
      tokens.push({
        lineNumber,
        rawText,
        tokenType: 'swift_header',
        tagContent: trimmed,
      });
      continue;
    }

    // SWIFT trailer
    if (SWIFT_TRAILER_PATTERN.test(trimmed)) {
      tokens.push({
        lineNumber,
        rawText,
        tokenType: 'swift_trailer',
        tagContent: trimmed,
      });
      continue;
    }

    // Statement end marker (single dash)
    if (trimmed === '-') {
      tokens.push({
        lineNumber,
        rawText,
        tokenType: 'statement_end',
        statementIndex,
      });
      statementIndex++;
      inStatement = false;
      lastTag = undefined;
      continue;
    }

    // Tag line (:XX:content)
    const tagMatch = rawText.match(TAG_PATTERN);
    if (tagMatch) {
      const tag = `:${tagMatch[1]}:`;
      const tagContent = tagMatch[2];

      if (tag === ':20:') {
        inStatement = true;
      }

      tokens.push({
        lineNumber,
        rawText,
        tag,
        tagContent,
        tokenType: 'tag',
        statementIndex: inStatement ? statementIndex : undefined,
      });
      lastTag = tag;
      continue;
    }

    // Check if this is a continuation of :86: or supplementary for :61:
    if (lastTag === ':61:' && !rawText.startsWith(':')) {
      // Supplementary details line after :61:
      tokens.push({
        lineNumber,
        rawText,
        tokenType: 'supplementary',
        tagContent: rawText,
        statementIndex,
      });
      lastTag = ':61:+supp'; // Mark that we've seen supplementary
      continue;
    }

    if ((lastTag === ':86:' || lastTag === ':61:+supp') && !rawText.startsWith(':')) {
      // Continuation line for :86: (multi-line narrative)
      tokens.push({
        lineNumber,
        rawText,
        tag: ':86:',
        tagContent: rawText,
        isContinuation: true,
        tokenType: 'continuation',
        statementIndex,
      });
      continue;
    }

    // Unknown line
    tokens.push({
      lineNumber,
      rawText,
      tokenType: 'unknown',
      statementIndex: inStatement ? statementIndex : undefined,
    });
  }

  return {
    tokens,
    statementCount: statementIndex + (inStatement ? 1 : 0),
    lineCount: lines.length,
  };
}

/**
 * Split content into lines, handling both CRLF and LF
 */
function splitLines(content: string): string[] {
  return content.split(/\r?\n/);
}

/**
 * Group tokens by statement
 */
export function groupByStatement(tokens: LexerToken[]): Map<number, LexerToken[]> {
  const groups = new Map<number, LexerToken[]>();

  for (const token of tokens) {
    if (token.statementIndex !== undefined) {
      if (!groups.has(token.statementIndex)) {
        groups.set(token.statementIndex, []);
      }
      groups.get(token.statementIndex)!.push(token);
    }
  }

  return groups;
}

/**
 * Get all tokens for a specific tag across all statements
 */
export function getTokensByTag(tokens: LexerToken[], tag: string): LexerToken[] {
  return tokens.filter(t => t.tag === tag);
}

/**
 * Get the full content of a multi-line tag (combines continuations)
 */
export function getFullTagContent(tokens: LexerToken[], startIndex: number): string {
  const startToken = tokens[startIndex];
  if (!startToken || startToken.tokenType !== 'tag') {
    return '';
  }

  const parts: string[] = [startToken.tagContent || ''];

  for (let i = startIndex + 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.isContinuation && token.tag === startToken.tag) {
      parts.push(token.tagContent || '');
    } else if (token.tokenType !== 'continuation') {
      break;
    }
  }

  return parts.join('\n');
}
