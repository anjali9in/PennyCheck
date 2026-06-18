import { getLocalDatabase } from '@/database/localDatabase';
import { AccountType, LocalAccount, LocalCategory, LocalTransaction, TransactionType } from '@/types/domain';
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
