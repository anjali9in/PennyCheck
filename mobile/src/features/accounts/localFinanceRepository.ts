import { getLocalDatabase } from '@/database/localDatabase';
import {
  AccountType,
  LocalAccount,
  LocalBudget,
  LocalCategory,
  LocalGoal,
  LocalInvestment,
  LocalLoan,
  LocalNotification,
  LocalRecurring,
  LocalTransaction,
  TransactionType,
} from '@/types/domain';
import { addMinor, negateMinor } from '@/utils/money';

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function listLocalAccounts(): Promise<LocalAccount[]> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    name: string;
    type: AccountType;
    opening_balance_minor: string;
    current_balance_minor: string;
    currency: string;
    color: string | null;
    archived: number;
    updated_at: string;
  }>('SELECT * FROM accounts WHERE deleted_at IS NULL ORDER BY archived ASC, name ASC');

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    openingBalanceMinor: row.opening_balance_minor,
    currentBalanceMinor: row.current_balance_minor,
    currency: row.currency,
    color: row.color,
    archived: row.archived === 1,
    updatedAt: row.updated_at,
  }));
}

export async function createLocalAccount(input: {
  name: string;
  type: AccountType;
  openingBalanceMinor: string;
  currency: string;
}): Promise<LocalAccount> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  const account: LocalAccount = {
    id: id('acct'),
    name: input.name.trim(),
    type: input.type,
    openingBalanceMinor: input.openingBalanceMinor,
    currentBalanceMinor: input.openingBalanceMinor,
    currency: input.currency,
    color: '#176B87',
    archived: false,
    updatedAt: now,
  };

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO accounts (
        id, name, type, opening_balance_minor, current_balance_minor, currency, color, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      account.id,
      account.name,
      account.type,
      account.openingBalanceMinor,
      account.currentBalanceMinor,
      account.currency,
      account.color ?? null,
      now,
      now,
    );
    await queueChange('accounts', account.id, 'CREATE', account);
  });

  return account;
}

export async function listLocalCategories(): Promise<LocalCategory[]> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    name: string;
    type: LocalCategory['type'];
    system_category: number;
  }>('SELECT id, name, type, system_category FROM categories WHERE deleted_at IS NULL AND archived = 0 ORDER BY type ASC, name ASC');

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    systemCategory: row.system_category === 1,
  }));
}

export async function listLocalTransactions(): Promise<LocalTransaction[]> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<Record<string, string | null>>(
    'SELECT * FROM transactions WHERE deleted_at IS NULL ORDER BY occurred_at DESC, created_at DESC LIMIT 100',
  );
  return rows.map(mapTransaction);
}

export async function listLocalBudgets(): Promise<LocalBudget[]> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<Record<string, string | number | null>>(
    'SELECT * FROM budgets WHERE deleted_at IS NULL ORDER BY start_date DESC',
  );
  const transactions = await listLocalTransactions();
  return rows.map((row) => {
    const categoryId = String(row.category_id);
    const startDate = String(row.start_date);
    const endDate = row.end_date ? String(row.end_date) : null;
    const spentMinor = transactions
      .filter((transaction) => transaction.categoryId === categoryId && transaction.direction === 'DEBIT')
      .filter((transaction) => transaction.occurredAt >= startDate && (!endDate || transaction.occurredAt <= endDate))
      .reduce((total, transaction) => addMinor(total, transaction.amountMinor), '0');
    return {
      id: String(row.id),
      name: String(row.name),
      categoryId,
      amountMinor: String(row.amount_minor),
      spentMinor,
      currency: String(row.currency),
      periodType: row.period_type as LocalBudget['periodType'],
      startDate,
      endDate,
      alertThresholdPercent: Number(row.alert_threshold_percent ?? 80),
    };
  });
}

export async function createLocalBudget(input: {
  name: string;
  categoryId: string;
  amountMinor: string;
  currency: string;
  periodType: LocalBudget['periodType'];
  alertThresholdPercent: number;
}): Promise<LocalBudget> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const budget: LocalBudget = {
    id: id('bud'),
    name: input.name.trim(),
    categoryId: input.categoryId,
    amountMinor: input.amountMinor,
    spentMinor: '0',
    currency: input.currency,
    periodType: input.periodType,
    startDate: monthStart.toISOString(),
    endDate: null,
    alertThresholdPercent: input.alertThresholdPercent,
  };
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO budgets (id, name, category_id, amount_minor, currency, period_type, start_date, alert_threshold_percent, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      budget.id,
      budget.name,
      budget.categoryId,
      budget.amountMinor,
      budget.currency,
      budget.periodType,
      budget.startDate,
      budget.alertThresholdPercent,
      now,
      now,
    );
    await queueChange('budgets', budget.id, 'CREATE', budget);
  });
  return budget;
}

