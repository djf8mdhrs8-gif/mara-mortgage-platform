'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getContentBlock, saveContentBlock } from '../../../../lib/contentApi';
import { ui } from '../../../../lib/ui';

const KEYS = [
  {
    key: 'compliance.footer',
    label: 'Footer line (sign-in screen & Contact tab)',
    multiline: false,
  },
  {
    key: 'compliance.disclosures',
    label: 'Licensing & Disclosures page (paragraphs separated by a blank line)',
    multiline: true,
  },
] as const;

export default function ComplianceEditorPage() {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all(KEYS.map((k) => getContentBlock(k.key)))
      .then((blocks) => {
        const next: Record<string, string> = {};
        for (const block of blocks) next[block.key] = block.body;
        setValues(next);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const onSave = async (key: string): Promise<void> => {
    setStatus((s) => ({ ...s, [key]: 'saving' }));
    try {
      await saveContentBlock(key, values[key] ?? '');
      setStatus((s) => ({ ...s, [key]: 'saved' }));
    } catch (e) {
      setStatus((s) => ({ ...s, [key]: e instanceof Error ? e.message : 'save failed' }));
    }
  };

  return (
    <section style={{ display: 'grid', gap: 14, maxWidth: 720 }}>
      <h1 style={ui.h1}>Compliance text</h1>
      <p style={ui.muted}>
        This copy renders in the borrower app immediately — no app update needed. Have your
        compliance contact review any changes.
      </p>
      {error !== null ? <p style={ui.error}>{error}</p> : null}
      {KEYS.map(({ key, label, multiline }) => (
        <div key={key} style={{ ...ui.card, display: 'grid', gap: 10 }}>
          <label style={ui.label}>
            {label}
            {multiline ? (
              <textarea
                style={ui.textarea}
                value={values[key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                data-testid={`compliance-${key}`}
              />
            ) : (
              <input
                style={ui.input}
                value={values[key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                data-testid={`compliance-${key}`}
              />
            )}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={ui.button} onClick={() => void onSave(key)} data-testid={`save-${key}`}>
              Save
            </button>
            {status[key] === 'saved' ? (
              <span style={ui.success}>Saved — live immediately.</span>
            ) : status[key] === 'saving' ? (
              <span style={ui.muted}>Saving…</span>
            ) : status[key] !== undefined ? (
              <span style={ui.error}>{status[key]}</span>
            ) : null}
          </div>
        </div>
      ))}
      <button style={ui.buttonSecondary} onClick={() => router.push('/content')}>
        Back
      </button>
    </section>
  );
}
