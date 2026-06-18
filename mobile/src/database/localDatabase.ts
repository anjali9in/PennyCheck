import * as SQLite from 'expo-sqlite';

const databaseName = 'pennycheck.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getLocalDatabase() {
  databasePromise ??= SQLite.openDatabaseAsync(databaseName);
  return databasePromise;
}

export async function initializeLocalDatabase() {
  const database = await getLocalDatabase();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS local_metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      base_version INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      next_retry_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      opening_balance_minor TEXT NOT NULL,
      current_balance_minor TEXT NOT NULL,
      currency TEXT NOT NULL,
      color TEXT,
      archived INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      parent_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      system_category INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      account_id TEXT NOT NULL,
      destination_account_id TEXT,
      category_id TEXT,
      transfer_group_id TEXT,
      type TEXT NOT NULL,
      direction TEXT NOT NULL,
      amount_minor TEXT NOT NULL,
      currency TEXT NOT NULL,
      merchant TEXT,
      reference_number TEXT,
      occurred_at TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, occurred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_transfer_group ON transactions(transfer_group_id);

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      category_id TEXT NOT NULL,
      amount_minor TEXT NOT NULL,
      currency TEXT NOT NULL,
      period_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      alert_threshold_percent REAL NOT NULL DEFAULT 80,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id TEXT PRIMARY KEY NOT NULL,
      account_id TEXT NOT NULL,
      category_id TEXT,
      name TEXT NOT NULL,
      amount_minor TEXT NOT NULL,
      currency TEXT NOT NULL,
      frequency TEXT NOT NULL,
      next_occurrence_at TEXT NOT NULL,
      paused INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS local_notifications (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      scheduled_at TEXT,
      read_at TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      target_amount_minor TEXT NOT NULL,
      current_amount_minor TEXT NOT NULL DEFAULT '0',
      currency TEXT NOT NULL,
      target_date TEXT,
      linked_account_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY NOT NULL,
      account_id TEXT,
      name TEXT NOT NULL,
      principal_minor TEXT NOT NULL,
      outstanding_principal_minor TEXT NOT NULL,
      annual_interest_rate REAL NOT NULL,
      tenure_months INTEGER NOT NULL,
      emi_amount_minor TEXT NOT NULL,
      start_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS investments (
      id TEXT PRIMARY KEY NOT NULL,
      linked_account_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      invested_amount_minor TEXT NOT NULL,
      current_value_minor TEXT NOT NULL,
      currency TEXT NOT NULL,
      last_valuation_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
  `);

  await ensureColumn(database, 'transactions', 'reference_number', 'TEXT');

  await seedDefaultCategories(database);

  return database;
}

async function ensureColumn(database: SQLite.SQLiteDatabase, tableName: string, columnName: string, columnDefinition: string) {
  const columns = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
  if (!columns.some((column) => column.name === columnName)) {
    await database.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

async function seedDefaultCategories(database: SQLite.SQLiteDatabase) {
  const existing = await database.getFirstAsync<{ count: number }>('SELECT count(*) as count FROM categories');
  if ((existing?.count ?? 0) > 0) {
    return;
  }

  const now = new Date().toISOString();
  const defaults = [
    ['salary-income', 'Salary Income', 'INCOME', 'cash', '#4B7F52'],
    ['food-dining', 'Food & Dining', 'EXPENSE', 'food', '#B8770A'],
    ['transport', 'Transport', 'EXPENSE', 'car', '#176B87'],
    ['shopping', 'Shopping', 'EXPENSE', 'shopping', '#7B5BA7'],
    ['utilities', 'Utilities', 'EXPENSE', 'flash', '#C2410C'],
    ['transfer', 'Transfer', 'TRANSFER', 'swap', '#176B87'],
    ['investment', 'Investment', 'INVESTMENT', 'chart', '#4B7F52'],
  ];

  for (const category of defaults) {
    await database.runAsync(
      `INSERT INTO categories (id, name, type, icon, color, system_category, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [...category, now, now],
    );
  }
}
