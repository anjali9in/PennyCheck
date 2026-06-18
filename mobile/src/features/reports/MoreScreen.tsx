import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, ProgressBar, Text, TextInput } from 'react-native-paper';
import { Screen } from '@/components/Screen';
import { addGoal, addInvestment, addLoan, loadFinance } from '@/features/accounts/financeSlice';
import { ImportPanel } from '@/features/imports/ImportScreen';
import { setAppPin } from '@/services/appLockService';
import { shareTextFile } from '@/services/exportSharing';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { lockApp, setAppLockEnabled } from '@/store/slices/appSlice';
import { defaultHitSlop, formFieldLabel, minimumTouchTarget } from '@/utils/accessibility';
import { formatMinorAmount } from '@/utils/money';
import { buildTransactionsCsv, calculateCashflowMinor, calculateNetWorthMinor } from './reportsMath';

export function MoreScreen() {
  const dispatch = useAppDispatch();
  const {
    accounts,
    transactions,
    goals,
    loans,
    investments,
    status,
    error,
  } = useAppSelector((state) => state.finance);
  const appLockEnabled = useAppSelector((state) => state.app.appLockEnabled);
  const [goalName, setGoalName] = useState('Emergency fund');
  const [goalTarget, setGoalTarget] = useState('100000');
  const [goalCurrent, setGoalCurrent] = useState('0');
  const [loanName, setLoanName] = useState('Home loan');
  const [loanPrincipal, setLoanPrincipal] = useState('2500000');
  const [loanRate, setLoanRate] = useState('8.5');
  const [loanTenure, setLoanTenure] = useState('240');
  const [investmentName, setInvestmentName] = useState('Portfolio');
  const [investmentCost, setInvestmentCost] = useState('50000');
  const [investmentValue, setInvestmentValue] = useState('55000');
  const [pin, setPin] = useState('');
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  const currency = accounts[0]?.currency ?? 'INR';
  const creditCards = accounts.filter((account) => account.type === 'CREDIT_CARD');
  const netWorthMinor = useMemo(() => {
    return calculateNetWorthMinor({ accounts, investments, loans });
  }, [accounts, investments, loans]);

  const cashflow = useMemo(() => {
    return calculateCashflowMinor(transactions);
  }, [transactions]);

  const csvExport = useMemo(() => {
    return buildTransactionsCsv(accounts, transactions);
  }, [accounts, transactions]);

  const saveGoal = async () => {
    await dispatch(addGoal({ name: goalName, targetAmount: goalTarget, currentAmount: goalCurrent, currency }));
    dispatch(loadFinance());
  };

  const saveLoan = async () => {
    await dispatch(addLoan({ name: loanName, principal: loanPrincipal, annualInterestRate: loanRate, tenureMonths: loanTenure }));
    dispatch(loadFinance());
  };

  const saveInvestment = async () => {
    await dispatch(addInvestment({ name: investmentName, investedAmount: investmentCost, currentValue: investmentValue, currency }));
    dispatch(loadFinance());
  };

  const shareCsv = async () => {
    await shareTextFile({
      fileName: 'pennycheck-transactions.csv',
      mimeType: 'text/csv',
      content: csvExport,
    });
  };

  const savePin = async () => {
    await setAppPin(pin);
    setPin('');
    setSettingsMessage('PIN updated');
  };

  return (
    <Screen>
      <Text variant="headlineSmall">Reports</Text>
      <Card mode="contained">
        <Card.Content style={styles.form}>
          <View style={styles.row}>
            <Text variant="titleMedium">Net worth</Text>
            <Text variant="titleMedium">{formatMinorAmount(netWorthMinor, currency)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Income</Text>
            <Text>{formatMinorAmount(String(cashflow.income), currency)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Expenses</Text>
            <Text>{formatMinorAmount(String(cashflow.expense), currency)}</Text>
          </View>
        </Card.Content>
      </Card>

      <Text variant="headlineSmall">Goals</Text>
      <Card mode="contained">
        <Card.Content style={styles.form}>
          <TextInput
            label="Goal name"
            value={goalName}
            onChangeText={setGoalName}
            accessibilityLabel={formFieldLabel('Goal name', true)}
          />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              label="Target"
              value={goalTarget}
              onChangeText={setGoalTarget}
              keyboardType="decimal-pad"
              accessibilityLabel={formFieldLabel('Goal target amount', true)}
            />
            <TextInput
              style={styles.input}
              label="Saved"
              value={goalCurrent}
              onChangeText={setGoalCurrent}
              keyboardType="decimal-pad"
              accessibilityLabel="Goal saved amount"
            />
          </View>
          <Button mode="contained" onPress={saveGoal} disabled={status === 'saving'} hitSlop={defaultHitSlop} accessibilityHint="Creates a local savings goal">
            Add goal
          </Button>
        </Card.Content>
      </Card>
      {goals.map((goal) => {
        const progress = Number(goal.targetAmountMinor) === 0 ? 0 : Math.min(Number(goal.currentAmountMinor) / Number(goal.targetAmountMinor), 1);
        return (
          <Card key={goal.id} mode="outlined">
            <Card.Content style={styles.form}>
              <View style={styles.row}>
                <Text variant="titleMedium">{goal.name}</Text>
                <Text>{formatMinorAmount(goal.targetAmountMinor, goal.currency)}</Text>
              </View>
              <ProgressBar progress={progress} />
              <Text variant="bodySmall">{formatMinorAmount(goal.currentAmountMinor, goal.currency)} saved</Text>
            </Card.Content>
          </Card>
        );
      })}

      <Text variant="headlineSmall">Loans</Text>
      <Card mode="contained">
        <Card.Content style={styles.form}>
          <TextInput
            label="Loan name"
            value={loanName}
            onChangeText={setLoanName}
            accessibilityLabel={formFieldLabel('Loan name', true)}
          />
          <TextInput
            label="Principal"
            value={loanPrincipal}
            onChangeText={setLoanPrincipal}
            keyboardType="decimal-pad"
            accessibilityLabel={formFieldLabel('Loan principal amount', true)}
          />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              label="Rate %"
              value={loanRate}
              onChangeText={setLoanRate}
              keyboardType="decimal-pad"
              accessibilityLabel={formFieldLabel('Annual interest rate percentage', true)}
            />
            <TextInput
              style={styles.input}
              label="Months"
              value={loanTenure}
              onChangeText={setLoanTenure}
              keyboardType="number-pad"
              accessibilityLabel={formFieldLabel('Loan tenure in months', true)}
            />
          </View>
          <Button mode="contained" onPress={saveLoan} disabled={status === 'saving'} hitSlop={defaultHitSlop} accessibilityHint="Creates a local loan and EMI estimate">
            Add loan
          </Button>
        </Card.Content>
      </Card>
      {loans.map((loan) => (
        <Card key={loan.id} mode="outlined">
          <Card.Content style={styles.row}>
            <View style={styles.flex}>
              <Text variant="titleMedium">{loan.name}</Text>
              <Text variant="bodySmall">{loan.annualInterestRate}% · {loan.tenureMonths} months</Text>
            </View>
            <Text>{formatMinorAmount(loan.emiAmountMinor, currency)}</Text>
          </Card.Content>
        </Card>
      ))}

      <Text variant="headlineSmall">Investments</Text>
      <Card mode="contained">
        <Card.Content style={styles.form}>
          <TextInput
            label="Investment name"
            value={investmentName}
            onChangeText={setInvestmentName}
            accessibilityLabel={formFieldLabel('Investment name', true)}
          />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              label="Invested"
              value={investmentCost}
              onChangeText={setInvestmentCost}
              keyboardType="decimal-pad"
              accessibilityLabel={formFieldLabel('Invested amount', true)}
            />
            <TextInput
              style={styles.input}
              label="Value"
              value={investmentValue}
              onChangeText={setInvestmentValue}
              keyboardType="decimal-pad"
              accessibilityLabel={formFieldLabel('Current investment value', true)}
            />
          </View>
          <Button mode="contained" onPress={saveInvestment} disabled={status === 'saving'} hitSlop={defaultHitSlop} accessibilityHint="Creates a local investment record">
            Add investment
          </Button>
        </Card.Content>
      </Card>
      {investments.map((investment) => (
        <Card key={investment.id} mode="outlined">
          <Card.Content style={styles.row}>
            <View style={styles.flex}>
              <Text variant="titleMedium">{investment.name}</Text>
              <Text variant="bodySmall">Cost {formatMinorAmount(investment.investedAmountMinor, investment.currency)}</Text>
            </View>
            <Text>{formatMinorAmount(investment.currentValueMinor, investment.currency)}</Text>
          </Card.Content>
        </Card>
      ))}

      <Text variant="headlineSmall">Credit cards</Text>
      {creditCards.length === 0 ? <Text>No credit card accounts yet.</Text> : null}
      {creditCards.map((account) => (
        <Card key={account.id} mode="outlined">
          <Card.Content style={styles.row}>
            <Text variant="titleMedium">{account.name}</Text>
            <Text>{formatMinorAmount(account.currentBalanceMinor, account.currency)}</Text>
          </Card.Content>
        </Card>
      ))}

      <Text variant="headlineSmall">Export</Text>
      <Button
        mode="contained"
        onPress={shareCsv}
        disabled={transactions.length === 0}
        hitSlop={defaultHitSlop}
        accessibilityLabel="Share CSV export"
      >
        Share CSV
      </Button>
      <TextInput
        label="CSV transactions"
        value={csvExport}
        multiline
        numberOfLines={8}
        editable={false}
        accessibilityLabel="CSV transactions export preview"
      />

      <ImportPanel />

      <Text variant="headlineSmall">Settings</Text>
      <Card mode="contained">
        <Card.Content style={styles.form}>
          <View style={styles.row}>
            <Text variant="titleMedium">App lock</Text>
            <Button
              mode="contained-tonal"
              onPress={() => dispatch(setAppLockEnabled(!appLockEnabled))}
              hitSlop={defaultHitSlop}
              accessibilityLabel="Toggle app lock"
            >
              {appLockEnabled ? 'On' : 'Off'}
            </Button>
          </View>
          <TextInput
            label="PIN"
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            accessibilityLabel="App lock PIN"
          />
          <View style={styles.inputRow}>
            <Button mode="contained" onPress={savePin} disabled={pin.length < 4} hitSlop={defaultHitSlop}>
              Save PIN
            </Button>
            <Button mode="outlined" onPress={() => dispatch(lockApp())} disabled={!appLockEnabled} hitSlop={defaultHitSlop}>
              Lock now
            </Button>
          </View>
          {settingsMessage ? <Text variant="bodySmall">{settingsMessage}</Text> : null}
        </Card.Content>
      </Card>
      {error ? <Text style={styles.warning}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
  },
  row: {
    minHeight: minimumTouchTarget,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  warning: {
    color: '#B3261E',
  },
});
