import { AppProvider } from './src/application/AppProvider';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AppProvider>
      <RootNavigator />
    </AppProvider>
  );
}
