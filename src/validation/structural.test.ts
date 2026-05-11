import { describe, it, expect } from 'vitest';
import { validateStructure } from './structural';

describe('validateStructure', () => {
  const validStatement = `:20:REFERENCE123
:25:ACCOUNT123
:28C:1/1
:60F:C230101EUR1000,00
:62F:C230131EUR1500,00`;

  it('accepts valid MT940 structure', () => {
    const issues = validateStructure(validStatement);
    const errors = issues.filter(i => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('detects missing :25: tag', () => {
    const content = `:20:REF123
:28C:1/1
:60F:C230101EUR1000,00
:62F:C230131EUR1500,00`;

    const issues = validateStructure(content);
    expect(issues.some(i => i.code === 'STRUCT_MISSING_25')).toBe(true);
  });

  it('detects missing :28C:/:28: tag', () => {
    const content = `:20:REF123
:25:ACCOUNT
:60F:C230101EUR1000,00
:62F:C230131EUR1500,00`;

    const issues = validateStructure(content);
    expect(issues.some(i => i.code === 'STRUCT_MISSING_28')).toBe(true);
  });

  it('warns for non-standard :28: instead of :28C:', () => {
    const content = `:20:REF123
:25:ACCOUNT
:28:1/1
:60F:C230101EUR1000,00
:62F:C230131EUR1500,00`;

    const issues = validateStructure(content);
    const warning = issues.find(i => i.code === 'STRUCT_28_NONSTANDARD');
    expect(warning).toBeDefined();
    expect(warning?.severity).toBe('warning');
  });

  it('detects missing :60F:/:60M: tag', () => {
    const content = `:20:REF123
:25:ACCOUNT
:28C:1/1
:62F:C230131EUR1500,00`;

    const issues = validateStructure(content);
    expect(issues.some(i => i.code === 'STRUCT_MISSING_60')).toBe(true);
  });

  it('detects missing :62F:/:62M: tag', () => {
    const content = `:20:REF123
:25:ACCOUNT
:28C:1/1
:60F:C230101EUR1000,00`;

    const issues = validateStructure(content);
    expect(issues.some(i => i.code === 'STRUCT_MISSING_62')).toBe(true);
  });

  it('reports line numbers for issues', () => {
    const content = `:20:REF123
:28C:1/1
:60F:C230101EUR1000,00
:62F:C230131EUR1500,00`;

    const issues = validateStructure(content);
    const issue = issues.find(i => i.code === 'STRUCT_MISSING_25');
    expect(issue?.lineNumber).toBe(1);
  });

  it('detects no tags in file', () => {
    const content = 'Just some random text without any MT940 tags';
    const issues = validateStructure(content);
    expect(issues.some(i => i.code === 'STRUCT_NO_TAGS')).toBe(true);
  });

  it('handles multiple statements', () => {
    const content = `:20:REF1
:25:ACC1
:28C:1/1
:60F:C230101EUR1000,00
:62F:C230131EUR1500,00
:20:REF2
:25:ACC2
:28C:2/1
:60F:C230201EUR1500,00
:62F:C230228EUR2000,00`;

    const issues = validateStructure(content);
    const errors = issues.filter(i => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });
});
