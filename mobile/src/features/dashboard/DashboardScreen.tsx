import { StyleSheet, View } from 'react-native';
import { Button, Card, ProgressBar, Text, useTheme } from 'react-native-paper';
import { Screen } from '@/components/Screen';
import { loadFinance } from '@/features/accounts/financeSlice';
import { logout } from '@/features/authentication/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { syncNow } from '@/store/slices/appSlice';
import { addMinor, formatMinorAmount } from '@/utils/money';

export function DashboardScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { email, profile, refreshToken } = useAppSelector((state) => state.auth);
  const { accounts, transactions } = useAppSelector((state) => state.finance);
  const { syncStatus, pendingSyncCount, lastSuccessfulSyncAt, syncError } = useAppSelector((state) => state.app);
  const totalBalanceMinor = accounts.reduce((total, account) => addMinor(total, account.currentBalanceMinor), '0');
  const incomeMinor = transactions
    .filter((transaction) => transaction.type === 'INCOME')
    .reduce((total, transaction) => addMinor(total, transaction.amountMinor), '0');
  const expenseMinor = transactions
    .filter((transaction) => transaction.type === 'EXPENSE')
    .reduce((total, transaction) => addMinor(total, transaction.amountMinor), '0');
  const savingsMinor = addMinor(incomeMinor, `-${expenseMinor}`);

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="titleMedium">Total balance</Text>
        <Text variant="displaySmall">{formatMinorAmount(totalBalanceMinor, 'INR')}</Text>
        <Text variant="bodyMedium">{profile?.name ?? email ?? 'No accounts added yet.'}</Text>
      </View>

      <Card mode="contained" accessible accessibilityLabel="Monthly cash flow summary">
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium">This month</Text>
          <View style={styles.metricRow}>
            <Text>Income</Text>
            <Text>{formatMinorAmount(incomeMinor, 'INR')}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text>Expenses</Text>
            <Text>{formatMinorAmount(expenseMinor, 'INR')}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text>Savings</Text>
            <Text>{formatMinorAmount(savingsMinor, 'INR')}</Text>
          </View>
        </Card.Content>
      </Card>

      <Card mode="contained" accessible accessibilityLabel="Recent local transactions">
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium">Recent transactions</Text>
          {transactions.slice(0, 3).map((transaction) => (
            <View key={transaction.id} style={styles.metricRow}>
              <Text>{transaction.merchant ?? transaction.type}</Text>
              <Text>{formatMinorAmount(transaction.amountMinor, transaction.currency)}</Text>
            </View>
          ))}
          {transactions.length === 0 ? <Text variant="bodySmall">No local transactions yet.</Text> : null}
        </Card.Content>
      </Card>

      <Card mode="contained" accessible accessibilityLabel="Budget progress summary">
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium">Budget progress</Text>
          <ProgressBar progress={0} color={theme.colors.primary} />
          <Text variant="bodySmall">Create your first budget to track progress.</Text>
        </Card.Content>
      </Card>

      <Card mode="contained" accessible accessibilityLabel="Synchronization status">
        <Card.Content style={styles.cardContent}>
          <View style={styles.metricRow}>
            <Text variant="titleMedium">Sync</Text>
            <Text>{syncStatus}</Text>
          </View>
          <Text variant="bodySmall">
            {pendingSyncCount} pending change{pendingSyncCount === 1 ? '' : 's'}
            {lastSuccessfulSyncAt ? ` · Last synced ${new Date(lastSuccessfulSyncAt).toLocaleTimeString()}` : ''}
          </Text>
          {syncError ? <Text style={styles.warning}>{syncError}</Text> : null}
          <Button
            mode="contained-tonal"
            onPress={() => dispatch(syncNow()).then(() => dispatch(loadFinance()))}
            disabled={syncStatus === 'syncing'}
          >
            Sync now
          </Button>
        </Card.Content>
      </Card>

      <Button mode="outlined" onPress={() => dispatch(logout(refreshToken))} accessibilityLabel="Log out">
        Log out
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
  },
  cardContent: {
    gap: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 32,
    alignItems: 'center',
  },
  warning: {
    color: '#B3261E',
  },
});