export async function listLocalRecurring(): Promise<LocalRecurring[]> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<Record<string, string | number | null>>(
    'SELECT * FROM recurring_transactions WHERE deleted_at IS NULL ORDER BY paused ASC, next_occurrence_at ASC',
  );
  return rows.map((row) => ({
    id: String(row.id),
    accountId: String(row.account_id),
    categoryId: row.category_id ? String(row.category_id) : null,
    name: String(row.name),
    amountMinor: String(row.amount_minor),
    currency: String(row.currency),
    frequency: row.frequency as LocalRecurring['frequency'],
    nextOccurrenceAt: String(row.next_occurrence_at),
    paused: Number(row.paused) === 1,
  }));
}

export async function createLocalRecurring(input: {
  accountId: string;
  categoryId?: string | null;
  name: string;
  amountMinor: string;
  currency: string;
  frequency: LocalRecurring['frequency'];
}): Promise<LocalRecurring> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  const recurring: LocalRecurring = {
    id: id('rec'),
    accountId: input.accountId,
    categoryId: input.categoryId,
    name: input.name.trim(),
    amountMinor: input.amountMinor,
    currency: input.currency,
    frequency: input.frequency,
    nextOccurrenceAt: now,
    paused: false,
  };
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO recurring_transactions (id, account_id, category_id, name, amount_minor, currency, frequency, next_occurrence_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      recurring.id,
      recurring.accountId,
      recurring.categoryId ?? null,
      recurring.name,
      recurring.amountMinor,
      recurring.currency,
      recurring.frequency,
      recurring.nextOccurrenceAt,
      now,
      now,
    );
    await queueChange('recurring_transactions', recurring.id, 'CREATE', recurring);
  });
  return recurring;
}

export async function listLocalNotifications(): Promise<LocalNotification[]> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<Record<string, string | number | null>>(
    'SELECT * FROM local_notifications WHERE deleted_at IS NULL ORDER BY scheduled_at ASC',
  );
  return rows.map((row) => ({
    id: String(row.id),
    type: String(row.type),
    title: String(row.title),
    body: String(row.body),
    scheduledAt: row.scheduled_at ? String(row.scheduled_at) : null,
    readAt: row.read_at ? String(row.read_at) : null,
    enabled: Number(row.enabled) === 1,
  }));
}

