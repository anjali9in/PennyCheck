import { getLocalDatabase } from '@/database/localDatabase';
import { apiGet, apiPost } from '@/services/api';

type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';

type QueuedChange = {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: SyncOperation;
  payload: string;
  base_version: number | null;
  retry_count: number;
};

type RemoteChange = {
  clientChangeId: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  baseVersion: number | null;
  serverVersion: number;
  status: 'APPLIED' | 'CONFLICT';
  conflictReason?: string | null;
};

type PushResponse = {
  accepted: RemoteChange[];
  conflicts: RemoteChange[];
  serverCursor: number;
};

type PullResponse = {
  changes: RemoteChange[];
  serverCursor: number;
};

export async function performSync(accessToken: string) {
  const pushed = await pushPendingChanges(accessToken);
  const pulled = await pullRemoteChanges(accessToken);
  return { pushed, pulled };
}

export async function pendingSyncCount() {
  const database = await getLocalDatabase();
  const row = await database.getFirstAsync<{ count: number }>(
    "SELECT count(*) as count FROM sync_queue WHERE status IN ('pending','failed','conflict')",
  );
  return row?.count ?? 0;
}

async function pushPendingChanges(accessToken: string) {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  const changes = await database.getAllAsync<QueuedChange>(
    `SELECT * FROM sync_queue
     WHERE status IN ('pending','failed') AND (next_retry_at IS NULL OR next_retry_at <= ?)
     ORDER BY created_at ASC
     LIMIT 100`,
    now,
  );

  if (changes.length === 0) {
    return 0;
  }

  try {
    const response = await apiPost<PushResponse>('/sync/push', {
      changes: changes.map((change) => ({
        clientChangeId: change.id,
        entityType: change.entity_type,
        entityId: change.entity_id,
        operation: change.operation,
        payload: JSON.parse(change.payload),
        baseVersion: change.base_version,
      })),
    }, accessToken);

    await database.withTransactionAsync(async () => {
      for (const accepted of response.accepted) {
        await database.runAsync(
          `UPDATE sync_queue
           SET status = 'synced', server_version = ?, last_error = NULL, updated_at = ?
           WHERE id = ?`,
          accepted.serverVersion,
          now,
          accepted.clientChangeId,
        );
      }
      for (const conflict of response.conflicts) {
        const queued = changes.find((change) => change.id === conflict.clientChangeId);
        await database.runAsync(
          `UPDATE sync_queue
           SET status = 'conflict', server_version = ?, last_error = ?, updated_at = ?
           WHERE id = ?`,
          conflict.serverVersion,
          conflict.conflictReason ?? 'Remote change conflict',
          now,
          conflict.clientChangeId,
        );
        if (queued) {
          await recordConflict(conflict, queued.payload);
        }
      }
      await setMetadata('last_sync_cursor', String(response.serverCursor));
      await setMetadata('last_successful_sync_at', now);
    });
    return response.accepted.length;
  } catch (error) {
    await database.withTransactionAsync(async () => {
      for (const change of changes) {
        const retryCount = change.retry_count + 1;
        await database.runAsync(
          `UPDATE sync_queue
           SET status = 'failed', retry_count = ?, next_retry_at = ?, last_error = ?, updated_at = ?
           WHERE id = ?`,
          retryCount,
          nextRetryAt(retryCount),
          error instanceof Error ? error.message : 'Sync failed',
          now,
          change.id,
        );
      }
    });
    throw error;
  }
}

async function pullRemoteChanges(accessToken: string) {
  const cursor = await getMetadata('last_sync_cursor');
  const response = await apiGet<PullResponse>(`/sync/pull?after=${encodeURIComponent(cursor ?? '0')}`, accessToken);
  const database = await getLocalDatabase();
  await database.withTransactionAsync(async () => {
    for (const change of response.changes) {
      await applyRemoteChange(change);
    }
    await setMetadata('last_sync_cursor', String(response.serverCursor));
    await setMetadata('last_successful_sync_at', new Date().toISOString());
  });
  return response.changes.length;
}

