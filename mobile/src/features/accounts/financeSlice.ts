import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AnyAction } from 'redux';
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
import { parseAmountToMinor } from '@/utils/money';
import {
  createLocalAccount,
  createLocalBudget,
  createLocalGoal,
  createLocalInvestment,
  createLocalLoan,
  createLocalNotification,
  createLocalRecurring,
  createLocalTransaction,
  createLocalTransfer,
  listLocalAccounts,
  listLocalBudgets,
  listLocalCategories,
  listLocalGoals,
  listLocalInvestments,
  listLocalLoans,
  listLocalNotifications,
  listLocalRecurring,
  listLocalTransactions,
} from './localFinanceRepository';

type FinanceState = {
  accounts: LocalAccount[];
  categories: LocalCategory[];
  transactions: LocalTransaction[];
  budgets: LocalBudget[];
  recurring: LocalRecurring[];
  notifications: LocalNotification[];
  goals: LocalGoal[];
  loans: LocalLoan[];
  investments: LocalInvestment[];
  status: 'idle' | 'loading' | 'saving';
  error: string | null;
};

const initialState: FinanceState = {
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  recurring: [],
  notifications: [],
  goals: [],
  loans: [],
  investments: [],
  status: 'idle',
  error: null,
};

export const loadFinance = createAsyncThunk('finance/load', async () => {
  const [accounts, categories, transactions, budgets, recurring, notifications, goals, loans, investments] = await Promise.all([
    listLocalAccounts(),
    listLocalCategories(),
    listLocalTransactions(),
    listLocalBudgets(),
    listLocalRecurring(),
    listLocalNotifications(),
    listLocalGoals(),
    listLocalLoans(),
    listLocalInvestments(),
  ]);
  return { accounts, categories, transactions, budgets, recurring, notifications, goals, loans, investments };
});

export const addAccount = createAsyncThunk(
  'finance/addAccount',
  async (input: { name: string; type: AccountType; openingBalance: string; currency: string }) => {
    return createLocalAccount({
      name: input.name,
      type: input.type,
      openingBalanceMinor: parseAmountToMinor(input.openingBalance),
      currency: input.currency,
    });
  },
);

export const addTransaction = createAsyncThunk(
  'finance/addTransaction',
  async (input: {
    accountId: string;
    categoryId?: string | null;
    type: Exclude<TransactionType, 'TRANSFER'>;
    direction: 'DEBIT' | 'CREDIT';
    amount: string;
    currency: string;
    merchant?: string;
    notes?: string;
  }) => {
    return createLocalTransaction({
      ...input,
      amountMinor: parseAmountToMinor(input.amount),
    });
  },
);

export const addTransfer = createAsyncThunk(
  'finance/addTransfer',
  async (input: { sourceAccountId: string; destinationAccountId: string; amount: string; currency: string; notes?: string }) => {
    return createLocalTransfer({
      ...input,
      amountMinor: parseAmountToMinor(input.amount),
    });
  },
);

export const addBudget = createAsyncThunk(
  'finance/addBudget',
  async (input: { name: string; categoryId: string; amount: string; currency: string; alertThresholdPercent: number }) => {
    return createLocalBudget({
      ...input,
      amountMinor: parseAmountToMinor(input.amount),
      periodType: 'MONTHLY',
    });
  },
);

export const addRecurring = createAsyncThunk(
  'finance/addRecurring',
  async (input: { accountId: string; categoryId?: string | null; name: string; amount: string; currency: string }) => {
    const recurring = await createLocalRecurring({
      ...input,
      amountMinor: parseAmountToMinor(input.amount),
      frequency: 'MONTHLY',
    });
    await createLocalNotification({
      type: 'RECURRING_REMINDER',
      title: recurring.name,
      body: `Upcoming ${recurring.name} for ${recurring.currency}`,
      scheduledAt: recurring.nextOccurrenceAt,
    });
    return recurring;
  },
);

export const addGoal = createAsyncThunk(
  'finance/addGoal',
  async (input: { name: string; targetAmount: string; currentAmount: string; currency: string; targetDate?: string | null }) => {
    return createLocalGoal({
      name: input.name,
      type: 'CUSTOM',
      targetAmountMinor: parseAmountToMinor(input.targetAmount),
      currentAmountMinor: parseAmountToMinor(input.currentAmount || '0'),
      currency: input.currency,
      targetDate: input.targetDate,
    });
  },
);