export async function createLocalNotification(input: {
  type: string;
  title: string;
  body: string;
  scheduledAt?: string | null;
}): Promise<LocalNotification> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  const notification: LocalNotification = {
    id: id('not'),
    type: input.type,
    title: input.title,
    body: input.body,
    scheduledAt: input.scheduledAt ?? null,
    readAt: null,
    enabled: true,
  };
  await database.runAsync(
    `INSERT INTO local_notifications (id, type, title, body, scheduled_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    notification.id,
    notification.type,
    notification.title,
    notification.body,
    notification.scheduledAt ?? null,
    now,
    now,
  );
  return notification;
}

export async function listLocalGoals(): Promise<LocalGoal[]> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<Record<string, string | null>>(
    'SELECT * FROM goals WHERE deleted_at IS NULL ORDER BY target_date ASC, created_at DESC',
  );
  return rows.map((row) => ({
    id: row.id ?? '',
    name: row.name ?? '',
    type: row.type as LocalGoal['type'],
    targetAmountMinor: row.target_amount_minor ?? '0',
    currentAmountMinor: row.current_amount_minor ?? '0',
    currency: row.currency ?? 'INR',
    targetDate: row.target_date,
    linkedAccountId: row.linked_account_id,
  }));
}

export async function createLocalGoal(input: {
  name: string;
  type: LocalGoal['type'];
  targetAmountMinor: string;
  currentAmountMinor: string;
  currency: string;
  targetDate?: string | null;
  linkedAccountId?: string | null;
}): Promise<LocalGoal> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  const goal: LocalGoal = {
    id: id('goal'),
    name: input.name.trim(),
    type: input.type,
    targetAmountMinor: input.targetAmountMinor,
    currentAmountMinor: input.currentAmountMinor,
    currency: input.currency,
    targetDate: input.targetDate ?? null,
    linkedAccountId: input.linkedAccountId ?? null,
  };
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO goals (
        id, name, type, target_amount_minor, current_amount_minor, currency, target_date, linked_account_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      goal.id,
      goal.name,
      goal.type,
      goal.targetAmountMinor,
      goal.currentAmountMinor,
      goal.currency,
      goal.targetDate ?? null,
      goal.linkedAccountId ?? null,
      now,
      now,
    );
    await queueChange('goals', goal.id, 'CREATE', goal);
  });
  return goal;
}

export async function listLocalLoans(): Promise<LocalLoan[]> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<Record<string, string | number | null>>(
    'SELECT * FROM loans WHERE deleted_at IS NULL ORDER BY start_date DESC, created_at DESC',
  );
  return rows.map((row) => ({
    id: String(row.id),
    accountId: row.account_id ? String(row.account_id) : null,
    name: String(row.name),
    principalMinor: String(row.principal_minor),
    outstandingPrincipalMinor: String(row.outstanding_principal_minor),
    annualInterestRate: Number(row.annual_interest_rate),
    tenureMonths: Number(row.tenure_months),
    emiAmountMinor: String(row.emi_amount_minor),
    startDate: String(row.start_date),
  }));
}

export async function createLocalLoan(input: {
  name: string;
  accountId?: string | null;
  principalMinor: string;
  annualInterestRate: number;
  tenureMonths: number;
  startDate?: string;
}): Promise<LocalLoan> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  const emiAmountMinor = calculateEmiMinor(input.principalMinor, input.annualInterestRate, input.tenureMonths);
  const loan: LocalLoan = {
    id: id('loan'),
    name: input.name.trim(),
    accountId: input.accountId ?? null,
    principalMinor: input.principalMinor,
    outstandingPrincipalMinor: input.principalMinor,
    annualInterestRate: input.annualInterestRate,
    tenureMonths: input.tenureMonths,
    emiAmountMinor,
    startDate: input.startDate ?? now,
  };
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO loans (
        id, account_id, name, principal_minor, outstanding_principal_minor, annual_interest_rate, tenure_months,
        emi_amount_minor, start_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      loan.id,
      loan.accountId ?? null,
      loan.name,
      loan.principalMinor,
      loan.outstandingPrincipalMinor,
      loan.annualInterestRate,
      loan.tenureMonths,
      loan.emiAmountMinor,
      loan.startDate,
      now,
      now,
    );
    await queueChange('loans', loan.id, 'CREATE', loan);
  });
  return loan;
}

export async function listLocalInvestments(): Promise<LocalInvestment[]> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<Record<string, string | null>>(
    'SELECT * FROM investments WHERE deleted_at IS NULL ORDER BY current_value_minor DESC, name ASC',
  );
  return rows.map((row) => ({
    id: row.id ?? '',
    linkedAccountId: row.linked_account_id,
    name: row.name ?? '',
    type: row.type as LocalInvestment['type'],
    investedAmountMinor: row.invested_amount_minor ?? '0',
    currentValueMinor: row.current_value_minor ?? '0',
    currency: row.currency ?? 'INR',
    lastValuationDate: row.last_valuation_date,
  }));
}

export async function createLocalInvestment(input: {
  name: string;
  type: LocalInvestment['type'];
  investedAmountMinor: string;
  currentValueMinor: string;
  currency: string;
  lastValuationDate?: string | null;
  linkedAccountId?: string | null;
}): Promise<LocalInvestment> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  const investment: LocalInvestment = {
    id: id('inv'),
    name: input.name.trim(),
    type: input.type,
    investedAmountMinor: input.investedAmountMinor,
    currentValueMinor: input.currentValueMinor,
    currency: input.currency,
    lastValuationDate: input.lastValuationDate ?? now.slice(0, 10),
    linkedAccountId: input.linkedAccountId ?? null,
  };
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO investments (
        id, linked_account_id, name, type, invested_amount_minor, current_value_minor, currency,
        last_valuation_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      investment.id,
      investment.linkedAccountId ?? null,
      investment.name,
      investment.type,
      investment.investedAmountMinor,
      investment.currentValueMinor,
      investment.currency,
      investment.lastValuationDate ?? null,
      now,
      now,
    );
    await queueChange('investments', investment.id, 'CREATE', investment);
  });
  return investment;
}

export async function createLocalTransaction(input: {
  accountId: string;
  categoryId?: string | null;
  type: Exclude<TransactionType, 'TRANSFER'>;
  direction: 'DEBIT' | 'CREDIT';
  amountMinor: string;
  currency: string;
  merchant?: string;
  referenceNumber?: string;
  notes?: string;
}): Promise<LocalTransaction> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  const transaction = buildTransaction({ ...input, id: id('txn'), occurredAt: now });

  await database.withTransactionAsync(async () => {
    await insertTransaction(transaction);
    await adjustLocalBalance(input.accountId, input.direction === 'CREDIT' ? input.amountMinor : negateMinor(input.amountMinor));
    await queueChange('transactions', transaction.id, 'CREATE', transaction);
  });

  return transaction;
}

export async function createLocalTransfer(input: {
  sourceAccountId: string;
  destinationAccountId: string;
  amountMinor: string;
  currency: string;
  notes?: string;
}): Promise<LocalTransaction[]> {
  const now = new Date().toISOString();
  const transferGroupId = id('trf');
  const debit = buildTransaction({
    id: id('txn'),
    accountId: input.sourceAccountId,
    destinationAccountId: input.destinationAccountId,
    transferGroupId,
    type: 'TRANSFER',
    direction: 'DEBIT',
    amountMinor: input.amountMinor,
    currency: input.currency,
    merchant: 'Transfer',
    notes: input.notes,
    occurredAt: now,
  });
  const credit = buildTransaction({
    id: id('txn'),
    accountId: input.destinationAccountId,
    destinationAccountId: input.sourceAccountId,
    transferGroupId,
    type: 'TRANSFER',
    direction: 'CREDIT',
    amountMinor: input.amountMinor,
    currency: input.currency,
    merchant: 'Transfer',
    notes: input.notes,
    occurredAt: now,
  });

  const database = await getLocalDatabase();
  await database.withTransactionAsync(async () => {
    await insertTransaction(debit);
    await insertTransaction(credit);
    await adjustLocalBalance(input.sourceAccountId, negateMinor(input.amountMinor));
    await adjustLocalBalance(input.destinationAccountId, input.amountMinor);
    await queueChange('transfers', transferGroupId, 'CREATE', { debit, credit });
  });

  return [debit, credit];
}

export async function createImportedLocalTransactions(rows: {
  accountId: string;
  categoryId?: string | null;
  direction: 'DEBIT' | 'CREDIT';
  amountMinor: string;
  currency: string;
  merchant?: string | null;
  narration?: string | null;
  referenceNumber?: string | null;
  occurredAt: string;
}[]): Promise<LocalTransaction[]> {
  const database = await getLocalDatabase();
  const imported: LocalTransaction[] = [];
  await database.withTransactionAsync(async () => {
    for (const row of rows) {
      const transaction = buildTransaction({
        id: id('imp'),
        accountId: row.accountId,
        categoryId: row.categoryId,
        type: row.direction === 'CREDIT' ? 'INCOME' : 'EXPENSE',
        direction: row.direction,
        amountMinor: row.amountMinor,
        currency: row.currency,
        merchant: row.merchant ?? row.narration ?? 'Imported transaction',
        referenceNumber: row.referenceNumber ?? undefined,
        notes: row.narration ?? undefined,
        occurredAt: row.occurredAt,
        source: 'STATEMENT',
      });
      await insertTransaction(transaction);
      await adjustLocalBalance(row.accountId, row.direction === 'CREDIT' ? row.amountMinor : negateMinor(row.amountMinor));
      await queueChange('transactions', transaction.id, 'CREATE', transaction);
      imported.push(transaction);
    }
  });
  return imported;
}

export async function hasLocalDuplicate(input: {
  accountId: string;
  occurredAt: string;
  amountMinor: string;
  direction: 'DEBIT' | 'CREDIT';
  merchant?: string | null;
  referenceNumber?: string | null;
}) {
  const database = await getLocalDatabase();
  if (input.referenceNumber) {
    const referenceMatch = await database.getFirstAsync<{ id: string }>(
      'SELECT id FROM transactions WHERE account_id = ? AND reference_number = ? AND deleted_at IS NULL LIMIT 1',
      input.accountId,
      input.referenceNumber,
    );
    if (referenceMatch) {
      return true;
    }
  }
  const exactMatch = await database.getFirstAsync<{ id: string }>(
    `SELECT id FROM transactions
     WHERE account_id = ? AND occurred_at = ? AND amount_minor = ? AND direction = ?
       AND COALESCE(merchant, '') = COALESCE(?, '') AND deleted_at IS NULL
     LIMIT 1`,
    input.accountId,
    input.occurredAt,
    input.amountMinor,
    input.direction,
    input.merchant ?? '',
  );
  return Boolean(exactMatch);
}

async function insertTransaction(transaction: LocalTransaction) {
  const database = await getLocalDatabase();
  await database.runAsync(
    `INSERT INTO transactions (
      id, account_id, destination_account_id, category_id, transfer_group_id, type, direction,
      amount_minor, currency, merchant, reference_number, occurred_at, notes, status, source, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    transaction.id,
    transaction.accountId,
    transaction.destinationAccountId ?? null,
    transaction.categoryId ?? null,
    transaction.transferGroupId ?? null,
    transaction.type,
    transaction.direction,
    transaction.amountMinor,
    transaction.currency,
    transaction.merchant ?? null,
    transaction.referenceNumber ?? null,
    transaction.occurredAt,
    transaction.notes ?? null,
    transaction.status,
    transaction.source,
    transaction.updatedAt,
    transaction.updatedAt,
  );
}

