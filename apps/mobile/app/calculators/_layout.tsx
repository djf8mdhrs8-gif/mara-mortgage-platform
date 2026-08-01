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
      <Stack.Screen name="amortization" options={{ title: 'Amortization Schedule' }} />
      <Stack.Screen name="extra" options={{ title: 'Extra Payments' }} />
      <Stack.Screen name="refinance" options={{ title: 'Refinance' }} />
      <Stack.Screen name="affordability" options={{ title: 'Affordability' }} />
      <Stack.Screen name="rent-vs-buy" options={{ title: 'Rent vs. Buy' }} />
      <Stack.Screen name="buydown" options={{ title: 'Rate Buydown' }} />
      <Stack.Screen name="property" options={{ title: 'Property Analysis' }} />
      <Stack.Screen name="saved" options={{ title: 'Saved Scenarios' }} />
      <Stack.Screen name="quick" options={{ title: 'Quick Quote' }} />
    </Stack>
  );
}
