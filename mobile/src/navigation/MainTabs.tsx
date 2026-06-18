import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '@/features/dashboard/DashboardScreen';
import { BudgetsScreen } from '@/features/budgets/BudgetsScreen';
import { MoreScreen } from '@/features/reports/MoreScreen';
import { AddMoneyScreen } from '@/features/transactions/AddMoneyScreen';
import { TransactionsScreen } from '@/features/transactions/TransactionsScreen';
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const iconByRoute: Record<keyof MainTabParamList, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Home: 'view-dashboard-outline',
  Transactions: 'swap-horizontal',
  Add: 'plus-circle-outline',
  Budgets: 'chart-donut',
  More: 'chart-box-outline',
};

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarAccessibilityLabel: `${route.name} tab`,
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name={iconByRoute[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Add" component={AddMoneyScreen} />
      <Tab.Screen name="Budgets" component={BudgetsScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}
