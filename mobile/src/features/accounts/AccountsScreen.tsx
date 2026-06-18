import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { Screen } from '@/components/Screen';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { AccountType } from '@/types/domain';
import { formatMinorAmount } from '@/utils/money';
import { addAccount, loadFinance } from './financeSlice';

const accountTypes: AccountType[] = ['CASH', 'SAVINGS', 'UPI_WALLET', 'CREDIT_CARD'];

export function AccountsScreen() {
  const dispatch = useAppDispatch();
  const { accounts, status, error } = useAppSelector((state) => state.finance);
  const [name, setName] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [type, setType] = useState<AccountType>('SAVINGS');

  const onCreate = async () => {
    await dispatch(addAccount({ name, type, openingBalance, currency: 'INR' }));
    setName('');
    setOpeningBalance('0');
    dispatch(loadFinance());
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="headlineSmall">Accounts</Text>
        <Text variant="bodyMedium">Balances update immediately from local SQLite.</Text>
      </View>

      <Card mode="contained">
        <Card.Content style={styles.form}>
          <TextInput label="Account name" value={name} onChangeText={setName} accessibilityLabel="Account name" />
          <SegmentedButtons
            value={type}
            onValueChange={(value) => setType(value as AccountType)}
            buttons={accountTypes.map((item) => ({ value: item, label: item.replace('_', ' ') }))}
          />
          <TextInput
            label="Opening balance"
            value={openingBalance}
            onChangeText={setOpeningBalance}
            keyboardType="decimal-pad"
            accessibilityLabel="Opening balance"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button mode="contained" onPress={onCreate} disabled={!name.trim() || status === 'saving'}>
            Add account
          </Button>
        </Card.Content>
      </Card>

      {accounts.map((account) => (
        <Card key={account.id} mode="outlined">
          <Card.Content style={styles.accountRow}>
            <View>
              <Text variant="titleMedium">{account.name}</Text>
              <Text variant="bodySmall">{account.type.replace('_', ' ')}</Text>
            </View>
            <Text variant="titleMedium">{formatMinorAmount(account.currentBalanceMinor, account.currency)}</Text>
          </Card.Content>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
  },
  form: {
    gap: 12,
  },
  accountRow: {
    minHeight: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  error: {
    color: '#B3261E',
  },
});
