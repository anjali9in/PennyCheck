import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { Screen } from '@/components/Screen';
import { loadFinance } from '@/features/accounts/financeSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { formatMinorAmount } from '@/utils/money';

export function TransactionsScreen() {
  const dispatch = useAppDispatch();
  const { accounts, transactions, status } = useAppSelector((state) => state.finance);

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="headlineSmall">Transactions</Text>
        <Text variant="bodySmall">{status === 'loading' ? 'Refreshing...' : 'Stored locally on this device'}</Text>
      </View>
      <Text onPress={() => dispatch(loadFinance())}>Pull latest local data</Text>
      {transactions.length === 0 ? <Text>No transactions yet.</Text> : null}
      {transactions.map((transaction) => {
        const account = accounts.find((item) => item.id === transaction.accountId);
        const sign = transaction.direction === 'DEBIT' ? '-' : '+';
        return (
          <Card key={transaction.id} mode="outlined">
            <Card.Content style={styles.row}>
              <View style={styles.details}>
                <Text variant="titleMedium">{transaction.merchant ?? transaction.type.replace('_', ' ')}</Text>
                <Text variant="bodySmall">{account?.name ?? 'Account'} · {new Date(transaction.occurredAt).toLocaleDateString()}</Text>
              </View>
              <Text variant="titleMedium">
                {sign}
                {formatMinorAmount(transaction.amountMinor, transaction.currency)}
              </Text>
            </Card.Content>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  details: {
    flex: 1,
    gap: 4,
  },
});
