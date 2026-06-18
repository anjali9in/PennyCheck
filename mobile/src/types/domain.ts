export type AccountType =
  | 'CASH'
  | 'SAVINGS'
  | 'CURRENT'
  | 'UPI_WALLET'
  | 'CREDIT_CARD'
  | 'LOAN'
  | 'INVESTMENT'
  | 'CUSTOM';

export type TransactionType =
  | 'INCOME'
  | 'EXPENSE'
  | 'TRANSFER'
  | 'REFUND'
  | 'CREDIT_CARD_PAYMENT'
  | 'INVESTMENT'
  | 'LOAN_PAYMENT'
  | 'BALANCE_ADJUSTMENT';

export type Money = {
  amountMinor: string;
  currency: string;
};

export type LocalAccount = {
  id: string;
  name: string;
  type: AccountType;
  currentBalanceMinor: string;
  openingBalanceMinor: string;
  currency: string;
  color?: string | null;
  archived: boolean;
  updatedAt: string;
};

export type LocalCategory = {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'LOAN';
  systemCategory: boolean;
};

export type LocalTransaction = {
  id: string;
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  transferGroupId?: string | null;
  type: TransactionType;
  direction: 'DEBIT' | 'CREDIT';
  amountMinor: string;
  currency: string;
  merchant?: string | null;
  referenceNumber?: string | null;
  occurredAt: string;
  notes?: string | null;
  status: 'CLEARED' | 'PENDING';
  source: 'MANUAL' | 'STATEMENT';
  updatedAt: string;
};