async function adjustLocalBalance(accountId: string, deltaMinor: string) {
  const database = await getLocalDatabase();
  const account = await database.getFirstAsync<{ current_balance_minor: string }>(
    'SELECT current_balance_minor FROM accounts WHERE id = ? AND deleted_at IS NULL',
    accountId,
  );
  if (!account) {
    throw new Error('Account not found');
  }
  await database.runAsync(
    'UPDATE accounts SET current_balance_minor = ?, updated_at = ? WHERE id = ?',
    addMinor(account.current_balance_minor, deltaMinor),
    new Date().toISOString(),
    accountId,
  );
}

async function queueChange(entityType: string, entityId: string, operation: 'CREATE' | 'UPDATE' | 'DELETE', payload: unknown) {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
    id('sync'),
    entityType,
    entityId,
    operation,
    JSON.stringify(payload),
    now,
    now,
  );
}

function calculateEmiMinor(principalMinor: string, annualInterestRate: number, tenureMonths: number) {
  if (tenureMonths <= 0) {
    throw new Error('Tenure must be greater than zero');
  }
  const principal = Number(principalMinor) / 100;
  if (annualInterestRate === 0) {
    return String(Math.round((principal / tenureMonths) * 100));
  }
  const monthlyRate = annualInterestRate / 100 / 12;
  const compound = (1 + monthlyRate) ** tenureMonths;
  const emi = (principal * monthlyRate * compound) / (compound - 1);
  return String(Math.round(emi * 100));
}

