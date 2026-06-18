import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, ProgressBar, Text, TextInput } from 'react-native-paper';
import { Screen } from '@/components/Screen';
import { addBudget, addRecurring, loadFinance } from '@/features/accounts/financeSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { formatMinorAmount } from '@/utils/money';

export function BudgetsScreen() {
  const dispatch = useAppDispatch();
  const { accounts, categories, budgets, recurring, notifications, status, error } = useAppSelector((state) => state.finance);
  const expenseCategory = categories.find((category) => category.type === 'EXPENSE');
  const account = accounts[0];
  const [budgetName, setBudgetName] = useState('Food budget');
  const [budgetAmount, setBudgetAmount] = useState('10000');
  const [recurringName, setRecurringName] = useState('Monthly bill');
  const [recurringAmount, setRecurringAmount] = useState('999');

  const createBudget = async () => {
    if (!expenseCategory) {
      return;
    }
    await dispatch(addBudget({
      name: budgetName,
      categoryId: expenseCategory.id,
      amount: budgetAmount,
      currency: 'INR',
      alertThresholdPercent: 80,
    }));
    dispatch(loadFinance());
  };

  const createRecurring = async () => {
    if (!account) {
      return;
    }
    await dispatch(addRecurring({
      accountId: account.id,
      categoryId: expenseCategory?.id,
      name: recurringName,
      amount: recurringAmount,
      currency: account.currency,
    }));
    dispatch(loadFinance());
  };

  return (
    <Screen>
      <Text variant="headlineSmall">Budgets</Text>
      <Card mode="contained">
        <Card.Content style={styles.form}>
          <Text variant="titleMedium">Monthly category budget</Text>
          <TextInput label="Name" value={budgetName} onChangeText={setBudgetName} />
          <TextInput label="Amount" value={budgetAmount} onChangeText={setBudgetAmount} keyboardType="decimal-pad" />
          <Button mode="contained" onPress={createBudget} disabled={!expenseCategory || status === 'saving'}>
            Create budget
          </Button>
        </Card.Content>
      </Card>

      {budgets.map((budget) => {
        const spent = Number(budget.spentMinor);
        const amount = Number(budget.amountMinor);
        const progress = amount === 0 ? 0 : Math.min(spent / amount, 1);
        return (
          <Card key={budget.id} mode="outlined">
            <Card.Content style={styles.form}>
              <View style={styles.row}>
                <Text variant="titleMedium">{budget.name}</Text>
                <Text>{formatMinorAmount(budget.amountMinor, budget.currency)}</Text>
              </View>
              <ProgressBar progress={progress} />
              <Text variant="bodySmall">
                Spent {formatMinorAmount(budget.spentMinor, budget.currency)} · Remaining{' '}
                {formatMinorAmount(`${BigInt(budget.amountMinor) - BigInt(budget.spentMinor)}`, budget.currency)}
              </Text>
              {progress >= budget.alertThresholdPercent / 100 ? <Text style={styles.warning}>Budget threshold reached</Text> : null}
            </Card.Content>
          </Card>
        );
      })}

      <Text variant="headlineSmall">Recurring</Text>
      <Card mode="contained">
        <Card.Content style={styles.form}>
          <TextInput label="Name" value={recurringName} onChangeText={setRecurringName} />
          <TextInput label="Amount" value={recurringAmount} onChangeText={setRecurringAmount} keyboardType="decimal-pad" />
          <Button mode="contained" onPress={createRecurring} disabled={!account || status === 'saving'}>
            Add recurring
          </Button>
        </Card.Content>
      </Card>

      {recurring.map((item) => (
        <Card key={item.id} mode="outlined">
          <Card.Content style={styles.row}>
            <View>
              <Text variant="titleMedium">{item.name}</Text>
              <Text variant="bodySmall">{item.frequency} · {new Date(item.nextOccurrenceAt).toLocaleDateString()}</Text>
            </View>
            <Text>{formatMinorAmount(item.amountMinor, item.currency)}</Text>
          </Card.Content>
        </Card>
      ))}

      <Text variant="headlineSmall">Notifications</Text>
      {notifications.length === 0 ? <Text>No reminders yet.</Text> : null}
      {notifications.map((notification) => (
        <Card key={notification.id} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium">{notification.title}</Text>
            <Text variant="bodySmall">{notification.body}</Text>
          </Card.Content>
        </Card>
      ))}
      {error ? <Text style={styles.warning}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  warning: {
    color: '#B3261E',
  },
});
