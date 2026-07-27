'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { listArticles, saveArticle } from '../../../../../lib/contentApi';
import { ui } from '../../../../../lib/ui';

export default function ArticleEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = params.id === 'new';

  const [loaded, setLoaded] = useState(isNew);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (isNew) return;
    listArticles()
      .then((articles) => {
        const article = articles.find((a) => a.id === params.id);
        if (article === undefined) {
          setError('Article not found.');
          return;
        }
        setSlug(article.slug);
        setTitle(article.title);
        setExcerpt(article.excerpt ?? '');
        setContent(article.content);
        setPublished(article.published);
        setLoaded(true);
      })
      .catch((e: Error) => setError(e.message));
  }, [isNew, params.id]);

  const onSave = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await saveArticle(isNew ? null : params.id, {
        slug,
        title,
        excerpt: excerpt === '' ? undefined : excerpt,
        content,
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
      <h1 style={ui.h1}>{isNew ? 'New article' : `Edit: ${title}`}</h1>
      <div style={{ ...ui.card, display: 'grid', gap: 14 }}>
        <label style={ui.label}>
          Title
          <input style={ui.input} value={title} onChange={(e) => setTitle(e.target.value)} data-testid="article-title" />
        </label>
        <label style={ui.label}>
          Slug (URL identifier, lowercase-with-dashes)
          <input style={ui.input} value={slug} onChange={(e) => setSlug(e.target.value)} data-testid="article-slug" />
        </label>
        <label style={ui.label}>
          Excerpt (optional teaser shown on the list)
          <input style={ui.input} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} data-testid="article-excerpt" />
        </label>
        <label style={ui.label}>
          Content (paragraphs separated by a blank line)
          <textarea style={ui.textarea} value={content} onChange={(e) => setContent(e.target.value)} data-testid="article-content" />
        </label>
        <label style={{ ...ui.label, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            data-testid="article-published"
          />
          Published (visible to borrowers in the app)
        </label>
        {error !== null ? <p style={ui.error}>{error}</p> : null}
        {saved ? <p style={ui.success}>Saved — live in the app immediately.</p> : null}
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={ui.button} onClick={() => void onSave()} disabled={busy} data-testid="article-save">
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
