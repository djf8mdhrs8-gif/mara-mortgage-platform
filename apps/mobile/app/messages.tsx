import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSendMessage, useThread } from '@/features/messages/useMessages';
import { colors, radii, spacing, typography } from '@/theme/tokens';

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * The borrower's secure thread with the loan team. Messages stay in-app
 * (behind sign-in + biometric lock) rather than in SMS/email — replies
 * arrive as push notifications.
 */
export default function MessagesScreen() {
  const { data: messages, isLoading, isError } = useThread();
  const send = useSendMessage();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const count = messages?.length ?? 0;
  useEffect(() => {
    // New message (sent or received) → keep the newest visible.
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [count]);

  const submit = (): void => {
    const body = draft.trim();
    if (body === '' || send.isPending) return;
    send.mutate(body, { onSuccess: () => setDraft('') });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {isError ? (
          <Text style={styles.mutedText}>Couldn&rsquo;t load messages — check your connection.</Text>
        ) : null}
        {!isLoading && !isError && count === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Message your loan team</Text>
            <Text style={styles.mutedText}>
              Questions about your application, documents, or rates — ask here and Mara&rsquo;s team
              will reply. You&rsquo;ll get a notification the moment they do.
            </Text>
          </View>
        ) : null}
        {(messages ?? []).map((message) => (
          <View
            key={message.id}
            style={[styles.bubbleRow, message.fromStaff ? styles.rowLeft : styles.rowRight]}
            testID={`msg-${message.id}`}
          >
            <View style={[styles.bubble, message.fromStaff ? styles.bubbleStaff : styles.bubbleMine]}>
              {message.fromStaff ? (
                <Text style={styles.sender}>{message.senderName}</Text>
              ) : null}
              <Text style={message.fromStaff ? styles.bodyStaff : styles.bodyMine}>
                {message.body}
              </Text>
              <Text style={message.fromStaff ? styles.timeStaff : styles.timeMine}>
                {timeLabel(message.createdAt)}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a message…"
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={2000}
          testID="msg-input"
        />
        <Pressable
          onPress={submit}
          disabled={draft.trim() === '' || send.isPending}
          style={[
            styles.sendButton,
            (draft.trim() === '' || send.isPending) && styles.sendDisabled,
          ]}
          testID="msg-send"
        >
          <Text style={styles.sendText}>{send.isPending ? '…' : 'Send'}</Text>
        </Pressable>
      </View>
      {send.isError ? (
        <Text style={styles.errorText}>Couldn&rsquo;t send — try again.</Text>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.heading,
    fontSize: 18,
    color: colors.textPrimary,
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '80%',
    borderRadius: radii.md,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  bubbleStaff: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
  },
  sender: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  bodyStaff: {
    ...typography.body,
    fontSize: 15,
    color: colors.textPrimary,
  },
  bodyMine: {
    ...typography.body,
    fontSize: 15,
    color: colors.textOnPrimary,
  },
  timeStaff: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
  },
  timeMine: {
    ...typography.caption,
    fontSize: 10,
    color: '#B9C8D8',
    textAlign: 'right',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.textPrimary,
    maxHeight: 110,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  sendDisabled: { opacity: 0.5 },
  sendText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  mutedText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
    paddingBottom: spacing.xs,
  },
});
