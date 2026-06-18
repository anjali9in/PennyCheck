import { PropsWithChildren, useEffect } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { store } from '@/store/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { initializeLocalDatabase } from '@/database/localDatabase';
import { loadCurrentProfile, restoreAuthSession } from '@/features/authentication/authSlice';
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
  }, [dispatch]);

  useEffect(() => {
    if (status === 'authenticated' && accessToken) {
      dispatch(loadCurrentProfile(accessToken));
    }
  }, [accessToken, dispatch, status]);

  return null;
}
