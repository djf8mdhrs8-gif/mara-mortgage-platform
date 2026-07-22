import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

export default function LearnLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textOnPrimary,
      }}
    >
      <Stack.Screen name="[slug]" options={{ title: 'Loan Program' }} />
    </Stack>
  );
}
