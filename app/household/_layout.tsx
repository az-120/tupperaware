import { Stack } from "expo-router";

export default function HouseholdLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="edit-name" />
      <Stack.Screen name="edit-locations" />
    </Stack>
  );
}