async function applyRemoteChange(change: RemoteChange) {
  if (change.operation === 'DELETE') {
    await softDeleteLocal(change.entityType, change.entityId);
    return;
  }

  switch (change.entityType) {
    case 'accounts':
      await upsertAccount(change.payload);
      break;
    case 'transactions':
      await upsertTransaction(change.payload);
      break;
    case 'budgets':
      await upsertBudget(change.payload);
      break;
    case 'recurring_transactions':
      await upsertRecurring(change.payload);
      break;
    case 'goals':
      await upsertGoal(change.payload);
      break;
    case 'loans':
      await upsertLoan(change.payload);
      break;
    case 'investments':
      await upsertInvestment(change.payload);
      break;
    default:
      break;
  }
}

async function upsertAccount(payload: Record<string, unknown>) {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO accounts (id, name, type, opening_balance_minor, current_balance_minor, currency, color, archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, type = excluded.type, opening_balance_minor = excluded.opening_balance_minor,
       current_balance_minor = excluded.current_balance_minor, currency = excluded.currency, color = excluded.color,
       archived = excluded.archived, updated_at = excluded.updated_at, deleted_at = NULL`,
    text(payload.id),
    text(payload.name),
    text(payload.type),
    text(payload.openingBalanceMinor),
    text(payload.currentBalanceMinor),
    text(payload.currency, 'INR'),
    nullable(payload.color),
    payload.archived ? 1 : 0,
    now,
    text(payload.updatedAt, now),
  );
}

async function upsertTransaction(payload: Record<string, unknown>) {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO transactions (
      id, account_id, destination_account_id, category_id, transfer_group_id, type, direction,
      amount_minor, currency, merchant, reference_number, occurred_at, notes, status, source, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      account_id = excluded.account_id, destination_account_id = excluded.destination_account_id,
      category_id = excluded.category_id, transfer_group_id = excluded.transfer_group_id, type = excluded.type,
      direction = excluded.direction, amount_minor = excluded.amount_minor, currency = excluded.currency,
      merchant = excluded.merchant, reference_number = excluded.reference_number, occurred_at = excluded.occurred_at,
      notes = excluded.notes, status = excluded.status, source = excluded.source, updated_at = excluded.updated_at,
      deleted_at = NULL`,
    text(payload.id),
    text(payload.accountId),
    nullable(payload.destinationAccountId),
    nullable(payload.categoryId),
    nullable(payload.transferGroupId),
    text(payload.type),
    text(payload.direction),
    text(payload.amountMinor),
    text(payload.currency, 'INR'),
    nullable(payload.merchant),
    nullable(payload.referenceNumber),
    text(payload.occurredAt, now),
    nullable(payload.notes),
    text(payload.status, 'CLEARED'),
    text(payload.source, 'MANUAL'),
    now,
    text(payload.updatedAt, now),
  );
}

async function upsertBudget(payload: Record<string, unknown>) {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO budgets (id, name, category_id, amount_minor, currency, period_type, start_date, end_date, alert_threshold_percent, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, category_id = excluded.category_id, amount_minor = excluded.amount_minor,
       currency = excluded.currency, period_type = excluded.period_type, start_date = excluded.start_date,
       end_date = excluded.end_date, alert_threshold_percent = excluded.alert_threshold_percent,
       updated_at = excluded.updated_at, deleted_at = NULL`,
    text(payload.id),
    text(payload.name),
    text(payload.categoryId),
    text(payload.amountMinor),
    text(payload.currency, 'INR'),
    text(payload.periodType, 'MONTHLY'),
    text(payload.startDate, now),
    nullable(payload.endDate),
    Number(payload.alertThresholdPercent ?? 80),
    now,
    now,
  );
}

async function upsertRecurring(payload: Record<string, unknown>) {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO recurring_transactions (id, account_id, category_id, name, amount_minor, currency, frequency, next_occurrence_at, paused, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       account_id = excluded.account_id, category_id = excluded.category_id, name = excluded.name,
       amount_minor = excluded.amount_minor, currency = excluded.currency, frequency = excluded.frequency,
       next_occurrence_at = excluded.next_occurrence_at, paused = excluded.paused, updated_at = excluded.updated_at,
       deleted_at = NULL`,
    text(payload.id),
    text(payload.accountId),
    nullable(payload.categoryId),
    text(payload.name),
    text(payload.amountMinor),
    text(payload.currency, 'INR'),
    text(payload.frequency, 'MONTHLY'),
    text(payload.nextOccurrenceAt, now),
    payload.paused ? 1 : 0,
    now,
    now,
  );
}

