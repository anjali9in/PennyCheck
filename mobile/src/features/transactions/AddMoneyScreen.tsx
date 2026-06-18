import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Chip, HelperText, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';
import { Screen } from '@/components/Screen';
import { addTransaction, addTransfer, loadFinance } from '@/features/accounts/financeSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { AccountType, LocalAccount } from '@/types/domain';
import { formatMinorAmount } from '@/utils/money';

type Mode = 'EXPENSE' | 'INCOME' | 'TRANSFER';

const quickAmounts = ['100', '250', '500', '1000'];

export function AddMoneyScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { accounts, categories, status, error } = useAppSelector((state) => state.finance);
  const [mode, setMode] = useState<Mode>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [destinationAccountId, setDestinationAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const sourceAccount = useMemo(() => {
    return accounts.find((account) => account.id === accountId) ?? accounts[0] ?? null;
  }, [accountId, accounts]);
  const destinationAccount = useMemo(() => {
    return accounts.find((account) => account.id === destinationAccountId && account.id !== sourceAccount?.id)
      ?? accounts.find((account) => account.id !== sourceAccount?.id)
      ?? null;
  }, [accounts, destinationAccountId, sourceAccount?.id]);
  const availableCategories = categories.filter((item) => item.type === (mode === 'INCOME' ? 'INCOME' : 'EXPENSE'));
  const selectedCategory = availableCategories.find((item) => item.id === categoryId) ?? availableCategories[0] ?? null;
  const isSaving = status === 'saving';
  const canSave = Boolean(sourceAccount && amount.trim() && (mode !== 'TRANSFER' || destinationAccount));
  const accentColor = mode === 'EXPENSE' ? theme.colors.error : mode === 'INCOME' ? theme.colors.tertiary : theme.colors.primary;

  const onSave = async () => {
    if (!sourceAccount || !canSave) {
      return;
    }
    if (mode === 'TRANSFER') {
      if (!destinationAccount) {
        return;
      }
      await dispatch(addTransfer({
        sourceAccountId: sourceAccount.id,
        destinationAccountId: destinationAccount.id,
        amount,
        currency: sourceAccount.currency,
        notes,
      }));
    } else {
      await dispatch(addTransaction({
        accountId: sourceAccount.id,
        categoryId: selectedCategory?.id,
        type: mode,
        direction: mode === 'INCOME' ? 'CREDIT' : 'DEBIT',
        amount,
        currency: sourceAccount.currency,
        merchant: merchant.trim() || selectedCategory?.name || mode,
        notes,
      }));
    }
    setAmount('');
    setMerchant('');
    setNotes('');
    dispatch(loadFinance());
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="headlineSmall">Add money movement</Text>
        <Text variant="bodyMedium">Record an expense, income, or transfer in your local ledger.</Text>
      </View>

      <SegmentedButtons
        value={mode}
        onValueChange={(value) => {
          setMode(value as Mode);
          setCategoryId(null);
        }}
        buttons={[
          { value: 'EXPENSE', label: 'Expense' },
          { value: 'INCOME', label: 'Income' },
          { value: 'TRANSFER', label: 'Transfer' },
        ]}
      />

      <Card mode="contained">
        <Card.Content style={styles.amountPanel}>
          <Text variant="labelLarge" style={{ color: accentColor }}>
            {mode === 'EXPENSE' ? 'Money out' : mode === 'INCOME' ? 'Money in' : 'Move between accounts'}
          </Text>
          <TextInput
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            accessibilityLabel="Transaction amount"
            left={<TextInput.Affix text={sourceAccount?.currency ?? 'INR'} />}
            style={styles.amountInput}
          />
          <View style={styles.chipRow}>
            {quickAmounts.map((quickAmount) => (
              <Chip key={quickAmount} compact onPress={() => setAmount(quickAmount)}>
                {quickAmount}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      {!sourceAccount ? (
        <Card mode="outlined">
          <Card.Content style={styles.form}>
            <Text variant="titleMedium">Create an account first</Text>
            <Text variant="bodyMedium">Transactions need at least one cash, bank, wallet, or card account.</Text>
          </Card.Content>
        </Card>
      ) : (
        <>
          <Card mode="outlined">
            <Card.Content style={styles.form}>
              <SectionTitle title={mode === 'TRANSFER' ? 'From account' : 'Account'} />
              <AccountChips accounts={accounts} selectedId={sourceAccount.id} onSelect={setAccountId} />
              <AccountSummary account={sourceAccount} />

              {mode === 'TRANSFER' ? (
                <>
                  <SectionTitle title="To account" />
                  {destinationAccount ? (
                    <>
                      <AccountChips
                        accounts={accounts.filter((account) => account.id !== sourceAccount.id)}
                        selectedId={destinationAccount.id}
                        onSelect={setDestinationAccountId}
                      />
                      <AccountSummary account={destinationAccount} />
                    </>
                  ) : (
                    <HelperText type="error">Add a second account to transfer money.</HelperText>
                  )}
                </>
              ) : null}
            </Card.Content>
          </Card>

          {mode !== 'TRANSFER' ? (
            <Card mode="outlined">
              <Card.Content style={styles.form}>
                <SectionTitle title="Details" />
                {availableCategories.length > 0 ? (
                  <View style={styles.chipRow}>
                    {availableCategories.slice(0, 8).map((category) => (
                      <Chip
                        key={category.id}
                        selected={(selectedCategory?.id ?? null) === category.id}
                        onPress={() => setCategoryId(category.id)}
                      >
                        {category.name}
                      </Chip>
                    ))}
                  </View>
                ) : null}
                <TextInput
                  label={mode === 'INCOME' ? 'Payer' : 'Merchant or payee'}
                  value={merchant}
                  onChangeText={setMerchant}
                  accessibilityLabel={mode === 'INCOME' ? 'Payer' : 'Merchant or payee'}
                />
                <TextInput
                  label="Notes"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  accessibilityLabel="Transaction notes"
                />
              </Card.Content>
            </Card>
          ) : (
            <Card mode="outlined">
              <Card.Content style={styles.form}>
                <SectionTitle title="Transfer note" />
                <TextInput label="Notes" value={notes} onChangeText={setNotes} accessibilityLabel="Transfer notes" />
              </Card.Content>
            </Card>
          )}

          <Card mode="contained">
            <Card.Content style={styles.reviewPanel}>
              <View style={styles.reviewRow}>
                <Text variant="titleMedium">Review</Text>
                <Text variant="titleMedium" style={{ color: accentColor }}>
                  {amount.trim() ? `${mode === 'EXPENSE' ? '-' : '+'}${sourceAccount.currency} ${amount}` : `${sourceAccount.currency} 0`}
                </Text>
              </View>
              <Text variant="bodySmall">
                {mode === 'TRANSFER' && destinationAccount
                  ? `${sourceAccount.name} to ${destinationAccount.name}`
                  : `${sourceAccount.name}${selectedCategory ? ` · ${selectedCategory.name}` : ''}`}
              </Text>
              {error ? <HelperText type="error">{error}</HelperText> : null}
              <Button mode="contained" onPress={onSave} disabled={!canSave || isSaving} loading={isSaving}>
                Save {mode.toLowerCase().replace('_', ' ')}
              </Button>
            </Card.Content>
          </Card>
        </>
      )}
    </Screen>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text variant="titleMedium">{title}</Text>;
}

function AccountChips({
  accounts,
  selectedId,
  onSelect,
}: {
  accounts: LocalAccount[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {accounts.map((account) => (
        <Chip key={account.id} selected={account.id === selectedId} onPress={() => onSelect(account.id)}>
          {account.name}
        </Chip>
      ))}
    </View>
  );
}

function AccountSummary({ account }: { account: LocalAccount }) {
  return (
    <View style={styles.accountSummary}>
      <Text variant="bodySmall">{formatAccountType(account.type)}</Text>
      <Text variant="bodySmall">{formatMinorAmount(account.currentBalanceMinor, account.currency)}</Text>
    </View>
  );
}

function formatAccountType(type: AccountType) {
  return type.replace('_', ' ').toLowerCase().replace(/\b\w/g, (match) => match.toUpperCase());
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
  },
  form: {
    gap: 12,
  },
  amountPanel: {
    gap: 12,
  },
  amountInput: {
    minHeight: 72,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accountSummary: {
    minHeight: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  reviewPanel: {
    gap: 12,
  },
  reviewRow: {
    minHeight: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
});
