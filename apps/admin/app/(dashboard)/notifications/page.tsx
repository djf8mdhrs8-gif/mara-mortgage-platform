'use client';

import { useState } from 'react';

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
] as const;

interface BroadcastResult {
  recipients: number;
  delivered: number;
  undelivered: number;
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

  const audienceLabel = AUDIENCES.find((a) => a.value === audience)?.label ?? audience;
  const ready = title.trim() !== '' && body.trim() !== '';

  const onSend = async (): Promise<void> => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await adminFetch('/api/v1/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), body: body.trim(), audience, type }),
      });
      if (!response.ok) throw new Error(`send failed (${response.status})`);
      setResult((await response.json()) as BroadcastResult);
      setTitle('');
      setBody('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'send failed');
    } finally {
      setBusy(false);
      setConfirming(false);
    }
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

        {error !== null ? <p style={ui.error}>{error}</p> : null}
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
            ? 'Sending…'
            : confirming
              ? `Confirm — send to ${audienceLabel}?`
              : 'Send notification'}
        </button>
      </div>
    </section>
  );
}