async function upsertGoal(payload: Record<string, unknown>) {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO goals (id, name, type, target_amount_minor, current_amount_minor, currency, target_date, linked_account_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, type = excluded.type, target_amount_minor = excluded.target_amount_minor,
       current_amount_minor = excluded.current_amount_minor, currency = excluded.currency,
       target_date = excluded.target_date, linked_account_id = excluded.linked_account_id,
       updated_at = excluded.updated_at, deleted_at = NULL`,
    text(payload.id),
    text(payload.name),
    text(payload.type, 'CUSTOM'),
    text(payload.targetAmountMinor),
    text(payload.currentAmountMinor, '0'),
    text(payload.currency, 'INR'),
    nullable(payload.targetDate),
    nullable(payload.linkedAccountId),
    now,
    now,
  );
}

async function upsertLoan(payload: Record<string, unknown>) {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO loans (id, account_id, name, principal_minor, outstanding_principal_minor, annual_interest_rate, tenure_months, emi_amount_minor, start_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       account_id = excluded.account_id, name = excluded.name, principal_minor = excluded.principal_minor,
       outstanding_principal_minor = excluded.outstanding_principal_minor, annual_interest_rate = excluded.annual_interest_rate,
       tenure_months = excluded.tenure_months, emi_amount_minor = excluded.emi_amount_minor,
       start_date = excluded.start_date, updated_at = excluded.updated_at, deleted_at = NULL`,
    text(payload.id),
    nullable(payload.accountId),
    text(payload.name),
    text(payload.principalMinor),
    text(payload.outstandingPrincipalMinor),
    Number(payload.annualInterestRate ?? 0),
    Number(payload.tenureMonths ?? 1),
    text(payload.emiAmountMinor),
    text(payload.startDate, now),
    now,
    now,
  );
}

async function upsertInvestment(payload: Record<string, unknown>) {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO investments (id, linked_account_id, name, type, invested_amount_minor, current_value_minor, currency, last_valuation_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       linked_account_id = excluded.linked_account_id, name = excluded.name, type = excluded.type,
       invested_amount_minor = excluded.invested_amount_minor, current_value_minor = excluded.current_value_minor,
       currency = excluded.currency, last_valuation_date = excluded.last_valuation_date,
       updated_at = excluded.updated_at, deleted_at = NULL`,
    text(payload.id),
    nullable(payload.linkedAccountId),
    text(payload.name),
    text(payload.type, 'OTHER'),
    text(payload.investedAmountMinor),
    text(payload.currentValueMinor),
    text(payload.currency, 'INR'),
    nullable(payload.lastValuationDate),
    now,
    now,
  );
}

async function softDeleteLocal(entityType: string, entityId: string) {
  const table = tableFor(entityType);
  if (!table) {
    return;
  }
  const database = await getLocalDatabase();
  await database.runAsync(`UPDATE ${table} SET deleted_at = ?, updated_at = ? WHERE id = ?`, new Date().toISOString(), new Date().toISOString(), entityId);
}

async function recordConflict(change: RemoteChange, localPayload: string) {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT OR REPLACE INTO sync_conflicts (
      id, entity_type, entity_id, local_payload, remote_payload, conflict_reason, server_version, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    change.clientChangeId,
    change.entityType,
    change.entityId,
    localPayload,
    JSON.stringify(change.payload),
    change.conflictReason ?? 'Remote change conflict',
    change.serverVersion,
    now,
  );
}

async function getMetadata(key: string) {
  const database = await getLocalDatabase();
  const row = await database.getFirstAsync<{ value: string }>('SELECT value FROM local_metadata WHERE key = ?', key);
  return row?.value ?? null;
}

async function setMetadata(key: string, value: string) {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO local_metadata (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key,
    value,
    now,
  );
}

function nextRetryAt(retryCount: number) {
  const delaySeconds = Math.min(300, 2 ** Math.min(retryCount, 8));
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
}

function tableFor(entityType: string) {
  const allowed: Record<string, string> = {
    accounts: 'accounts',
    transactions: 'transactions',
    budgets: 'budgets',
    recurring_transactions: 'recurring_transactions',
    goals: 'goals',
    loans: 'loans',
    investments: 'investments',
  };
  return allowed[entityType];
}

function text(value: unknown, fallback = '') {
  return String(value ?? fallback);
}

function nullable(value: unknown) {
  return value === undefined || value === null ? null : String(value);
}
