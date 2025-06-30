import { Stack } from 'expo-router/stack';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="account-type" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="callback" />
    </Stack>
  );
}