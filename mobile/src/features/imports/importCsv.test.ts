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

  it('parses fixed-width HDFC text statement rows', async () => {
    const statement = `
Date      Narration				    Chq./Ref.No.      Value Dt  Withdrawal Amt.        Deposit Amt.     Closing Balance
--------  ----------------------------------------  ----------------  --------  ------------------  ------------------  ------------------

05/06/26  UPI-AMAZON INDIA-AMAZONUPI@APL-UTIB00001  0000615634135629  05/06/26             654.00                              71,237.00
          00-615634135629-REQUEST FROM AMAZO
                                                                         Account Branch : ANSALS ARCADE SECTOR 18 NOIDA
13/06/26  UPI-ALEKHYA  KATAKAM-ALEKHYAKATAKAM24@AX  0000724576871461  13/06/26                             19,800.00           53,127.00
          L-SBIN0020120-724576871461-PAYMENT FROM PHONE
`;

    const rows = await previewCsvImport({ account, categories, csv: statement });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      merchant: 'AMAZON INDIA',
      amountMinor: '65400',
      direction: 'DEBIT',
      referenceNumber: '0000615634135629',
    });
    expect(rows[0].narration).toContain('REQUEST FROM AMAZO');
    expect(rows[0].narration).not.toContain('Account Branch');
    expect(rows[1]).toMatchObject({
      amountMinor: '1980000',
      direction: 'CREDIT',
      occurredAt: '2026-06-13T00:00:00.000Z',
    });
  });

  it('parses PhonePe PDF text statement blocks', async () => {
    const statement = `
Transaction Statement for +919169123474
Date Transaction Details Type Amount
May 21, 2026
10:15 PM
Paid to Pradeep vegetables
Transaction ID : AC222605212215120845388153
UTR No : 264009842435
Debited from XX7727
Debit INR 380.00
Jun 13, 2026
12:17 PM
Received from Katkam Alekhya
Transaction ID : T2606131217507624648515
UTR No : 724576871461
Credited to XX7727
Credit INR
19800.00
`;

    const rows = await previewCsvImport({ account, categories, csv: statement });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      merchant: 'PRADEEP VEGETABLES',
      amountMinor: '38000',
      direction: 'DEBIT',
      referenceNumber: '264009842435',
      occurredAt: '2026-05-21T22:15:00.000Z',
    });
    expect(rows[1]).toMatchObject({
      merchant: 'KATKAM ALEKHYA',
      amountMinor: '1980000',
      direction: 'CREDIT',
      referenceNumber: '724576871461',
    });
  });
});
