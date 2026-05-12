import { describe, it, expect } from 'vitest';
import {
  decodeTag20,
  decodeTag21,
  decodeTag25,
  decodeTag28C,
  decodeTag60F,
  decodeTag61,
  decodeTag62F,
  decodeTag64,
  decodeTag65,
  decodeTag86,
  decodeTag,
  parseLines,
  validateStatement,
  type DecodedTransaction,
  type DecodedBalance,
} from './decoder.js';

describe('Tag 20 - Transaction Reference', () => {
  it('decodes valid reference', () => {
    const result = decodeTag20('STARTUMS');
    expect(result.tag).toBe('20');
    expect(result.tagName).toBe('Transaction Reference Number');
    expect(result.fields.reference).toBe('STARTUMS');
    expect(result.issues).toHaveLength(0);
  });

  it('warns on reference exceeding 16 chars', () => {
    const result = decodeTag20('12345678901234567890');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe('warning');
    expect(result.issues[0].message).toContain('exceeds 16');
  });

  it('errors on empty reference', () => {
    const result = decodeTag20('');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe('error');
  });
});

describe('Tag 21 - Related Reference', () => {
  it('decodes valid reference', () => {
    const result = decodeTag21('RELREF001');
    expect(result.tag).toBe('21');
    expect(result.fields.reference).toBe('RELREF001');
    expect(result.issues).toHaveLength(0);
  });
});

describe('Tag 25 - Account Identification', () => {
  it('decodes simple account ID', () => {
    const result = decodeTag25('RO49AAAA1B31007593840000');
    expect(result.tag).toBe('25');
    expect(result.fields.accountId).toBe('RO49AAAA1B31007593840000');
    expect(result.humanDescription).toContain('Account:');
  });

  it('errors on empty account', () => {
    const result = decodeTag25('');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe('error');
  });
});

describe('Tag 28C - Statement Number/Sequence', () => {
  it('decodes statement number only', () => {
    const result = decodeTag28C('123');
    expect(result.tag).toBe('28C');
    expect(result.fields.statementNumber).toBe('123');
    expect(result.fields.sequenceNumber).toBeUndefined();
    expect(result.humanDescription).toContain('Statement 123');
  });

  it('decodes statement and sequence', () => {
    const result = decodeTag28C('123/456');
    expect(result.fields.statementNumber).toBe('123');
    expect(result.fields.sequenceNumber).toBe('456');
    expect(result.humanDescription).toContain('Sequence 456');
  });

  it('errors on invalid format', () => {
    const result = decodeTag28C('ABC');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe('error');
  });
});

describe('Tag 60F - Opening Balance', () => {
  it('decodes credit balance', () => {
    const result = decodeTag60F('C240101EUR1000,50');
    expect(result.tag).toBe('60F');
    const fields = result.fields as DecodedBalance;
    expect(fields.isDebit).toBe(false);
    expect(fields.currency).toBe('EUR');
    expect(fields.amount).toBe('1000,50');
    expect(fields.amountNumeric).toBe(1000.50);
    expect(fields.date).toBe('2024-01-01');
    expect(result.humanDescription).toContain('Credit');
    expect(result.issues).toHaveLength(0);
  });

  it('decodes debit balance', () => {
    const result = decodeTag60F('D240315USD500,00');
    const fields = result.fields as DecodedBalance;
    expect(fields.isDebit).toBe(true);
    expect(fields.currency).toBe('USD');
    expect(fields.amountNumeric).toBe(500);
    expect(result.humanDescription).toContain('Debit');
  });

  it('handles Y2K dates correctly (00-49 = 2000s)', () => {
    const result = decodeTag60F('C240101EUR100,00');
    const fields = result.fields as DecodedBalance;
    expect(fields.date).toBe('2024-01-01');
  });

  it('handles Y2K dates correctly (50-99 = 1900s)', () => {
    const result = decodeTag60F('C991231EUR100,00');
    const fields = result.fields as DecodedBalance;
    expect(fields.date).toBe('1999-12-31');
  });

  it('errors on invalid format', () => {
    const result = decodeTag60F('INVALID');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe('error');
  });
});

describe('Tag 61 - Statement Line (Transaction)', () => {
  it('decodes full transaction with all fields', () => {
    const result = decodeTag61('2401150115D1234,56NTRFREF001//BANK123');
    expect(result.tag).toBe('61');
    const fields = result.fields as DecodedTransaction;
    expect(fields.valueDate).toBe('2024-01-15');
    expect(fields.entryDate).toBe('2024-01-15');
    expect(fields.isDebit).toBe(true);
    expect(fields.isReversal).toBe(false);
    expect(fields.amount).toBe('1234,56');
    expect(fields.amountNumeric).toBe(1234.56);
    expect(fields.transactionType.code).toBe('TRF');
    expect(fields.transactionType.name).toBe('Transfer');
    expect(fields.customerReference).toBe('REF001');
    expect(fields.bankReference).toBe('BANK123');
    expect(result.issues).toHaveLength(0);
  });

  it('decodes credit transaction', () => {
    const result = decodeTag61('240215C500,00NMSCPAY001');
    const fields = result.fields as DecodedTransaction;
    expect(fields.isDebit).toBe(false);
    expect(fields.amount).toBe('500,00');
    expect(result.humanDescription).toContain('Credit');
  });

  it('decodes reversal debit (RD)', () => {
    const result = decodeTag61('240315RD100,00NTRFREV001');
    const fields = result.fields as DecodedTransaction;
    expect(fields.isDebit).toBe(true);
    expect(fields.isReversal).toBe(true);
    expect(result.humanDescription).toContain('Reversal');
  });

  it('decodes reversal credit (RC)', () => {
    const result = decodeTag61('240315RC200,00NTRFREV002');
    const fields = result.fields as DecodedTransaction;
    expect(fields.isDebit).toBe(false);
    expect(fields.isReversal).toBe(true);
  });

  it('decodes transaction without entry date', () => {
    const result = decodeTag61('240415C1000,00NCHKCHECK01');
    const fields = result.fields as DecodedTransaction;
    expect(fields.valueDate).toBe('2024-04-15');
    expect(fields.entryDate).toBeUndefined();
  });

  it('decodes transaction with supplementary line', () => {
    const result = decodeTag61('240515D250,00NTRFPAY123', 'PLATA ZILIER');
    const fields = result.fields as DecodedTransaction;
    expect(fields.supplementary).toBe('PLATA ZILIER');
    expect(result.humanDescription).toContain('Supplementary');
  });

  it('warns on unknown transaction type', () => {
    const result = decodeTag61('240615C100,00NXYZUNK001');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe('warning');
    expect(result.issues[0].message).toContain('Unknown transaction type');
  });

  it('errors on invalid format', () => {
    const result = decodeTag61('INVALID');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe('error');
  });

  it('decodes transaction with funds code', () => {
    const result = decodeTag61('2407150715CA500,00NTRFREF001');
    const fields = result.fields as DecodedTransaction;
    expect(fields.fundsCode).toBe('A');
    expect(fields.amountNumeric).toBe(500);
  });
});

