import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { Screen } from './Screen';

export function PlaceholderScreen() {
  return (
    <Screen contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium">PennyCheck</Text>
        <Text variant="bodyLarge">Offline-first money management foundation is ready.</Text>
      </View>
      <Button mode="contained" accessibilityLabel="Continue to login">
        Continue
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  header: {
    gap: 8,
  },
});
