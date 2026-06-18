import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AnyAction } from 'redux';
import { AccountType, LocalAccount, LocalCategory, LocalTransaction, TransactionType } from '@/types/domain';
import { parseAmountToMinor } from '@/utils/money';
import {
  createLocalAccount,
  createLocalTransaction,
  createLocalTransfer,
  listLocalAccounts,
  listLocalCategories,
  listLocalTransactions,
} from './localFinanceRepository';

type FinanceState = {
  accounts: LocalAccount[];
  categories: LocalCategory[];
  transactions: LocalTransaction[];
  status: 'idle' | 'loading' | 'saving';
  error: string | null;
};

const initialState: FinanceState = {
  accounts: [],
  categories: [],
  transactions: [],
  status: 'idle',
  error: null,
};

export const loadFinance = createAsyncThunk('finance/load', async () => {
  const [accounts, categories, transactions] = await Promise.all([
    listLocalAccounts(),
    listLocalCategories(),
    listLocalTransactions(),
  ]);
  return { accounts, categories, transactions };
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
      }>) => {
        state.accounts = action.payload.accounts;
        state.categories = action.payload.categories;
        state.transactions = action.payload.transactions;
        state.status = 'idle';
      })
      .addCase(loadFinance.rejected, (state, action) => {
        state.status = 'idle';
        state.error = action.error.message ?? 'Unable to load local data';
      })
      .addCase(addAccount.pending, markSaving)
      .addCase(addTransaction.pending, markSaving)
      .addCase(addTransfer.pending, markSaving)
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
