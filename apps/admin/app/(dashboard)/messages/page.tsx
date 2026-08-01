'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { adminFetch } from '../../../lib/auth';
import { ui } from '../../../lib/ui';

interface ThreadSummary {
  id: string;
  userId: string;
  userName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  fromStaff: boolean;
  body: string;
  createdAt: string;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function MessagesPage() {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async (): Promise<void> => {
    const response = await adminFetch('/api/v1/messages/threads');
    if (response.ok) setThreads((await response.json()) as ThreadSummary[]);
  }, []);

  const openThread = useCallback(
    async (id: string): Promise<void> => {
      setActiveId(id);
      const response = await adminFetch(`/api/v1/messages/threads/${id}`);
      if (response.ok) {
        const data = (await response.json()) as { messages: ChatMessage[] };
        setMessages(data.messages);
        void loadThreads(); // refresh unread badges after the read-marking GET
      }
    },
    [loadThreads],
  );

  // Poll the open thread + badges — messaging without a reload.
  useEffect(() => {
    void loadThreads();
    const timer = setInterval(() => {
      void loadThreads();
      if (activeId !== null) {
        void adminFetch(`/api/v1/messages/threads/${activeId}`).then(async (response) => {
          if (response.ok) {
            const data = (await response.json()) as { messages: ChatMessage[] };
            setMessages(data.messages);
          }
        });
      }
    }, 5_000);
    return () => clearInterval(timer);
  }, [activeId, loadThreads]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  const onSend = async (): Promise<void> => {
    const body = draft.trim();
    if (body === '' || activeId === null || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await adminFetch(`/api/v1/messages/threads/${activeId}`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      if (!response.ok) throw new Error(`send failed (${response.status})`);
      setDraft('');
      await openThread(activeId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'send failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={{ display: 'grid', gap: 14 }}>
      <h1 style={ui.h1}>Messages</h1>
      <p style={ui.muted}>
        Secure in-app threads with borrowers — replies reach their phone as a push notification.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, minHeight: 420 }}>
        <div style={{ ...ui.card, padding: 0, overflow: 'hidden' }}>
          {threads.length === 0 ? (
            <p style={{ ...ui.muted, padding: 16 }}>No conversations yet.</p>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => void openThread(thread.id)}
                data-testid={`thread-${thread.id}`}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 14px',
                  background: thread.id === activeId ? '#0F2A4A' : 'transparent',
                  color: thread.id === activeId ? '#FFFFFF' : '#10202F',
                  border: 'none',
                  borderBottom: '1px solid #E1E6EC',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontSize: 14 }}>{thread.userName}</strong>
                  {thread.unreadCount > 0 ? (
                    <span
                      data-testid={`unread-${thread.id}`}
                      style={{
                        background: '#C9A227',
                        color: '#10202F',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '1px 8px',
                      }}
                    >
                      {thread.unreadCount}
                    </span>
                  ) : null}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.7,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {thread.lastMessage ?? 'No messages yet'}
                </div>
              </button>
            ))
          )}
        </div>

        <div style={{ ...ui.card, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeId === null ? (
            <p style={ui.muted}>Select a conversation.</p>
          ) : (
            <>
              <div
                ref={listRef}
                data-testid="admin-thread"
                style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: 8, maxHeight: 420 }}
              >
                {messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      justifySelf: message.fromStaff ? 'end' : 'start',
                      maxWidth: '75%',
                      background: message.fromStaff ? '#0F2A4A' : '#F5F7FA',
                      color: message.fromStaff ? '#FFFFFF' : '#10202F',
                      border: message.fromStaff ? 'none' : '1px solid #E1E6EC',
                      borderRadius: 10,
                      padding: '8px 12px',
                    }}
                  >
                    <div style={{ fontSize: 11, opacity: 0.7 }}>
                      {message.senderName} · {timeLabel(message.createdAt)}
                    </div>
                    <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{message.body}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                  style={{ ...ui.textarea, minHeight: 44, flex: 1 }}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={2000}
                  placeholder="Write a reply…"
                  data-testid="admin-reply"
                />
                <button
                  onClick={() => void onSend()}
                  disabled={busy || draft.trim() === ''}
                  style={{ ...ui.button, alignSelf: 'flex-end' }}
                  data-testid="admin-send"
                >
                  {busy ? 'Sending…' : 'Send'}
                </button>
              </div>
              {error !== null ? <p style={{ color: '#B3261E', fontSize: 13 }}>{error}</p> : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
