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
