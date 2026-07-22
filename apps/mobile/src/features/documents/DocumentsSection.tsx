import { StyleSheet, Text, View } from 'react-native';

import { useDocuments, useUploadDocument } from './useDocuments';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  UPLOADED: { label: 'Uploaded', color: colors.textSecondary },
  IN_REVIEW: { label: 'In review', color: colors.warning },
  ACCEPTED: { label: 'Accepted', color: colors.success },
  NEEDS_RESUBMISSION: { label: 'Needs resubmission', color: colors.error },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsSection({ applicationId }: { applicationId: string }) {
  const { data, isPending, isError } = useDocuments(applicationId);
  const upload = useUploadDocument(applicationId);

  return (
    <View style={styles.section} testID="documents-section">
      <Text style={styles.heading}>Documents</Text>
      {isPending ? (
        <Text style={styles.muted}>Loading documents…</Text>
      ) : isError ? (
        <Text style={styles.error}>Couldn’t load documents.</Text>
      ) : data.length === 0 ? (
        <Text style={styles.muted}>
          Nothing uploaded yet. Bank statements, pay stubs, and IDs go here — everything is
          encrypted in transit and visible only to you and your loan team.
        </Text>
      ) : (
        data.map((doc) => {
          const status = STATUS_LABELS[doc.status] ?? STATUS_LABELS.UPLOADED;
          return (
            <View key={doc.id} style={styles.docRow}>
              <View style={styles.docText}>
                <Text style={styles.docName} numberOfLines={1}>
                  {doc.fileName}
                </Text>
                <Text style={styles.docMeta}>
                  {formatSize(doc.sizeBytes)} ·{' '}
                  {new Date(doc.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                {doc.status === 'NEEDS_RESUBMISSION' ? (
                  <Text style={styles.resubmitHint}>
                    Please upload a new copy — the previous one couldn’t be used.
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.docStatus, { color: status?.color ?? colors.textSecondary }]}>
                {status?.label ?? doc.status}
              </Text>
            </View>
          );
        })
      )}
      <PrimaryButton
        title="Upload a document"
        onPress={() => upload.mutate()}
        loading={upload.isPending}
      />
      {upload.isError ? <Text style={styles.error}>{upload.error.message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heading: {
    ...typography.heading,
    fontSize: 18,
    color: colors.textPrimary,
  },
  muted: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  error: {
    ...typography.caption,
    color: colors.error,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.md,
  },
  docText: {
    flex: 1,
    gap: 2,
  },
  docName: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  docMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  docStatus: {
    ...typography.caption,
    fontWeight: '700',
  },
  resubmitHint: {
    ...typography.caption,
    color: colors.error,
  },
});
