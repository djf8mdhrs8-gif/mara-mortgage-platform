'use client';

import { useCallback, useEffect, useState } from 'react';

import { adminFetch } from '../../../lib/auth';
import { ui } from '../../../lib/ui';

const AUDIENCES = [
  { value: 'ALL', label: 'Everyone' },
  { value: 'BORROWERS', label: 'Borrowers only' },
  { value: 'REALTORS', label: 'Realtors only' },
] as const;

const TYPES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'RATE_UPDATE', label: 'Rate update' },
  { value: 'EDUCATIONAL', label: 'Educational tip' },
  { value: 'CLOSING_REMINDER', label: 'Closing reminder' },
] as const;

interface BroadcastResult {
  recipients: number;
  delivered: number;
  undelivered: number;
}

interface ScheduledBroadcast {
  id: string;
  title: string;
  audience: string;
  type: string;
  sendAt: string;
  status: 'PENDING' | 'SENT' | 'CANCELLED';
  recipients: number | null;
  delivered: number | null;
}

function scheduleLabel(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<string>('ALL');
  const [type, setType] = useState<string>('GENERAL');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendAt, setSendAt] = useState(''); // datetime-local value; '' = send now
  const [scheduled, setScheduled] = useState<ScheduledBroadcast[]>([]);
  const [scheduledNote, setScheduledNote] = useState<string | null>(null);

  const loadScheduled = useCallback(async (): Promise<void> => {
    const response = await adminFetch('/api/v1/notifications/scheduled');
    if (response.ok) setScheduled((await response.json()) as ScheduledBroadcast[]);
  }, []);

  useEffect(() => {
    void loadScheduled();
  }, [loadScheduled]);

  const audienceLabel = AUDIENCES.find((a) => a.value === audience)?.label ?? audience;
  const ready = title.trim() !== '' && body.trim() !== '';
  const scheduling = sendAt !== '';

  const onSend = async (): Promise<void> => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    setScheduledNote(null);
    try {
      if (scheduling) {
        const response = await adminFetch('/api/v1/notifications/schedule', {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            audience,
            type,
            sendAt: new Date(sendAt).toISOString(),
          }),
        });
        if (!response.ok) throw new Error(`schedule failed (${response.status})`);
        const row = (await response.json()) as ScheduledBroadcast;
        setScheduledNote(`Scheduled for ${scheduleLabel(row.sendAt)}.`);
        setSendAt('');
        await loadScheduled();
      } else {
        const response = await adminFetch('/api/v1/notifications/broadcast', {
          method: 'POST',
          body: JSON.stringify({ title: title.trim(), body: body.trim(), audience, type }),
        });
        if (!response.ok) throw new Error(`send failed (${response.status})`);
        setResult((await response.json()) as BroadcastResult);
      }
      setTitle('');
      setBody('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'send failed');
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  const onCancel = async (id: string): Promise<void> => {
    const response = await adminFetch(`/api/v1/notifications/scheduled/${id}`, {
      method: 'DELETE',
    });
    if (response.ok) await loadScheduled();
  };

  return (
    <section style={{ display: 'grid', gap: 14, maxWidth: 640 }}>
      <h1 style={ui.h1}>Send a push notification</h1>
      <p style={ui.muted}>
        Goes to every registered device for the selected audience, and appears in their in-app
        notification history either way.
      </p>

      <div style={{ ...ui.card, display: 'grid', gap: 14 }}>
        <label style={ui.label}>
          Title
          <input
            style={ui.input}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setConfirming(false);
            }}
            maxLength={120}
            placeholder="Rates just dropped"
            data-testid="notif-title"
          />
        </label>
        <label style={ui.label}>
          Message
          <textarea
            style={{ ...ui.textarea, minHeight: 110 }}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setConfirming(false);
            }}
            maxLength={500}
            placeholder="30-year rates fell this week — a great time to run your numbers."
            data-testid="notif-body"
          />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <label style={ui.label}>
            Audience
            <select
              style={ui.input}
              value={audience}
              onChange={(e) => {
                setAudience(e.target.value);
                setConfirming(false);
              }}
              data-testid="notif-audience"
            >
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label style={ui.label}>
            Type
            <select
              style={ui.input}
              value={type}
              onChange={(e) => setType(e.target.value)}
              data-testid="notif-type"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label style={ui.label}>
          Send time (leave empty to send immediately)
          <input
            type="datetime-local"
            style={ui.input}
            value={sendAt}
            onChange={(e) => {
              setSendAt(e.target.value);
              setConfirming(false);
            }}
            data-testid="notif-sendat"
          />
        </label>

        {error !== null ? <p style={ui.error}>{error}</p> : null}
        {scheduledNote !== null ? (
          <p style={ui.success} data-testid="notif-scheduled-note">
            {scheduledNote}
          </p>
        ) : null}
        {result !== null ? (
          <p style={ui.success} data-testid="notif-result">
            Sent to {result.recipients} user{result.recipients === 1 ? '' : 's'} —{' '}
            {result.delivered} device deliveries, {result.undelivered} recorded in-app only (no
            registered device yet).
          </p>
        ) : null}

        <button
          style={{
            ...ui.button,
            background: confirming ? '#B45309' : '#0F2A4A',
            opacity: ready ? 1 : 0.5,
          }}
          disabled={!ready || busy}
          onClick={() => void onSend()}
          data-testid="notif-send"
        >
          {busy
            ? scheduling
              ? 'Scheduling…'
              : 'Sending…'
            : confirming
              ? scheduling
                ? `Confirm — schedule for ${audienceLabel}?`
                : `Confirm — send to ${audienceLabel}?`
              : scheduling
                ? 'Schedule notification'
                : 'Send notification'}
        </button>
      </div>

      <div style={{ ...ui.card, display: 'grid', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Scheduled</h2>
        {scheduled.length === 0 ? (
          <p style={ui.muted}>Nothing scheduled yet.</p>
        ) : (
          scheduled.map((row) => (
            <div
              key={row.id}
              data-testid={`sched-${row.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderBottom: '1px solid #E1E6EC',
                paddingBottom: 8,
              }}
            >
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 14 }}>{row.title}</strong>
                <div style={{ fontSize: 12, color: '#5A6B7C' }}>
                  {scheduleLabel(row.sendAt)} · {row.audience} · {row.type}
                  {row.status === 'SENT' && row.recipients !== null
                    ? ` · sent to ${row.recipients}`
                    : ''}
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background:
                    row.status === 'PENDING'
                      ? '#F6E3CB'
                      : row.status === 'SENT'
                        ? '#DCF0E5'
                        : '#E8EDF4',
                  color:
                    row.status === 'PENDING'
                      ? '#B45309'
                      : row.status === 'SENT'
                        ? '#1F7A4D'
                        : '#5A6B7C',
                }}
              >
                {row.status}
              </span>
              {row.status === 'PENDING' ? (
                <button
                  style={{ ...ui.buttonSecondary, padding: '4px 10px', fontSize: 12 }}
                  onClick={() => void onCancel(row.id)}
                  data-testid={`sched-cancel-${row.id}`}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
