import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useArticles } from '@/features/learn/useArticles';
import { useLoanPrograms } from '@/features/learn/useLoanPrograms';
import { colors, radii, spacing, typography } from '@/theme/tokens';

function ArticlesSection() {
  const { data } = useArticles();
  if (data === undefined || data.length === 0) return null;

  return (
    <View style={styles.articles}>
      <Text style={styles.sectionHeading}>Articles & Tips</Text>
      {data.map((article) => (
        <Link
          key={article.slug}
          href={{ pathname: '/learn/article/[slug]', params: { slug: article.slug } }}
          asChild
        >
          <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
            <Text style={styles.cardTitle}>{article.title}</Text>
            {article.excerpt !== null ? (
              <Text style={styles.cardSummary}>{article.excerpt}</Text>
            ) : null}
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

export default function LearnScreen() {
  const { data, isPending, isError } = useLoanPrograms();

  return (
    <View style={styles.container}>
      {isPending ? (
        <Text style={styles.muted}>Loading loan programs…</Text>
      ) : isError ? (
        <Text style={styles.error}>Couldn’t load programs — check your connection.</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(program) => program.slug}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.intro}>
              Every loan has a fit. Explore the programs below, then reach out and we’ll find
              yours.
            </Text>
          }
          renderItem={({ item }) => (
            <Link href={{ pathname: '/learn/[slug]', params: { slug: item.slug } }} asChild>
              <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSummary}>{item.summary}</Text>
              </Pressable>
            </Link>
          )}
          ListFooterComponent={<ArticlesSection />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  intro: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  muted: {
    ...typography.body,
    color: colors.textSecondary,
    padding: spacing.md,
  },
  error: {
    ...typography.body,
    color: colors.error,
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardPressed: {
    backgroundColor: colors.border,
  },
  cardTitle: {
    ...typography.heading,
    fontSize: 17,
    color: colors.textPrimary,
  },
  cardSummary: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  articles: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  sectionHeading: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
