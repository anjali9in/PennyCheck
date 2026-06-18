import { StyleSheet, View } from 'react-native';
import { Button, Card, ProgressBar, Text, useTheme } from 'react-native-paper';
import { Screen } from '@/components/Screen';
import { logout } from '@/features/authentication/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

export function DashboardScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { email, profile, refreshToken } = useAppSelector((state) => state.auth);

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="titleMedium">Total balance</Text>
        <Text variant="displaySmall">INR 0.00</Text>
        <Text variant="bodyMedium">{profile?.name ?? email ?? 'No accounts added yet.'}</Text>
      </View>

      <Card mode="contained" accessible accessibilityLabel="Monthly cash flow summary">
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium">This month</Text>
          <View style={styles.metricRow}>
            <Text>Income</Text>
            <Text>INR 0.00</Text>
          </View>
          <View style={styles.metricRow}>
            <Text>Expenses</Text>
            <Text>INR 0.00</Text>
          </View>
          <View style={styles.metricRow}>
            <Text>Savings</Text>
            <Text>INR 0.00</Text>
          </View>
        </Card.Content>
      </Card>

      <Card mode="contained" accessible accessibilityLabel="Budget progress summary">
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium">Budget progress</Text>
          <ProgressBar progress={0} color={theme.colors.primary} />
          <Text variant="bodySmall">Create your first budget to track progress.</Text>
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
});
