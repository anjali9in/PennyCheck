import { LocalAccount, LocalCategory } from '@/types/domain';
import { parseAmountToMinor } from '@/utils/money';
import { hasLocalDuplicate } from '@/features/accounts/localFinanceRepository';

export type ImportPreviewItem = {
  id: string;
  rowNumber: number;
  accountId: string;
  occurredAt: string;
  narration: string;
  merchant: string;
  amountMinor: string;
  direction: 'DEBIT' | 'CREDIT';
  categoryId?: string | null;
  referenceNumber?: string | null;
  duplicate: boolean;
  valid: boolean;
  errors: string[];
};

export async function previewCsvImport(input: {
  csv: string;
  account: LocalAccount;
  categories: LocalCategory[];
}): Promise<ImportPreviewItem[]> {
  const records = parseCsv(input.csv);
  if (records.length < 2) {
    throw new Error('CSV must include a header and at least one transaction row');
  }
  const headers = records[0].map((header) => header.trim());
  const rows = records.slice(1);
  const seen = new Set<string>();
  const preview: ImportPreviewItem[] = [];

  for (let index = 0; index < rows.length; index++) {
    const raw = Object.fromEntries(headers.map((header, column) => [header, rows[index][column]?.trim() ?? '']));
    const narration = raw.Narration || raw.Description || raw.Particulars || '';
    const merchant = merchantFromNarration(narration);
    const referenceNumber = raw.Reference || raw.UTR || raw['Reference No'] || null;
    const errors: string[] = [];
    let occurredAt = '';
    let amountMinor = '0';
    let direction: 'DEBIT' | 'CREDIT' = 'DEBIT';

    try {
      occurredAt = parseStatementDate(raw.Date || raw['Txn Date'] || raw.ValueDate || '');
    } catch {
      errors.push('Invalid date');
    }

    try {
      const debit = raw.Debit || raw.Withdrawal || '';
      const credit = raw.Credit || raw.Deposit || '';
      if (debit) {
        amountMinor = parseAmountToMinor(cleanAmount(debit));
        direction = 'DEBIT';
      } else if (credit) {
        amountMinor = parseAmountToMinor(cleanAmount(credit));
        direction = 'CREDIT';
      } else {
        const amount = raw.Amount || '';
        amountMinor = parseAmountToMinor(cleanAmount(amount));
        direction = /CR|CREDIT/i.test(raw.Type || raw.Direction || amount) ? 'CREDIT' : 'DEBIT';
      }
    } catch {
      errors.push('Invalid amount');
    }

    const categoryId = suggestCategory(input.categories, narration, merchant, direction);
    const fingerprint = `${occurredAt}|${amountMinor}|${direction}|${merchant}|${referenceNumber ?? ''}`;
    const duplicate =
      seen.has(fingerprint) ||
      (await hasLocalDuplicate({
        accountId: input.account.id,
        occurredAt,
        amountMinor,
        direction,
        merchant,
        referenceNumber,
      }));
    seen.add(fingerprint);

    preview.push({
      id: `row-${index + 2}`,
      rowNumber: index + 2,
      accountId: input.account.id,
      occurredAt,
      narration,
      merchant,
      amountMinor,
      direction,
      categoryId,
      referenceNumber,
      duplicate,
      valid: errors.length === 0,
      errors,
    });
  }

  return preview;
}

function parseCsv(content: string) {
  const records: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"') {
      if (quoted && content[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && content[i + 1] === '\n') {
        i++;
      }
      row.push(cell);
      if (!row.every((value) => value.trim() === '')) {
        records.push(row);
      }
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (!row.every((value) => value.trim() === '')) {
    records.push(row);
  }
  return records;
}

function cleanAmount(value: string) {
  return value.replace(/₹|,/g, '').replace(/CR|DR/gi, '').trim().replace(/^\((.*)\)$/, '-$1');
}

function parseStatementDate(value: string) {
  const normalized = value.trim();
  const match = normalized.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (match) {
    return new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00.000Z`).toISOString();
  }
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid date');
  }
  return parsed.toISOString();
}

function merchantFromNarration(narration: string) {
  const upper = narration.toUpperCase();
  if (upper.includes('UPI-')) {
    return upper.split('-')[1]?.replace(/[^A-Z0-9 ]/g, '').trim() || upper;
  }
  return upper.replace(/\s+/g, ' ').trim();
}

function suggestCategory(categories: LocalCategory[], narration: string, merchant: string, direction: 'DEBIT' | 'CREDIT') {
  if (direction === 'CREDIT' && /SALARY/i.test(narration)) {
    return categories.find((category) => category.name === 'Salary Income')?.id;
  }
  const haystack = `${narration} ${merchant}`.toUpperCase();
  const rules: [RegExp, string][] = [
    [/SWIGGY|ZOMATO/, 'Food & Dining'],
    [/UBER|OLA/, 'Transport'],
    [/AMAZON|FLIPKART/, 'Shopping'],
    [/ELECTRICITY|BSES/, 'Utilities'],
  ];
  const match = rules.find(([pattern]) => pattern.test(haystack));
  return categories.find((category) => category.name === (match?.[1] ?? (direction === 'CREDIT' ? 'Salary Income' : 'Food & Dining')))?.id;
}
