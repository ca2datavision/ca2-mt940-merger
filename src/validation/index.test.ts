import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { validateFileContent } from './index';

describe('validateFileContent', () => {
  it('validates single statement with correct arithmetic', () => {
    const content = `:20:STARTUMS
:25:TESTACCOUNT
:28C:1/1
:60F:C260501EUR1000,00
:61:260502C500,00N123REF1
:62F:C260510EUR1500,00
-`;
    const result = validateFileContent(content, 'file1', 'test.sta');

    expect(result.statements).toHaveLength(1);
    expect(result.issues.filter(i => i.code === 'ARITHMETIC_MISMATCH')).toHaveLength(0);
  });

  it('detects arithmetic mismatch', () => {
    const content = `:20:STARTUMS
:25:TESTACCOUNT
:28C:1/1
:60F:C260501EUR1000,00
:61:260502C500,00N123REF1
:62F:C260510EUR2000,00
-`;
    const result = validateFileContent(content, 'file1', 'test.sta');

    const arithmeticIssues = result.issues.filter(i => i.code === 'ARITHMETIC_MISMATCH');
    expect(arithmeticIssues).toHaveLength(1);
  });

  it('validates multi-statement file with separate arithmetic per statement', () => {
    const content = `:20:STARTUMS
:25:ACCOUNT1
:28C:1/1
:60F:C260501EUR1000,00
:61:260502C200,00N123TXN1
:62F:C260510EUR1200,00
-
:20:STARTUMS
:25:ACCOUNT1
:28C:2/1
:60F:C260510EUR1200,00
:61:260512D100,00N123TXN2
:62F:C260520EUR1100,00
-`;
    const result = validateFileContent(content, 'file1', 'test.sta');

    expect(result.statements).toHaveLength(2);
    const arithmeticIssues = result.issues.filter(i => i.code === 'ARITHMETIC_MISMATCH');
    expect(arithmeticIssues).toHaveLength(0);

    expect(result.statements[0].transactions).toHaveLength(1);
    expect(result.statements[0].transactions[0].amount.equals(new Decimal('200'))).toBe(true);

    expect(result.statements[1].transactions).toHaveLength(1);
    expect(result.statements[1].transactions[0].amount.equals(new Decimal('100'))).toBe(true);
  });

  it('catches arithmetic error in specific statement of multi-statement file', () => {
    const content = `:20:STARTUMS
:25:ACCOUNT1
:28C:1/1
:60F:C260501EUR1000,00
:61:260502C200,00N123TXN1
:62F:C260510EUR1200,00
-
:20:STARTUMS
:25:ACCOUNT1
:28C:2/1
:60F:C260510EUR1200,00
:61:260512D100,00N123TXN2
:62F:C260520EUR5000,00
-`;
    const result = validateFileContent(content, 'file1', 'test.sta');

    expect(result.statements).toHaveLength(2);
    const arithmeticIssues = result.issues.filter(i => i.code === 'ARITHMETIC_MISMATCH');
    expect(arithmeticIssues).toHaveLength(1);
    expect(arithmeticIssues[0].statementIndex).toBe(1);
  });

  it('groups transactions correctly with multiple transactions per statement', () => {
    const content = `:20:STARTUMS
:25:ACCOUNT1
:28C:1/1
:60F:C260501EUR1000,00
:61:260502C100,00N123TXN1
:61:260503C200,00N123TXN2
:61:260504D50,00N123TXN3
:62F:C260510EUR1250,00
-`;
    const result = validateFileContent(content, 'file1', 'test.sta');

    expect(result.statements).toHaveLength(1);
    expect(result.statements[0].transactions).toHaveLength(3);
    const arithmeticIssues = result.issues.filter(i => i.code === 'ARITHMETIC_MISMATCH');
    expect(arithmeticIssues).toHaveLength(0);
  });

  it('excludes malformed transactions from arithmetic', () => {
    const content = `:20:STARTUMS
:25:ACCOUNT1
:28C:1/1
:60F:C260501EUR1000,00
:61:260502C200,00N123VALID
:61:MALFORMED
:62F:C260510EUR1200,00
-`;
    const result = validateFileContent(content, 'file1', 'test.sta');

    expect(result.statements).toHaveLength(1);
    // Only valid transaction should be included (malformed excluded)
    expect(result.statements[0].transactions).toHaveLength(1);
    // Arithmetic should be correct (1000 + 200 = 1200)
    const arithmeticIssues = result.issues.filter(i => i.code === 'ARITHMETIC_MISMATCH');
    expect(arithmeticIssues).toHaveLength(0);
  });

  it('reports malformed :61: as issue but excludes from statement transactions', () => {
    const content = `:20:STARTUMS
:25:ACCOUNT1
:28C:1/1
:60F:C260501EUR1000,00
:61:BADLINE
:62F:C260510EUR1000,00
-`;
    const result = validateFileContent(content, 'file1', 'test.sta');

    // Malformed line should generate an issue
    const malformedIssues = result.issues.filter(i => i.code === 'TXN_MALFORMED_61');
    expect(malformedIssues.length).toBeGreaterThan(0);

    // But no transactions should be in the statement
    expect(result.statements[0].transactions).toHaveLength(0);
    // Arithmetic should pass (1000 + 0 = 1000)
    const arithmeticIssues = result.issues.filter(i => i.code === 'ARITHMETIC_MISMATCH');
    expect(arithmeticIssues).toHaveLength(0);
  });
});
