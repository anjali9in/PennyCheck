import { LocalAccount, LocalInvestment, LocalLoan, LocalTransaction } from '@/types/domain';

export function calculateNetWorthMinor(input: {
  accounts: LocalAccount[];
  investments: LocalInvestment[];
  loans: LocalLoan[];
}) {
  const creditCards = input.accounts.filter((account) => account.type === 'CREDIT_CARD');
  const accountTotal = input.accounts
    .filter((account) => account.type !== 'CREDIT_CARD' && account.type !== 'LOAN' && account.type !== 'INVESTMENT')
    .reduce((total, account) => total + BigInt(account.currentBalanceMinor), 0n);
  const investmentTotal = input.investments.reduce((total, investment) => total + BigInt(investment.currentValueMinor), 0n);
  const creditCardDebt = creditCards.reduce((total, account) => {
    const balance = BigInt(account.currentBalanceMinor);
    return total + (balance > 0n ? balance : 0n);
  }, 0n);
  const loanDebt = input.loans.reduce((total, loan) => total + BigInt(loan.outstandingPrincipalMinor), 0n);
  return String(accountTotal + investmentTotal - creditCardDebt - loanDebt);
}

export function calculateCashflowMinor(transactions: LocalTransaction[]) {
  return transactions.reduce(
    (totals, transaction) => {
      if (transaction.type === 'TRANSFER') {
        return totals;
      }
      if (transaction.direction === 'CREDIT') {
        totals.income += BigInt(transaction.amountMinor);
      } else {
        totals.expense += BigInt(transaction.amountMinor);
      }
      return totals;
    },
    { income: 0n, expense: 0n },
  );
}

export function buildTransactionsCsv(accounts: LocalAccount[], transactions: LocalTransaction[]) {
  const header = 'Date,Account,Type,Direction,Amount,Currency,Merchant,Reference,Notes';
  const accountById = Object.fromEntries(accounts.map((account) => [account.id, account.name]));
  const rows = transactions.map((transaction) => [
    transaction.occurredAt,
    accountById[transaction.accountId] ?? '',
    transaction.type,
    transaction.direction,
    (Number(transaction.amountMinor) / 100).toFixed(2),
    transaction.currency,
    transaction.merchant ?? '',
    transaction.referenceNumber ?? '',
    transaction.notes ?? '',
  ].map(csvCell).join(','));
  return [header, ...rows].join('\n');
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
