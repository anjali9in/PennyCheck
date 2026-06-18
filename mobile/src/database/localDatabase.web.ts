type WebRow = Record<string, string | number | null>;

type WebState = Record<string, WebRow[]>;

type QueryParam = string | number | null | undefined;
type QueryArg = QueryParam | QueryParam[];

type WebDatabase = {
  execAsync(sql: string): Promise<void>;
  getAllAsync<T>(sql: string, ...params: QueryParam[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: QueryParam[]): Promise<T | null>;
  runAsync(sql: string, ...params: QueryArg[]): Promise<void>;
  withTransactionAsync(callback: () => Promise<void>): Promise<void>;
};

const storageKey = 'pennycheck.webdb.v1';

const tableNames = [
  'local_metadata',
  'sync_queue',
  'sync_conflicts',
  'accounts',
  'categories',
  'transactions',
  'budgets',
  'recurring_transactions',
  'local_notifications',
  'goals',
  'loans',
  'investments',
] as const;

let databasePromise: Promise<WebDatabase> | null = null;
let initializationPromise: Promise<WebDatabase> | null = null;

export function getLocalDatabase() {
  databasePromise ??= Promise.resolve(new BrowserLocalDatabase());
  return databasePromise;
}

export async function initializeLocalDatabase() {
  if (initializationPromise) {
    return initializationPromise;
  }
  initializationPromise = initializeLocalDatabaseOnce();
  return initializationPromise;
}

async function initializeLocalDatabaseOnce() {
  const database = await getLocalDatabase();
  await seedDefaultCategories(database);
  return database;
}

async function seedDefaultCategories(database: WebDatabase) {
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

class BrowserLocalDatabase implements WebDatabase {
  private state: WebState;

  constructor() {
    this.state = loadState();
  }

  async execAsync() {
    this.persist();
  }

  async getAllAsync<T>(sql: string, ...params: QueryParam[]) {
    const normalized = normalizeSql(sql);

    if (normalized.startsWith('pragma table_info')) {
      return [] as T[];
    }
    if (normalized.includes('from accounts')) {
      return this.activeRows('accounts')
        .sort((left, right) => Number(left.archived ?? 0) - Number(right.archived ?? 0) || compareText(left.name, right.name)) as T[];
    }
    if (normalized.includes('from categories')) {
      return this.activeRows('categories')
        .filter((row) => Number(row.archived ?? 0) === 0)
        .sort((left, right) => compareText(left.type, right.type) || compareText(left.name, right.name)) as T[];
    }
    if (normalized.includes('from transactions')) {
      return this.activeRows('transactions')
        .sort((left, right) => compareText(right.occurred_at, left.occurred_at) || compareText(right.created_at, left.created_at))
        .slice(0, 100) as T[];
    }
    if (normalized.includes('from budgets')) {
      return this.activeRows('budgets').sort((left, right) => compareText(right.start_date, left.start_date)) as T[];
    }
    if (normalized.includes('from recurring_transactions')) {
      return this.activeRows('recurring_transactions')
        .sort((left, right) => Number(left.paused ?? 0) - Number(right.paused ?? 0) || compareText(left.next_occurrence_at, right.next_occurrence_at)) as T[];
    }
    if (normalized.includes('from local_notifications')) {
      return this.activeRows('local_notifications').sort((left, right) => compareText(left.scheduled_at, right.scheduled_at)) as T[];
    }
    if (normalized.includes('from goals')) {
      return this.activeRows('goals').sort((left, right) => compareText(left.target_date, right.target_date) || compareText(right.created_at, left.created_at)) as T[];
    }
    if (normalized.includes('from loans')) {
      return this.activeRows('loans').sort((left, right) => compareText(right.start_date, left.start_date) || compareText(right.created_at, left.created_at)) as T[];
    }
    if (normalized.includes('from investments')) {
      return this.activeRows('investments')
        .sort((left, right) => Number(right.current_value_minor ?? 0) - Number(left.current_value_minor ?? 0) || compareText(left.name, right.name)) as T[];
    }
    if (normalized.includes('from sync_queue')) {
      const retryCutoff = params[0] ? String(params[0]) : new Date().toISOString();
      return this.state.sync_queue
        .filter((row) => ['pending', 'failed'].includes(String(row.status)))
        .filter((row) => !row.next_retry_at || String(row.next_retry_at) <= retryCutoff)
        .sort((left, right) => compareText(left.created_at, right.created_at))
        .slice(0, 100) as T[];
    }

    return [] as T[];
  }

  async getFirstAsync<T>(sql: string, ...params: QueryParam[]) {
    const normalized = normalizeSql(sql);

    if (normalized.includes('count(*) as count from categories')) {
      return { count: this.state.categories.length } as T;
    }
    if (normalized.includes("count(*) as count from sync_queue where status in ('pending','failed','conflict')")) {
      return {
        count: this.state.sync_queue.filter((row) => ['pending', 'failed', 'conflict'].includes(String(row.status))).length,
      } as T;
    }
    if (normalized.includes('select current_balance_minor from accounts')) {
      const accountId = String(params[0] ?? '');
      return (this.activeRows('accounts').find((row) => row.id === accountId) as T) ?? null;
    }
    if (normalized.includes('select value from local_metadata')) {
      const key = String(params[0] ?? '');
      return (this.state.local_metadata.find((row) => row.key === key) as T) ?? null;
    }
    if (normalized.includes('from transactions') && normalized.includes('reference_number')) {
      const accountId = String(params[0] ?? '');
      const referenceNumber = String(params[1] ?? '');
      return (this.activeRows('transactions').find((row) => row.account_id === accountId && row.reference_number === referenceNumber) as T) ?? null;
    }
    if (normalized.includes('from transactions') && normalized.includes('coalesce')) {
      const [accountId, occurredAt, amountMinor, direction, merchant] = params.map((param) => String(param ?? ''));
      return (
        (this.activeRows('transactions').find(
          (row) =>
            row.account_id === accountId &&
            row.occurred_at === occurredAt &&
            row.amount_minor === amountMinor &&
            row.direction === direction &&
            String(row.merchant ?? '') === merchant,
        ) as T) ?? null
      );
    }

    const rows = await this.getAllAsync<T>(sql, ...params);
    return rows[0] ?? null;
  }

  async runAsync(sql: string, ...params: QueryArg[]) {
    const normalized = normalizeSql(sql);
    const values = flattenParams(params);

    if (normalized.startsWith('insert into accounts')) {
      this.upsert(
        'accounts',
        normalized.includes('archived')
          ? mapRow(values, ['id', 'name', 'type', 'opening_balance_minor', 'current_balance_minor', 'currency', 'color', 'archived', 'created_at', 'updated_at'])
          : {
              ...mapRow(values, ['id', 'name', 'type', 'opening_balance_minor', 'current_balance_minor', 'currency', 'color', 'created_at', 'updated_at']),
              archived: 0,
            },
      );
      return this.persist();
    }
    if (normalized.startsWith('insert into categories')) {
      this.upsert('categories', {
        id: text(values[0]),
        name: text(values[1]),
        type: text(values[2]),
        icon: nullable(values[3]),
        color: nullable(values[4]),
        system_category: 1,
        archived: 0,
        created_at: text(values[5]),
        updated_at: text(values[6]),
        deleted_at: null,
      });
      return this.persist();
    }
    if (normalized.startsWith('insert into transactions')) {
      this.upsert(
        'transactions',
        mapRow(values, [
          'id',
          'account_id',
          'destination_account_id',
          'category_id',
          'transfer_group_id',
          'type',
          'direction',
          'amount_minor',
          'currency',
          'merchant',
          'reference_number',
          'occurred_at',
          'notes',
          'status',
          'source',
          'created_at',
          'updated_at',
        ]),
      );
      return this.persist();
    }
    if (normalized.startsWith('insert into budgets')) {
      this.upsert(
        'budgets',
        normalized.includes('end_date')
          ? mapRow(values, ['id', 'name', 'category_id', 'amount_minor', 'currency', 'period_type', 'start_date', 'end_date', 'alert_threshold_percent', 'created_at', 'updated_at'])
          : {
              ...mapRow(values, ['id', 'name', 'category_id', 'amount_minor', 'currency', 'period_type', 'start_date', 'alert_threshold_percent', 'created_at', 'updated_at']),
              end_date: null,
            },
      );
      return this.persist();
    }
    if (normalized.startsWith('insert into recurring_transactions')) {
      this.upsert(
        'recurring_transactions',
        normalized.includes('paused')
          ? mapRow(values, ['id', 'account_id', 'category_id', 'name', 'amount_minor', 'currency', 'frequency', 'next_occurrence_at', 'paused', 'created_at', 'updated_at'])
          : {
              ...mapRow(values, ['id', 'account_id', 'category_id', 'name', 'amount_minor', 'currency', 'frequency', 'next_occurrence_at', 'created_at', 'updated_at']),
              paused: 0,
            },
      );
      return this.persist();
    }
    if (normalized.startsWith('insert into local_notifications')) {
      this.upsert('local_notifications', mapRow(values, ['id', 'type', 'title', 'body', 'scheduled_at', 'created_at', 'updated_at']));
      return this.persist();
    }
    if (normalized.startsWith('insert into goals')) {
      this.upsert('goals', mapRow(values, ['id', 'name', 'type', 'target_amount_minor', 'current_amount_minor', 'currency', 'target_date', 'linked_account_id', 'created_at', 'updated_at']));
      return this.persist();
    }
    if (normalized.startsWith('insert into loans')) {
      this.upsert('loans', mapRow(values, ['id', 'account_id', 'name', 'principal_minor', 'outstanding_principal_minor', 'annual_interest_rate', 'tenure_months', 'emi_amount_minor', 'start_date', 'created_at', 'updated_at']));
      return this.persist();
    }
    if (normalized.startsWith('insert into investments')) {
      this.upsert('investments', mapRow(values, ['id', 'linked_account_id', 'name', 'type', 'invested_amount_minor', 'current_value_minor', 'currency', 'last_valuation_date', 'created_at', 'updated_at']));
      return this.persist();
    }
    if (normalized.startsWith('insert into sync_queue')) {
      this.upsert('sync_queue', {
        id: text(values[0]),
        entity_type: text(values[1]),
        entity_id: text(values[2]),
        operation: text(values[3]),
        payload: text(values[4]),
        base_version: null,
        server_version: null,
        status: 'pending',
        last_error: null,
        retry_count: 0,
        next_retry_at: null,
        created_at: text(values[5]),
        updated_at: text(values[6]),
      });
      return this.persist();
    }
    if (normalized.startsWith('insert or replace into sync_conflicts')) {
      this.upsert('sync_conflicts', mapRow(values, ['id', 'entity_type', 'entity_id', 'local_payload', 'remote_payload', 'conflict_reason', 'server_version', 'created_at']));
      return this.persist();
    }
    if (normalized.startsWith('insert into local_metadata')) {
      this.upsert('local_metadata', mapRow(values, ['key', 'value', 'updated_at'], 'key'));
      return this.persist();
    }
    if (normalized.startsWith('update accounts set current_balance_minor')) {
      this.updateById('accounts', text(values[2]), { current_balance_minor: text(values[0]), updated_at: text(values[1]) });
      return this.persist();
    }
    if (normalized.startsWith('update sync_queue set status =')) {
      this.updateSyncQueue(normalized, values);
      return this.persist();
    }
    if (normalized.startsWith('update ') && normalized.includes(' set deleted_at =')) {
      const table = normalized.split(' ')[1];
      this.updateById(table, text(values[2]), { deleted_at: text(values[0]), updated_at: text(values[1]) });
      return this.persist();
    }

    return this.persist();
  }

  async withTransactionAsync(callback: () => Promise<void>) {
    await callback();
    this.persist();
  }

  private activeRows(table: string) {
    return (this.state[table] ?? []).filter((row) => row.deleted_at === undefined || row.deleted_at === null);
  }

  private upsert(table: string, row: WebRow, key = 'id') {
    const rows = this.state[table] ?? [];
    const index = rows.findIndex((existing) => existing[key] === row[key]);
    const nextRow = {
      ...rows[index],
      ...row,
      deleted_at: row.deleted_at ?? null,
    };
    if (index >= 0) {
      rows[index] = nextRow;
    } else {
      rows.push(nextRow);
    }
    this.state[table] = rows;
  }

  private updateById(table: string, id: string, updates: WebRow) {
    const rows = this.state[table] ?? [];
    const index = rows.findIndex((row) => row.id === id);
    if (index >= 0) {
      rows[index] = { ...rows[index], ...updates };
    }
  }

  private updateSyncQueue(normalized: string, values: QueryParam[]) {
    if (normalized.includes("status = 'synced'")) {
      this.updateById('sync_queue', text(values[2]), { status: 'synced', server_version: Number(values[0]), last_error: null, updated_at: text(values[1]) });
      return;
    }
    if (normalized.includes("status = 'conflict'")) {
      this.updateById('sync_queue', text(values[3]), { status: 'conflict', server_version: Number(values[0]), last_error: text(values[1]), updated_at: text(values[2]) });
      return;
    }
    if (normalized.includes("status = 'failed'")) {
      this.updateById('sync_queue', text(values[4]), {
        status: 'failed',
        retry_count: Number(values[0]),
        next_retry_at: text(values[1]),
        last_error: text(values[2]),
        updated_at: text(values[3]),
      });
    }
  }

  private persist() {
    saveState(this.state);
  }
}

function loadState(): WebState {
  const empty = createEmptyState();
  if (typeof localStorage === 'undefined') {
    return empty;
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return empty;
    }
    return { ...empty, ...(JSON.parse(raw) as WebState) };
  } catch {
    return empty;
  }
}

function saveState(state: WebState) {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify(state));
}

function createEmptyState(): WebState {
  return Object.fromEntries(tableNames.map((table) => [table, []])) as WebState;
}

function normalizeSql(sql: string) {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

function compareText(left: unknown, right: unknown) {
  return String(left ?? '').localeCompare(String(right ?? ''));
}

function flattenParams(params: QueryArg[]) {
  return (Array.isArray(params[0]) ? params[0] : params) as QueryParam[];
}

function mapRow(values: QueryParam[], columns: string[], key = 'id'): WebRow {
  const row = Object.fromEntries(columns.map((column, index) => [column, normalizeValue(values[index])])) as WebRow;
  row[key] = text(row[key]);
  row.deleted_at ??= null;
  return row;
}

function normalizeValue(value: QueryParam) {
  return value === undefined ? null : value;
}

function text(value: unknown) {
  return String(value ?? '');
}

function nullable(value: unknown) {
  return value === undefined || value === null ? null : String(value);
}