function buildTransaction(input: {
  id: string;
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  transferGroupId?: string | null;
  type: TransactionType;
  direction: 'DEBIT' | 'CREDIT';
  amountMinor: string;
  currency: string;
  merchant?: string;
  referenceNumber?: string;
  notes?: string;
  occurredAt: string;
  source?: 'MANUAL' | 'STATEMENT';
}): LocalTransaction {
  return {
    id: input.id,
    accountId: input.accountId,
    destinationAccountId: input.destinationAccountId,
    categoryId: input.categoryId,
    transferGroupId: input.transferGroupId,
    type: input.type,
    direction: input.direction,
    amountMinor: input.amountMinor,
    currency: input.currency,
    merchant: input.merchant,
    referenceNumber: input.referenceNumber,
    occurredAt: input.occurredAt,
    notes: input.notes,
    status: 'CLEARED',
    source: input.source ?? 'MANUAL',
    updatedAt: input.occurredAt,
  };
}

function mapTransaction(row: Record<string, string | null>): LocalTransaction {
  return {
    id: row.id ?? '',
    accountId: row.account_id ?? '',
    destinationAccountId: row.destination_account_id,
    categoryId: row.category_id,
    transferGroupId: row.transfer_group_id,
    type: row.type as TransactionType,
    direction: row.direction as 'DEBIT' | 'CREDIT',
    amountMinor: row.amount_minor ?? '0',
    currency: row.currency ?? 'INR',
    merchant: row.merchant,
    referenceNumber: row.reference_number,
    occurredAt: row.occurred_at ?? '',
    notes: row.notes,
    status: (row.status as 'CLEARED' | 'PENDING') ?? 'CLEARED',
    source: (row.source as 'MANUAL' | 'STATEMENT') ?? 'MANUAL',
    updatedAt: row.updated_at ?? '',
  };
}