describe('Tag 62F - Closing Balance', () => {
  it('decodes closing balance', () => {
    const result = decodeTag62F('C240131EUR2500,00');
    expect(result.tag).toBe('62F');
    const fields = result.fields as DecodedBalance;
    expect(fields.isDebit).toBe(false);
    expect(fields.amountNumeric).toBe(2500);
  });
});

describe('Tag 64 - Closing Available Balance', () => {
  it('decodes available balance', () => {
    const result = decodeTag64('C240131EUR2400,00');
    expect(result.tag).toBe('64');
    expect(result.tagName).toBe('Closing Available Balance');
  });
});

describe('Tag 65 - Forward Available Balance', () => {
  it('decodes forward balance', () => {
    const result = decodeTag65('C240201EUR2300,00');
    expect(result.tag).toBe('65');
    expect(result.tagName).toBe('Forward Available Balance');
  });
});

describe('Tag 86 - Information to Account Owner', () => {
  it('decodes unstructured narrative', () => {
    const result = decodeTag86('Payment for services rendered');
    expect(result.tag).toBe('86');
    expect(result.fields.hasSubfields).toBe(false);
    expect(result.humanDescription).toContain('Narrative');
  });

  it('decodes structured narrative with subfields', () => {
    const result = decodeTag86('000+20PAYREF001+32JOHN DOE+23Additional info');
    expect(result.fields.hasSubfields).toBe(true);
    const subfields = result.fields.subfields as Record<string, string>;
    expect(subfields['20']).toBe('PAYREF001');
    expect(subfields['32']).toBe('JOHN DOE');
    expect(subfields['23']).toBe('Additional info');
    expect(result.humanDescription).toContain('Ref: PAYREF001');
    expect(result.humanDescription).toContain('Beneficiary: JOHN DOE');
  });

  it('truncates long narrative in description', () => {
    const longText = 'A'.repeat(200);
    const result = decodeTag86(longText);
    expect(result.humanDescription).toContain('...');
  });
});

describe('Generic decodeTag function', () => {
  it('routes to correct decoder', () => {
    expect(decodeTag('20', 'REF001').tag).toBe('20');
    expect(decodeTag('25', 'ACC123').tag).toBe('25');
    expect(decodeTag('60F', 'C240101EUR100,00').tag).toBe('60F');
  });

  it('handles unknown tags', () => {
    const result = decodeTag('99', 'unknown');
    expect(result.tagName).toContain('Unknown');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe('info');
  });
});

describe('parseLines', () => {
  it('parses MT940 content into structured lines', () => {
    const content = `:20:STARTUMS
:25:RO49AAAA1B31007593840000
:28C:1/1
:60F:C240101EUR1000,00
:61:240115D100,00NTRFREF001
:86:Payment description
:62F:C240131EUR900,00
-`;

    const lines = parseLines(content);
    expect(lines.length).toBe(8);

    const tagLines = lines.filter(l => l.isTagLine);
    expect(tagLines).toHaveLength(7);

    expect(lines[7].isStatementSeparator).toBe(true);
  });

  it('identifies continuation lines', () => {
    const content = `:61:240115D100,00NTRFREF001
SUPPLEMENTARY DETAILS
:86:Description`;

    const lines = parseLines(content);
    expect(lines[1].isContinuation).toBe(true);
  });
});

describe('validateStatement', () => {
  it('detects missing required tags', () => {
    const content = `:25:ACC123
:60F:C240101EUR100,00`;

    const lines = parseLines(content);
    const issues = validateStatement(lines);

    const missingTags = issues.filter(i => i.message.includes('Missing'));
    expect(missingTags.length).toBeGreaterThan(0);
    expect(issues.some(i => i.message.includes(':20:'))).toBe(true);
  });

  it('collects issues from all decoded tags', () => {
    const content = `:20:
:25:ACC123
:60F:C240101EUR100,00
:61:INVALID
:62F:C240131EUR100,00`;

    const lines = parseLines(content);
    const issues = validateStatement(lines);

    expect(issues.some(i => i.severity === 'error')).toBe(true);
  });

  it('passes for valid statement', () => {
    const content = `:20:STARTUMS
:25:ACC123
:60F:C240101EUR100,00
:62F:C240131EUR100,00`;

    const lines = parseLines(content);
    const issues = validateStatement(lines);

    const errors = issues.filter(i => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });
});
