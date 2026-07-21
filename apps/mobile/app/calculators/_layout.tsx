import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

export default function CalculatorsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textOnPrimary,
      }}
    >
      <Stack.Screen name="basic" options={{ title: 'Mortgage Payment' }} />
    </Stack>
  );
}
