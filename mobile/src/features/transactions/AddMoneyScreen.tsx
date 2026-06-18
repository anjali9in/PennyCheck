import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { Screen } from '@/components/Screen';
import { addTransaction, addTransfer, loadFinance } from '@/features/accounts/financeSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

type Mode = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export function AddMoneyScreen() {
  const dispatch = useAppDispatch();
  const { accounts, categories, status, error } = useAppSelector((state) => state.finance);
  const [mode, setMode] = useState<Mode>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');

  const sourceAccount = accounts[0];
  const destinationAccount = accounts[1];
  const category = categories.find((item) => item.type === (mode === 'INCOME' ? 'INCOME' : 'EXPENSE'));

  const onSave = async () => {
    if (!sourceAccount) {
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
        categoryId: category?.id,
        type: mode,
        direction: mode === 'INCOME' ? 'CREDIT' : 'DEBIT',
        amount,
        currency: sourceAccount.currency,
        merchant: merchant || mode,
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
      <Text variant="headlineSmall">Add</Text>
      <Card mode="contained">
        <Card.Content style={styles.form}>
          <SegmentedButtons
            value={mode}
            onValueChange={(value) => setMode(value as Mode)}
            buttons={[
              { value: 'EXPENSE', label: 'Expense' },
              { value: 'INCOME', label: 'Income' },
              { value: 'TRANSFER', label: 'Transfer' },
            ]}
          />

          {!sourceAccount ? (
            <Text>Create an account before adding transactions.</Text>
          ) : (
            <View style={styles.form}>
              <Text variant="bodyMedium">
                {mode === 'TRANSFER' && destinationAccount
                  ? `${sourceAccount.name} to ${destinationAccount.name}`
                  : sourceAccount.name}
              </Text>
              <TextInput label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
              {mode !== 'TRANSFER' ? <TextInput label="Merchant or payee" value={merchant} onChangeText={setMerchant} /> : null}
              <TextInput label="Notes" value={notes} onChangeText={setNotes} />
              {mode === 'TRANSFER' && !destinationAccount ? <Text>Add a second account to transfer money.</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button
                mode="contained"
                onPress={onSave}
                disabled={!amount || status === 'saving' || (mode === 'TRANSFER' && !destinationAccount)}
              >
                Save
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
  },
  error: {
    color: '#B3261E',
  },
});
