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
  return previewStatementImport({
    content: input.csv,
    account: input.account,
    categories: input.categories,
  });
}

export async function previewStatementImport(input: {
  content: string;
  account: LocalAccount;
  categories: LocalCategory[];
}): Promise<ImportPreviewItem[]> {
  const records = parseStatementRecords(input.content);
  if (records.length < 2) {
    throw new Error('Statement must include a header and at least one transaction row');
  }
  const headers = records[0].map((header) => header.trim());
  const rows = records.slice(1);
  const seen = new Set<string>();
  const preview: ImportPreviewItem[] = [];

  for (let index = 0; index < rows.length; index++) {
    const raw = Object.fromEntries(headers.map((header, column) => [header, rows[index][column]?.trim() ?? '']));
    const narration = field(raw, 'Narration', 'Description', 'Particulars', 'Details') || '';
    const merchant = merchantFromNarration(narration);
    const referenceNumber = field(raw, 'Reference', 'UTR', 'Reference No', 'Chq./Ref.No.') || null;
    const errors: string[] = [];
    let occurredAt = '';
    let amountMinor = '0';
    let direction: 'DEBIT' | 'CREDIT' = 'DEBIT';

    try {
      occurredAt = parseStatementDate(field(raw, 'Date', 'Txn Date', 'ValueDate', 'Value Dt') || '');
    } catch {
      errors.push('Invalid date');
    }

    try {
      const debit = field(raw, 'Debit', 'Withdrawal', 'Withdrawal Amt.') || '';
      const credit = field(raw, 'Credit', 'Deposit', 'Deposit Amt.') || '';
      if (debit) {
        amountMinor = parseAmountToMinor(cleanAmount(debit));
        direction = 'DEBIT';
      } else if (credit) {
        amountMinor = parseAmountToMinor(cleanAmount(credit));
        direction = 'CREDIT';
      } else {
        const amount = field(raw, 'Amount') || '';
        amountMinor = parseAmountToMinor(cleanAmount(amount));
        direction = /CR|CREDIT/i.test(field(raw, 'Type', 'Direction') || amount) ? 'CREDIT' : 'DEBIT';
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

function parseStatementRecords(content: string) {
  const normalized = content.replace(/^\uFEFF/, '');
  if (looksLikeCsv(normalized)) {
    return parseCsv(normalized);
  }
  const phonePeRecords = parsePhonePeStatement(normalized);
  if (phonePeRecords.length > 1) {
    return phonePeRecords;
  }
  return parseFixedWidthBankStatement(normalized);
}

function looksLikeCsv(content: string) {
  const firstDataLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return Boolean(firstDataLine?.includes(','));
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

function parsePhonePeStatement(content: string) {
  const headers = ['Date', 'Narration', 'Reference', 'Type', 'Amount'];
  const rows: string[][] = [headers];
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = 0; index < lines.length; index++) {
    if (!phonePeDatePattern.test(lines[index]) || !phonePeTimePattern.test(lines[index + 1] ?? '')) {
      continue;
    }

    const date = lines[index];
    const time = lines[index + 1];
    const details: string[] = [];
    let reference = '';
    let type = '';
    let amount = '';

    index += 2;
    while (index < lines.length) {
      const line = lines[index];
      if (phonePeDatePattern.test(line) || shouldSkipPhonePeLine(line)) {
        index--;
        break;
      }
      if (line.startsWith('Transaction ID')) {
        index++;
        continue;
      }
      if (line.startsWith('UTR No')) {
        reference = valueAfterColon(line);
        index++;
        continue;
      }
      if (line.startsWith('Debited from') || line.startsWith('Credited to')) {
        index++;
        continue;
      }

      const amountMatch = line.match(/^(Debit|Credit)\s+INR\s*([\d,]+(?:\.\d{1,2})?)?$/i);
      if (amountMatch) {
        type = amountMatch[1].toUpperCase();
        amount = amountMatch[2] ?? '';
        if (!amount && amountPattern.test(lines[index + 1] ?? '')) {
          amount = lines[index + 1].trim();
          index++;
        }
        break;
      }

      details.push(line);
      index++;
    }

    if (details.length > 0 && type && amount) {
      rows.push([`${date} ${time}`, details.join(' '), reference, type, amount]);
    }
  }

  return rows;
}

const phonePeDatePattern = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}$/;
const phonePeTimePattern = /^\d{1,2}:\d{2}\s+(AM|PM)$/i;

function shouldSkipPhonePeLine(line: string) {
  return (
    line.startsWith('Page ') ||
    line.startsWith('Date Transaction Details') ||
    line.startsWith('This is ') ||
    line.startsWith('Transaction Statement') ||
    line.includes('PhonePe Terms') ||
    line.includes('Privacy Policy') ||
    line.includes('support.phonepe.com')
  );
}

function valueAfterColon(line: string) {
  return line.split(':').slice(1).join(':').trim();
}

function parseFixedWidthBankStatement(content: string) {
  const headers = ['Date', 'Narration', 'Reference', 'Value Dt', 'Withdrawal Amt.', 'Deposit Amt.'];
  const rows: string[][] = [headers];
  let currentRow: string[] | null = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/\t/g, ' ');
    const dateMatch = line.match(/^(\d{2}[/-]\d{2}[/-]\d{2,4})\s+/);
    if (dateMatch) {
      const narration = line.slice(10, 52).trim();
      const reference = line.slice(52, 70).trim();
      const valueDate = line.slice(70, 80).trim();
      const withdrawal = line.slice(80, 103).trim();
      const deposit = line.slice(103, 123).trim();
      if (narration && reference && (withdrawal || deposit)) {
        currentRow = [dateMatch[1], narration, reference, valueDate, withdrawal, deposit];
        rows.push(currentRow);
      }
      continue;
    }

    if (!currentRow || shouldSkipContinuation(line)) {
      continue;
    }

    const firstTextColumn = line.search(/\S/);
    if (firstTextColumn < 8 || firstTextColumn > 14) {
      continue;
    }

    const continuation = line.slice(firstTextColumn, 123).trim();
    if (continuation && !amountPattern.test(continuation)) {
      currentRow[1] = `${currentRow[1]} ${continuation}`.replace(/\s+/g, ' ').trim();
    }
  }

  return rows;
}

const amountPattern = /\d{1,3}(?:,\d{3})*\.\d{2}/;

function shouldSkipContinuation(line: string) {
  const trimmed = line.trim();
  return (
    !trimmed ||
    trimmed.includes('**Continue**') ||
    trimmed.includes('End Of Statement') ||
    trimmed.includes('STATEMENT SUMMARY') ||
    trimmed.startsWith('HDFC BANK') ||
    trimmed.startsWith('Date ') ||
    trimmed.startsWith('--------') ||
    trimmed.startsWith('********') ||
    trimmed.startsWith('Generated On:') ||
    trimmed.startsWith('State account branch GSTN') ||
    trimmed.includes('Account Branch') ||
    trimmed.includes('Account No') ||
    trimmed.includes('Account Status') ||
    trimmed.includes('Statement From') ||
    trimmed.includes('RTGS/NEFT IFSC') ||
    trimmed.includes('Branch Code') ||
    trimmed.includes('Registered Office Address')
  );
}

function cleanAmount(value: string) {
  return value.replace(/₹|,/g, '').replace(/CR|DR/gi, '').trim().replace(/^\((.*)\)$/, '-$1');
}

function parseStatementDate(value: string) {
  const normalized = value.trim();
  const monthNameMatch = normalized.match(
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})\s+(AM|PM))?$/i,
  );
  if (monthNameMatch) {
    const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(monthNameMatch[1].toLowerCase());
    let hour = Number(monthNameMatch[4] ?? 0);
    const minute = Number(monthNameMatch[5] ?? 0);
    const meridiem = monthNameMatch[6]?.toUpperCase();
    if (meridiem === 'PM' && hour < 12) {
      hour += 12;
    } else if (meridiem === 'AM' && hour === 12) {
      hour = 0;
    }
    return new Date(Date.UTC(Number(monthNameMatch[3]), month, Number(monthNameMatch[2]), hour, minute)).toISOString();
  }
  const shortYearMatch = normalized.match(/^(\d{2})[/-](\d{2})[/-](\d{2})$/);
  if (shortYearMatch) {
    return new Date(`20${shortYearMatch[3]}-${shortYearMatch[2]}-${shortYearMatch[1]}T00:00:00.000Z`).toISOString();
  }
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

function field(raw: Record<string, string>, ...names: string[]) {
  const entries = Object.entries(raw);
  for (const name of names) {
    const exact = raw[name];
    if (exact !== undefined) {
      return exact;
    }
    const normalizedName = normalizeHeader(name);
    const match = entries.find(([header]) => normalizeHeader(header) === normalizedName);
    if (match) {
      return match[1];
    }
  }
  return '';
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function merchantFromNarration(narration: string) {
  const upper = narration.toUpperCase();
  if (upper.includes('UPI-')) {
    return upper.split('-')[1]?.replace(/[^A-Z0-9 ]/g, '').trim() || upper;
  }
  if (upper.startsWith('PAID TO ')) {
    return upper.replace('PAID TO ', '').replace(/\s+/g, ' ').trim();
  }
  if (upper.startsWith('RECEIVED FROM ')) {
    return upper.replace('RECEIVED FROM ', '').replace(/\s+/g, ' ').trim();
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
