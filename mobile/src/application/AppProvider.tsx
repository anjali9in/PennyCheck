import { PropsWithChildren, useEffect, useState } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { Button, HelperText, PaperProvider, Text, TextInput } from 'react-native-paper';
import { AppState, StyleSheet, useColorScheme, View } from 'react-native';
import { store } from '@/store/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { initializeLocalDatabase } from '@/database/localDatabase';
import { loadFinance } from '@/features/accounts/financeSlice';
import { loadCurrentProfile, restoreAuthSession } from '@/features/authentication/authSlice';
import { lockApp, refreshSyncStatus, syncNow, unlockApp } from '@/store/slices/appSlice';
import { authenticateWithBiometrics, verifyAppPin } from '@/services/appLockService';
import { darkTheme, lightTheme } from '@/theme/theme';

export function AppProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme();
  const paperTheme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const navigationTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => {
    initializeLocalDatabase().catch((error: unknown) => {
      console.error('Failed to initialize local database', error);
    });
  }, []);

  return (
    <ReduxProvider store={store}>
      <PaperProvider theme={paperTheme}>
        <NavigationContainer theme={navigationTheme}>{children}</NavigationContainer>
        <AuthBootstrapper />
        <AppLockGate />
      </PaperProvider>
    </ReduxProvider>
  );
}

function AuthBootstrapper() {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const status = useAppSelector((state) => state.auth.status);

  useEffect(() => {
    dispatch(restoreAuthSession());
    initializeLocalDatabase()
      .then(() => {
        dispatch(loadFinance());
        dispatch(refreshSyncStatus());
      })
      .catch((error: unknown) => {
        console.error('Failed to load local finance data', error);
      });
  }, [dispatch]);

  useEffect(() => {
    if (status === 'authenticated' && accessToken) {
      dispatch(loadCurrentProfile(accessToken));
      dispatch(syncNow()).then(() => dispatch(loadFinance()));
      const intervalId = setInterval(() => {
        dispatch(syncNow()).then(() => dispatch(loadFinance()));
      }, 60_000);
      return () => clearInterval(intervalId);
    }
    return undefined;
  }, [accessToken, dispatch, status]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (status === 'authenticated' && nextState !== 'active') {
        dispatch(lockApp());
      }
    });
    return () => subscription.remove();
  }, [dispatch, status]);

  return null;
}

function AppLockGate() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.status === 'authenticated');
  const isLocked = useAppSelector((state) => state.app.isLocked);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated || !isLocked) {
    return null;
  }

  const unlockWithBiometrics = async () => {
    setError(null);
    if (await authenticateWithBiometrics()) {
      dispatch(unlockApp());
    } else {
      setError('Biometric unlock was not available or was cancelled.');
    }
  };

  const unlockWithPin = async () => {
    setError(null);
    if (await verifyAppPin(pin)) {
      setPin('');
      dispatch(unlockApp());
    } else {
      setError('Incorrect PIN');
    }
  };

  return (
    <View style={styles.lockOverlay}>
      <View style={styles.lockPanel}>
        <Text variant="headlineSmall">PennyCheck locked</Text>
        <Text variant="bodyMedium">Unlock with biometrics or your app PIN.</Text>
        <Button mode="contained" onPress={unlockWithBiometrics}>
          Unlock with biometrics
        </Button>
        <TextInput label="PIN" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry />
        <Button mode="contained-tonal" onPress={unlockWithPin}>
          Unlock with PIN
        </Button>
        {error ? <HelperText type="error">{error}</HelperText> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lockOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(6, 18, 24, 0.92)',
  },
  lockPanel: {
    gap: 12,
    padding: 20,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
});
