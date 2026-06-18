import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { z } from 'zod';
import { Screen } from '@/components/Screen';
import { RootStackParamList } from '@/navigation/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { forgotPassword, login, register } from './authSlice';

type AuthScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Login' | 'Register' | 'ForgotPassword' | 'BiometricUnlock'
>;

type AuthFormValues = {
  name: string;
  email: string;
  password: string;
};

export function AuthScreen({ route, navigation }: AuthScreenProps) {
  const dispatch = useAppDispatch();
  const { status, error, developmentEmailVerificationToken, developmentPasswordResetToken } = useAppSelector(
    (state) => state.auth,
  );
  const mode = route.name;
  const isRegister = mode === 'Register';
  const isForgotPassword = mode === 'ForgotPassword';
  const isSubmitting = status === 'submitting';
  const schema = z
    .object({
      name: z.string(),
      email: z.string().email(),
      password: z.string(),
    })
    .superRefine((values, context) => {
      if (isRegister && values.name.trim().length < 2) {
        context.addIssue({
          code: 'custom',
          path: ['name'],
          message: 'Name is required',
        });
      }
      if (!isForgotPassword && values.password.length < 10) {
        context.addIssue({
          code: 'custom',
          path: ['password'],
          message: 'Password must be at least 10 characters',
        });
      }
    });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFormValues>({
    defaultValues: { name: '', email: '', password: '' },
    resolver: zodResolver(schema),
  });

  const title = isRegister ? 'Create account' : isForgotPassword ? 'Reset password' : 'PennyCheck';
  const subtitle = isRegister
    ? 'Start a secure financial workspace.'
    : isForgotPassword
      ? 'Request a password reset link.'
      : 'Secure access for your financial workspace.';

  const onSubmit = handleSubmit(async (values) => {
    if (isRegister) {
      await dispatch(register({ name: values.name, email: values.email, password: values.password }));
      return;
    }
    if (isForgotPassword) {
      await dispatch(forgotPassword(values.email));
      return;
    }
    await dispatch(login({ email: values.email, password: values.password }));
  });

  return (
    <Screen contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineLarge">{title}</Text>
        <Text variant="bodyLarge">{subtitle}</Text>
      </View>

      <View style={styles.form}>
        {isRegister ? (
          <Controller
            control={control}
            name="name"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextInput
                label="Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                textContentType="name"
                accessibilityLabel="Name"
                error={Boolean(errors.name)}
              />
            )}
          />
        ) : null}
        {errors.name ? <HelperText type="error">{errors.name.message}</HelperText> : null}

        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value } }) => (
            <TextInput
              label="Email"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
              accessibilityLabel="Email address"
              error={Boolean(errors.email)}
            />
          )}
        />
        {errors.email ? <HelperText type="error">{errors.email.message}</HelperText> : null}

        {!isForgotPassword ? (
          <Controller
            control={control}
            name="password"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextInput
                label="Password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                textContentType="password"
                accessibilityLabel="Password"
                error={Boolean(errors.password)}
              />
            )}
          />
        ) : null}
        {errors.password ? <HelperText type="error">{errors.password.message}</HelperText> : null}

        {error ? <HelperText type="error">{error}</HelperText> : null}
        {developmentEmailVerificationToken ? (
          <HelperText type="info">Development email token: {developmentEmailVerificationToken}</HelperText>
        ) : null}
        {developmentPasswordResetToken ? (
          <HelperText type="info">Development reset token: {developmentPasswordResetToken}</HelperText>
        ) : null}

        <Button mode="contained" onPress={onSubmit} loading={isSubmitting} disabled={isSubmitting} accessibilityLabel={title}>
          {isRegister ? 'Create account' : isForgotPassword ? 'Send reset link' : 'Sign in'}
        </Button>

        {!isForgotPassword ? (
          <Button mode="text" onPress={() => navigation.navigate(isRegister ? 'Login' : 'Register')}>
            {isRegister ? 'Use an existing account' : 'Create account'}
          </Button>
        ) : null}
        {!isRegister ? (
          <Button mode="text" onPress={() => navigation.navigate(isForgotPassword ? 'Login' : 'ForgotPassword')}>
            {isForgotPassword ? 'Back to sign in' : 'Forgot password?'}
          </Button>
        ) : null}
      </View>
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
  form: {
    gap: 12,
  },
});