export const addLoan = createAsyncThunk(
  'finance/addLoan',
  async (input: { name: string; principal: string; annualInterestRate: string; tenureMonths: string; accountId?: string | null }) => {
    return createLocalLoan({
      name: input.name,
      accountId: input.accountId,
      principalMinor: parseAmountToMinor(input.principal),
      annualInterestRate: Number(input.annualInterestRate || '0'),
      tenureMonths: Number(input.tenureMonths || '1'),
    });
  },
);

export const addInvestment = createAsyncThunk(
  'finance/addInvestment',
  async (input: { name: string; investedAmount: string; currentValue: string; currency: string }) => {
    return createLocalInvestment({
      name: input.name,
      type: 'OTHER',
      investedAmountMinor: parseAmountToMinor(input.investedAmount),
      currentValueMinor: parseAmountToMinor(input.currentValue),
      currency: input.currency,
    });
  },
);

const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {
    clearFinanceError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadFinance.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadFinance.fulfilled, (state, action: PayloadAction<{
        accounts: LocalAccount[];
        categories: LocalCategory[];
        transactions: LocalTransaction[];
        budgets: LocalBudget[];
        recurring: LocalRecurring[];
        notifications: LocalNotification[];
        goals: LocalGoal[];
        loans: LocalLoan[];
        investments: LocalInvestment[];
      }>) => {
        state.accounts = action.payload.accounts;
        state.categories = action.payload.categories;
        state.transactions = action.payload.transactions;
        state.budgets = action.payload.budgets;
        state.recurring = action.payload.recurring;
        state.notifications = action.payload.notifications;
        state.goals = action.payload.goals;
        state.loans = action.payload.loans;
        state.investments = action.payload.investments;
        state.status = 'idle';
      })
      .addCase(loadFinance.rejected, (state, action) => {
        state.status = 'idle';
        state.error = action.error.message ?? 'Unable to load local data';
      })
      .addCase(addAccount.pending, markSaving)
      .addCase(addTransaction.pending, markSaving)
      .addCase(addTransfer.pending, markSaving)
      .addCase(addBudget.pending, markSaving)
      .addCase(addRecurring.pending, markSaving)
      .addCase(addGoal.pending, markSaving)
      .addCase(addLoan.pending, markSaving)
      .addCase(addInvestment.pending, markSaving)
      .addCase(addAccount.fulfilled, (state, action: PayloadAction<LocalAccount>) => {
        state.accounts.unshift(action.payload);
        state.status = 'idle';
      })
      .addCase(addTransaction.fulfilled, (state, action: PayloadAction<LocalTransaction>) => {
        state.transactions.unshift(action.payload);
        state.status = 'idle';
      })
      .addCase(addTransfer.fulfilled, (state, action: PayloadAction<LocalTransaction[]>) => {
        state.transactions.unshift(...action.payload);
        state.status = 'idle';
      })
      .addCase(addBudget.fulfilled, (state, action: PayloadAction<LocalBudget>) => {
        state.budgets.unshift(action.payload);
        state.status = 'idle';
      })
      .addCase(addRecurring.fulfilled, (state, action: PayloadAction<LocalRecurring>) => {
        state.recurring.unshift(action.payload);
        state.status = 'idle';
      })
      .addCase(addGoal.fulfilled, (state, action: PayloadAction<LocalGoal>) => {
        state.goals.unshift(action.payload);
        state.status = 'idle';
      })
      .addCase(addLoan.fulfilled, (state, action: PayloadAction<LocalLoan>) => {
        state.loans.unshift(action.payload);
        state.status = 'idle';
      })
      .addCase(addInvestment.fulfilled, (state, action: PayloadAction<LocalInvestment>) => {
        state.investments.unshift(action.payload);
        state.status = 'idle';
      })
      .addMatcher(
        (action): action is AnyAction => action.type.startsWith('finance/') && action.type.endsWith('/rejected'),
        (state, action) => {
          state.status = 'idle';
          state.error = action.error?.message ?? 'Unable to save local change';
        },
      );
  },
});

function markSaving(state: FinanceState) {
  state.status = 'saving';
  state.error = null;
}

export const { clearFinanceError } = financeSlice.actions;
export const financeReducer = financeSlice.reducer;
