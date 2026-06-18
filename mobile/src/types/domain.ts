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

export type LocalBudget = {
  id: string;
  name: string;
  categoryId: string;
  amountMinor: string;
  spentMinor: string;
  currency: string;
  periodType: 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  startDate: string;
  endDate?: string | null;
  alertThresholdPercent: number;
};

export type LocalRecurring = {
  id: string;
  accountId: string;
  categoryId?: string | null;
  name: string;
  amountMinor: string;
  currency: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  nextOccurrenceAt: string;
  paused: boolean;
};

export type LocalNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  scheduledAt?: string | null;
  readAt?: string | null;
  enabled: boolean;
};

export type LocalGoal = {
  id: string;
  name: string;
  type: 'EMERGENCY_FUND' | 'TRAVEL' | 'VEHICLE' | 'EDUCATION' | 'HOME' | 'CUSTOM';
  targetAmountMinor: string;
  currentAmountMinor: string;
  currency: string;
  targetDate?: string | null;
  linkedAccountId?: string | null;
};

export type LocalLoan = {
  id: string;
  name: string;
  accountId?: string | null;
  principalMinor: string;
  outstandingPrincipalMinor: string;
  annualInterestRate: number;
  tenureMonths: number;
  emiAmountMinor: string;
  startDate: string;
};

export type LocalInvestment = {
  id: string;
  name: string;
  type: 'FIXED_DEPOSIT' | 'MUTUAL_FUND' | 'STOCK' | 'PPF_EPF' | 'GOLD' | 'REAL_ESTATE' | 'OTHER';
  investedAmountMinor: string;
  currentValueMinor: string;
  currency: string;
  lastValuationDate?: string | null;
  linkedAccountId?: string | null;
};
