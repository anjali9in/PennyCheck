import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthScreen } from '@/features/authentication/AuthScreen';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useAppSelector } from '@/store/hooks';
import { MainTabs } from './MainTabs';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const status = useAppSelector((state) => state.auth.status);
  const isAuthenticated = status === 'authenticated';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="MainTabs" component={MainTabs} />
      ) : (
        <>
          <Stack.Screen name="Login" component={AuthScreen} />
          <Stack.Screen name="Onboarding" component={PlaceholderScreen} initialParams={undefined} />
          <Stack.Screen name="Register" component={AuthScreen} />
          <Stack.Screen name="ForgotPassword" component={AuthScreen} />
          <Stack.Screen name="BiometricUnlock" component={AuthScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
