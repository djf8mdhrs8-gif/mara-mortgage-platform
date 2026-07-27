import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { useArticle } from '@/features/learn/useArticles';
import { colors, spacing, typography } from '@/theme/tokens';

export default function ArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, isPending, isError } = useArticle(typeof slug === 'string' ? slug : undefined);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{
          title: data?.title ?? 'Article',
          headerShown: true,
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.textOnPrimary,
        }}
      />
      {isPending ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : isError || data === undefined ? (
        <Text style={styles.error}>This article isn’t available right now.</Text>
      ) : (
        <>
          <Text style={styles.title}>{data.title}</Text>
          {data.excerpt !== null ? <Text style={styles.excerpt}>{data.excerpt}</Text> : null}
          {data.content.split('\n\n').map((paragraph, index) => (
            <Text key={index} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  title: {
    ...typography.title,
    fontSize: 26,
    color: colors.textPrimary,
  },
  excerpt: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  paragraph: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  muted: {
    ...typography.body,
    color: colors.textSecondary,
  },
  error: {
    ...typography.body,
    color: colors.error,
  },
});
