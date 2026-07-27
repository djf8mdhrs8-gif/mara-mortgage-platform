'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { listArticles, listPrograms, type Article, type LoanProgram } from '../../../lib/contentApi';
import { ui } from '../../../lib/ui';

export default function ContentOverviewPage() {
  const [programs, setPrograms] = useState<LoanProgram[] | null>(null);
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listPrograms(), listArticles()])
      .then(([p, a]) => {
        setPrograms(p);
        setArticles(a);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <h1 style={ui.h1}>Content</h1>
      {error !== null ? <p style={ui.error}>{error}</p> : null}

      <div style={ui.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ ...ui.h2, margin: 0 }}>Loan programs</h2>
          <Link href="/content/programs/new" style={ui.buttonSecondary} data-testid="new-program">
            New program
          </Link>
        </div>
        {programs === null ? (
          <p style={ui.muted}>Loading…</p>
        ) : (
          <table style={ui.table}>
            <thead>
              <tr>
                <th style={ui.th}>Title</th>
                <th style={ui.th}>Slug</th>
                <th style={ui.th}>Order</th>
                <th style={ui.th}>Status</th>
                <th style={ui.th} />
              </tr>
            </thead>
            <tbody>
              {programs.map((program) => (
                <tr key={program.id}>
                  <td style={ui.td}>{program.title}</td>
                  <td style={ui.td}>{program.slug}</td>
                  <td style={ui.td}>{program.sortOrder}</td>
                  <td style={ui.td}>
                    <span style={program.published ? ui.badgeOn : ui.badgeOff}>
                      {program.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td style={ui.td}>
                    <Link href={`/content/programs/${program.id}`} style={ui.link}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={ui.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ ...ui.h2, margin: 0 }}>Articles</h2>
          <Link href="/content/articles/new" style={ui.buttonSecondary} data-testid="new-article">
            New article
          </Link>
        </div>
        {articles === null ? (
          <p style={ui.muted}>Loading…</p>
        ) : articles.length === 0 ? (
          <p style={ui.muted}>No articles yet — write your first educational piece.</p>
        ) : (
          <table style={ui.table}>
            <thead>
              <tr>
                <th style={ui.th}>Title</th>
                <th style={ui.th}>Slug</th>
                <th style={ui.th}>Status</th>
                <th style={ui.th} />
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id}>
                  <td style={ui.td}>{article.title}</td>
                  <td style={ui.td}>{article.slug}</td>
                  <td style={ui.td}>
                    <span style={article.published ? ui.badgeOn : ui.badgeOff}>
                      {article.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td style={ui.td}>
                    <Link href={`/content/articles/${article.id}`} style={ui.link}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={ui.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ ...ui.h2, margin: 0 }}>Compliance text</h2>
            <p style={ui.muted}>NMLS footer and the licensing &amp; disclosures page.</p>
          </div>
          <Link href="/content/compliance" style={ui.buttonSecondary} data-testid="edit-compliance">
            Edit
          </Link>
        </div>
      </div>
    </section>
  );
}
