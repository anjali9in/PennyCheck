export function parseAmountToMinor(value: string): string {
  const normalized = value.trim().replace(/,/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    throw new Error('Enter a valid amount');
  }
  const [major, minor = ''] = normalized.split('.');
  return `${BigInt(major || '0') * 100n + BigInt((minor + '00').slice(0, 2))}`;
}

export function formatMinorAmount(amountMinor: string, currency = 'INR') {
  const amount = BigInt(amountMinor || '0');
  const sign = amount < 0 ? '-' : '';
  const absolute = amount < 0 ? -amount : amount;
  const major = absolute / 100n;
  const minor = absolute % 100n;
  return `${sign}${currency} ${major.toString()}.${minor.toString().padStart(2, '0')}`;
}

export function addMinor(left: string, right: string) {
  return `${BigInt(left) + BigInt(right)}`;
}

export function negateMinor(value: string) {
  return `${-BigInt(value)}`;
}
