/**
 * Unit tests for Line-Preserving MT940 Lexer
 */

import { describe, it, expect } from 'vitest';
import {
  tokenize,
  groupByStatement,
  getTokensByTag,
  getFullTagContent,
} from './lexer.js';

describe('MT940 Lexer', () => {
  describe('tokenize', () => {
    it('parses basic tag lines', () => {
      const content = ':20:STATEMENT001\n:25:NL91ABNA0417164300\n:28C:123/1';
      const result = tokenize(content);

      expect(result.tokens).toHaveLength(3);
      expect(result.tokens[0]).toMatchObject({
        lineNumber: 1,
        rawText: ':20:STATEMENT001',
        tag: ':20:',
        tagContent: 'STATEMENT001',
        tokenType: 'tag',
      });
      expect(result.tokens[1]).toMatchObject({
        lineNumber: 2,
        tag: ':25:',
        tagContent: 'NL91ABNA0417164300',
        tokenType: 'tag',
      });
      expect(result.tokens[2]).toMatchObject({
        lineNumber: 3,
        tag: ':28C:',
        tagContent: '123/1',
        tokenType: 'tag',
      });
    });

    it('handles SWIFT header blocks', () => {
      const content = '{1:F01BANKBEBB0000000000}\n{2:I940BANKBEBBXXX}\n{4:\n:20:REF';
      const result = tokenize(content);

      expect(result.tokens[0]).toMatchObject({
        lineNumber: 1,
        tokenType: 'swift_header',
        tagContent: '{1:F01BANKBEBB0000000000}',
      });
      expect(result.tokens[1]).toMatchObject({
        lineNumber: 2,
        tokenType: 'swift_header',
      });
      expect(result.tokens[2]).toMatchObject({
        lineNumber: 3,
        tokenType: 'swift_header',
      });
    });

    it('handles SWIFT trailer blocks', () => {
      const content = ':62F:C260505EUR1000,00\n-}\n{5:CHK123}';
      const result = tokenize(content);

      expect(result.tokens[1]).toMatchObject({
        lineNumber: 2,
        tokenType: 'swift_trailer',
        tagContent: '-}',
      });
      expect(result.tokens[2]).toMatchObject({
        lineNumber: 3,
        tokenType: 'swift_trailer',
        tagContent: '{5:CHK123}',
      });
    });

    it('handles statement end markers', () => {
      const content = ':20:STMT1\n:62F:C260505EUR100,00\n-\n:20:STMT2\n:62F:C260506EUR200,00\n-';
      const result = tokenize(content);

      expect(result.statementCount).toBe(2);

      const endMarkers = result.tokens.filter(t => t.tokenType === 'statement_end');
      expect(endMarkers).toHaveLength(2);
      expect(endMarkers[0].statementIndex).toBe(0);
      expect(endMarkers[1].statementIndex).toBe(1);
    });

    it('handles empty lines', () => {
      const content = ':20:REF\n\n:25:ACCT';
      const result = tokenize(content);

      expect(result.tokens[1]).toMatchObject({
        lineNumber: 2,
        rawText: '',
        tokenType: 'empty',
      });
    });

    it('handles :61: supplementary lines', () => {
      const content = ':61:2605050505C100,00NTRFREF123\nSUPPLEMENTARY INFO';
      const result = tokenize(content);

      expect(result.tokens[0]).toMatchObject({
        lineNumber: 1,
        tag: ':61:',
        tokenType: 'tag',
      });
      expect(result.tokens[1]).toMatchObject({
        lineNumber: 2,
        rawText: 'SUPPLEMENTARY INFO',
        tokenType: 'supplementary',
        tagContent: 'SUPPLEMENTARY INFO',
      });
    });

    it('handles multi-line :86: narrative', () => {
      const content = ':86:First line of narrative\nSecond line continues\nThird line too';
      const result = tokenize(content);

      expect(result.tokens[0]).toMatchObject({
        lineNumber: 1,
        tag: ':86:',
        tagContent: 'First line of narrative',
        tokenType: 'tag',
      });
      expect(result.tokens[1]).toMatchObject({
        lineNumber: 2,
        tag: ':86:',
        tagContent: 'Second line continues',
        isContinuation: true,
        tokenType: 'continuation',
      });
      expect(result.tokens[2]).toMatchObject({
        lineNumber: 3,
        tag: ':86:',
        tagContent: 'Third line too',
        isContinuation: true,
        tokenType: 'continuation',
      });
    });

    it('handles :86: after :61: supplementary', () => {
      const content = ':61:2605050505C100,00NTRFREF\nSUPP LINE\n:86:Narrative here';
      const result = tokenize(content);

      expect(result.tokens[0].tokenType).toBe('tag');
      expect(result.tokens[0].tag).toBe(':61:');
      expect(result.tokens[1].tokenType).toBe('supplementary');
      expect(result.tokens[2].tokenType).toBe('tag');
      expect(result.tokens[2].tag).toBe(':86:');
    });

    it('tracks statement indices correctly', () => {
      const content = ':20:STMT1\n:25:ACCT1\n-\n:20:STMT2\n:25:ACCT2\n-';
      const result = tokenize(content);

      const stmt1Tokens = result.tokens.filter(t => t.statementIndex === 0);
      const stmt2Tokens = result.tokens.filter(t => t.statementIndex === 1);

      expect(stmt1Tokens).toHaveLength(3);
      expect(stmt2Tokens).toHaveLength(3);
    });

    it('handles CRLF line endings', () => {
      const content = ':20:REF\r\n:25:ACCT\r\n-';
      const result = tokenize(content);

      expect(result.lineCount).toBe(3);
      expect(result.tokens).toHaveLength(3);
    });

    it('marks unknown lines', () => {
      const content = ':20:REF\nRANDOM TEXT WITHOUT TAG\n:25:ACCT';
      const result = tokenize(content);

      expect(result.tokens[1]).toMatchObject({
        lineNumber: 2,
        rawText: 'RANDOM TEXT WITHOUT TAG',
        tokenType: 'unknown',
      });
    });

    it('returns correct line count', () => {
      const content = 'line1\nline2\nline3\nline4';
      const result = tokenize(content);
      expect(result.lineCount).toBe(4);
    });
  });

  describe('groupByStatement', () => {
    it('groups tokens by statement index', () => {
      const content = ':20:STMT1\n:25:ACCT1\n-\n:20:STMT2\n:25:ACCT2\n-';
      const { tokens } = tokenize(content);
      const groups = groupByStatement(tokens);

      expect(groups.size).toBe(2);
      expect(groups.get(0)).toHaveLength(3);
      expect(groups.get(1)).toHaveLength(3);
    });

    it('excludes tokens without statement index', () => {
      const content = '{1:HEADER}\n:20:REF\n-';
      const { tokens } = tokenize(content);
      const groups = groupByStatement(tokens);

      expect(groups.size).toBe(1);
      const group0 = groups.get(0)!;
      expect(group0.every(t => t.statementIndex === 0)).toBe(true);
    });
  });

  describe('getTokensByTag', () => {
    it('filters tokens by tag', () => {
      const content = ':20:STMT1\n:25:ACCT1\n:61:TX1\n-\n:20:STMT2\n:25:ACCT2\n:61:TX2\n-';
      const { tokens } = tokenize(content);

      const tag20Tokens = getTokensByTag(tokens, ':20:');
      const tag61Tokens = getTokensByTag(tokens, ':61:');

      expect(tag20Tokens).toHaveLength(2);
      expect(tag61Tokens).toHaveLength(2);
    });

    it('returns empty array when tag not found', () => {
      const content = ':20:REF\n:25:ACCT';
      const { tokens } = tokenize(content);

      const result = getTokensByTag(tokens, ':99:');
      expect(result).toEqual([]);
    });
  });

  describe('getFullTagContent', () => {
    it('returns single line content for non-continuation tags', () => {
      const content = ':20:STATEMENT_REF\n:25:ACCOUNT123';
      const { tokens } = tokenize(content);

      const fullContent = getFullTagContent(tokens, 0);
      expect(fullContent).toBe('STATEMENT_REF');
    });

    it('combines multi-line :86: content', () => {
      const content = ':86:Line one\nLine two\nLine three\n:20:NEXT';
      const { tokens } = tokenize(content);

      const fullContent = getFullTagContent(tokens, 0);
      expect(fullContent).toBe('Line one\nLine two\nLine three');
    });

    it('returns empty string for non-tag token', () => {
      const content = '\n:20:REF';
      const { tokens } = tokenize(content);

      const fullContent = getFullTagContent(tokens, 0);
      expect(fullContent).toBe('');
    });

    it('handles out of bounds index', () => {
      const content = ':20:REF';
      const { tokens } = tokenize(content);

      const fullContent = getFullTagContent(tokens, 100);
      expect(fullContent).toBe('');
    });
  });

  describe('complete MT940 statement', () => {
    it('parses a full MT940 statement correctly', () => {
      const mt940 = `{1:F01BANKBEBB0000000000}
{2:I940BANKBEBBXXX}
{4:
:20:STMT260505
:25:NL91ABNA0417164300
:28C:123/1
:60F:C260504EUR5000,00
:61:2605050505C100,00NTRFPAYMENT001
EXTRA INFO LINE
:86:Payment from Customer ABC
Additional narrative line
:62F:C260505EUR5100,00
-}`;

      const result = tokenize(mt940);

      expect(result.statementCount).toBe(1);

      const tagTypes = result.tokens.map(t => t.tokenType);
      expect(tagTypes).toContain('swift_header');
      expect(tagTypes).toContain('tag');
      expect(tagTypes).toContain('supplementary');
      expect(tagTypes).toContain('continuation');
      expect(tagTypes).toContain('swift_trailer');

      const tags = result.tokens.filter(t => t.tag).map(t => t.tag);
      expect(tags).toContain(':20:');
      expect(tags).toContain(':25:');
      expect(tags).toContain(':28C:');
      expect(tags).toContain(':60F:');
      expect(tags).toContain(':61:');
      expect(tags).toContain(':86:');
      expect(tags).toContain(':62F:');
    });
  });
});
