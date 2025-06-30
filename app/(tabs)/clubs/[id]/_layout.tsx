import { Stack } from 'expo-router/stack';

export default function ClubDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="announcements" />
      <Stack.Screen name="members" />
      <Stack.Screen name="events" />
    </Stack>
  );
}