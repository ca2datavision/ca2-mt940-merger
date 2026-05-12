import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { parseForwardBalances, applyReversalLogic } from './forwardBalance';

describe('parseForwardBalances', () => {
  it('parses valid :65: tag', () => {
    const content = `:65:C230115EUR1500,00`;
    const { balances, issues } = parseForwardBalances(content);

    expect(issues).toHaveLength(0);
    expect(balances).toHaveLength(1);
    expect(balances[0].date).toBe('2023-01-15');
    expect(balances[0].currency).toBe('EUR');
    expect(balances[0].amount.equals(new Decimal('1500'))).toBe(true);
    expect(balances[0].isCredit).toBe(true);
  });

  it('parses debit balance', () => {
    const content = `:65:D230115USD500,00`;
    const { balances } = parseForwardBalances(content);

    expect(balances).toHaveLength(1);
    expect(balances[0].isCredit).toBe(false);
    expect(balances[0].currency).toBe('USD');
  });

  it('parses multiple :65: tags', () => {
    const content = `:65:C230115EUR1000,00
:65:C230116EUR1100,00
:65:C230117EUR1200,00`;
    const { balances } = parseForwardBalances(content);

    expect(balances).toHaveLength(3);
  });

  it('reports malformed :65: tags', () => {
    const content = `:65:INVALID`;
    const { issues } = parseForwardBalances(content);

    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('BAL_MALFORMED_65');
  });

  it('reports line numbers', () => {
    const content = `Some text
:65:C230115EUR1000,00`;
    const { balances } = parseForwardBalances(content);

    expect(balances[0].lineNumber).toBe(2);
  });

  it('handles empty content', () => {
    const { balances, issues } = parseForwardBalances('');
    expect(balances).toHaveLength(0);
    expect(issues).toHaveLength(0);
  });
});

describe('applyReversalLogic', () => {
  const amount = new Decimal('100');

  it('returns positive for credit', () => {
    const result = applyReversalLogic(amount, true, false);
    expect(result.equals(new Decimal('100'))).toBe(true);
  });

  it('returns negative for debit', () => {
    const result = applyReversalLogic(amount, false, false);
    expect(result.equals(new Decimal('-100'))).toBe(true);
  });

  it('flips sign for reversal credit (RC)', () => {
    const result = applyReversalLogic(amount, true, true);
    expect(result.equals(new Decimal('-100'))).toBe(true);
  });

  it('flips sign for reversal debit (RD)', () => {
    const result = applyReversalLogic(amount, false, true);
    expect(result.equals(new Decimal('100'))).toBe(true);
  });
});
