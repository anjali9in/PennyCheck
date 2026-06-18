/// <reference types="jest" />
/* eslint-disable import/first */

jest.mock('@/features/accounts/localFinanceRepository', () => ({
  hasLocalDuplicate: jest.fn().mockResolvedValue(false),
}));

import { LocalAccount, LocalCategory } from '@/types/domain';
import { previewCsvImport } from './importCsv';

const account: LocalAccount = {
  id: 'account-1',
  name: 'Savings',
  type: 'SAVINGS',
  currentBalanceMinor: '0',
  openingBalanceMinor: '0',
  currency: 'INR',
  archived: false,
  updatedAt: '2026-06-18T00:00:00.000Z',
};

const categories: LocalCategory[] = [
  { id: 'food', name: 'Food & Dining', type: 'EXPENSE', systemCategory: true },
  { id: 'salary', name: 'Salary Income', type: 'INCOME', systemCategory: true },
];

describe('previewCsvImport', () => {
  it('normalizes UPI debit rows and suggests categories', async () => {
    const rows = await previewCsvImport({
      account,
      categories,
      csv: 'Date,Narration,Debit,Credit,Reference\n12/06/2026,UPI-SWIGGY-123456,650.00,,UTR1',
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].merchant).toBe('SWIGGY');
    expect(rows[0].amountMinor).toBe('65000');
    expect(rows[0].direction).toBe('DEBIT');
    expect(rows[0].categoryId).toBe('food');
  });
});
