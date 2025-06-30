import { Stack } from 'expo-router/stack';

export default function ClubsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="[id]/index" />
    </Stack>
  );
}