/// <reference types="jest" />

import { LocalAccount, LocalTransaction } from '@/types/domain';
import { calculateCashflowMinor, calculateNetWorthMinor } from './reportsMath';

describe('reports math', () => {
  it('calculates net worth from accounts, investments, credit cards and loans', () => {
    const netWorth = calculateNetWorthMinor({
      accounts: [
        account('cash', 'SAVINGS', '100000'),
        account('card', 'CREDIT_CARD', '15000'),
      ],
      investments: [{
        id: 'inv',
        name: 'Fund',
        type: 'OTHER',
        investedAmountMinor: '50000',
        currentValueMinor: '60000',
        currency: 'INR',
      }],
      loans: [{
        id: 'loan',
        name: 'Loan',
        principalMinor: '100000',
        outstandingPrincipalMinor: '80000',
        annualInterestRate: 8,
        tenureMonths: 12,
        emiAmountMinor: '9000',
        startDate: '2026-01-01',
      }],
    });

    expect(netWorth).toBe('65000');
  });

  it('excludes transfers from cashflow', () => {
    const cashflow = calculateCashflowMinor([
      transaction('income', 'INCOME', 'CREDIT', '100000'),
      transaction('expense', 'EXPENSE', 'DEBIT', '25000'),
      transaction('transfer', 'TRANSFER', 'DEBIT', '50000'),
    ]);

    expect(String(cashflow.income)).toBe('100000');
    expect(String(cashflow.expense)).toBe('25000');
  });
});

function account(id: string, type: 'SAVINGS' | 'CREDIT_CARD', currentBalanceMinor: string): LocalAccount {
  return {
    id,
    name: id,
    type,
    currentBalanceMinor,
    openingBalanceMinor: '0',
    currency: 'INR',
    archived: false,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function transaction(
  id: string,
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER',
  direction: 'CREDIT' | 'DEBIT',
  amountMinor: string,
): LocalTransaction {
  return {
    id,
    accountId: 'cash',
    type,
    direction,
    amountMinor,
    currency: 'INR',
    occurredAt: '2026-01-01T00:00:00.000Z',
    status: 'CLEARED',
    source: 'MANUAL',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}
