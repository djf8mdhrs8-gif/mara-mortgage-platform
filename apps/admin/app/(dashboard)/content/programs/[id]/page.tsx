'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { listPrograms, saveProgram } from '../../../../../lib/contentApi';
import { ui } from '../../../../../lib/ui';

export default function ProgramEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = params.id === 'new';

  const [loaded, setLoaded] = useState(isNew);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (isNew) return;
    listPrograms()
      .then((programs) => {
        const program = programs.find((p) => p.id === params.id);
        if (program === undefined) {
          setError('Program not found.');
          return;
        }
        setSlug(program.slug);
        setTitle(program.title);
        setSummary(program.summary);
        setContent(program.content);
        setSortOrder(String(program.sortOrder));
        setPublished(program.published);
        setLoaded(true);
      })
      .catch((e: Error) => setError(e.message));
  }, [isNew, params.id]);

  const onSave = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await saveProgram(isNew ? null : params.id, {
        slug,
        title,
        summary,
        content,
        sortOrder: Number(sortOrder) || 0,
        published,
      });
      setSaved(true);
      if (isNew) router.replace('/content');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save failed');
    } finally {
      setBusy(false);
    }
  };

  if (!loaded && error === null) return <p style={ui.muted}>Loading…</p>;

  return (
    <section style={{ display: 'grid', gap: 14, maxWidth: 720 }}>
      <h1 style={ui.h1}>{isNew ? 'New loan program' : `Edit: ${title}`}</h1>
      <div style={{ ...ui.card, display: 'grid', gap: 14 }}>
        <label style={ui.label}>
          Title
          <input style={ui.input} value={title} onChange={(e) => setTitle(e.target.value)} data-testid="program-title" />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
          <label style={ui.label}>
            Slug (URL identifier, lowercase-with-dashes)
            <input style={ui.input} value={slug} onChange={(e) => setSlug(e.target.value)} data-testid="program-slug" />
          </label>
          <label style={ui.label}>
            Sort order
            <input style={ui.input} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} inputMode="numeric" />
          </label>
        </div>
        <label style={ui.label}>
          Summary (one sentence shown on the list)
          <input style={ui.input} value={summary} onChange={(e) => setSummary(e.target.value)} data-testid="program-summary" />
        </label>
        <label style={ui.label}>
          Content (paragraphs separated by a blank line)
          <textarea style={ui.textarea} value={content} onChange={(e) => setContent(e.target.value)} data-testid="program-content" />
        </label>
        <label style={{ ...ui.label, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            data-testid="program-published"
          />
          Published (visible to borrowers in the app)
        </label>
        {error !== null ? <p style={ui.error}>{error}</p> : null}
        {saved ? <p style={ui.success}>Saved — live in the app immediately.</p> : null}
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={ui.button} onClick={() => void onSave()} disabled={busy} data-testid="program-save">
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button style={ui.buttonSecondary} onClick={() => router.push('/content')}>
            Back
          </button>
        </div>
      </div>
    </section>
  );
}
