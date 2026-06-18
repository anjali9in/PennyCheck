import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '@/features/dashboard/DashboardScreen';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const iconByRoute: Record<keyof MainTabParamList, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Home: 'view-dashboard-outline',
  Transactions: 'swap-horizontal',
  Add: 'plus-circle-outline',
  Budgets: 'chart-donut',
  More: 'dots-horizontal-circle-outline',
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
      <Tab.Screen name="Transactions" component={PlaceholderScreen} />
      <Tab.Screen name="Add" component={PlaceholderScreen} />
      <Tab.Screen name="Budgets" component={PlaceholderScreen} />
      <Tab.Screen name="More" component={PlaceholderScreen} />
    </Tab.Navigator>
  );
}
