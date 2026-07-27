'use client';

import { adminFetch } from './auth';

export interface LoanProgram {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  sortOrder: number;
  published: boolean;
  updatedAt: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  published: boolean;
  publishedAt: string | null;
  updatedAt: string;
}

async function expectOk<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join('; ') : body?.message;
    throw new Error(message ?? `request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function listPrograms(): Promise<LoanProgram[]> {
  return expectOk(await adminFetch('/api/v1/loan-programs'));
}

export async function saveProgram(
  id: string | null,
  data: Omit<LoanProgram, 'id' | 'updatedAt'>,
): Promise<LoanProgram> {
  return expectOk(
    await adminFetch(id === null ? '/api/v1/loan-programs' : `/api/v1/loan-programs/${id}`, {
      method: id === null ? 'POST' : 'PATCH',
      body: JSON.stringify(data),
    }),
  );
}

export async function listArticles(): Promise<Article[]> {
  return expectOk(await adminFetch('/api/v1/articles'));
}

export async function saveArticle(
  id: string | null,
  data: { slug: string; title: string; excerpt?: string; content: string; published: boolean },
): Promise<Article> {
  return expectOk(
    await adminFetch(id === null ? '/api/v1/articles' : `/api/v1/articles/${id}`, {
      method: id === null ? 'POST' : 'PATCH',
      body: JSON.stringify(data),
    }),
  );
}

export async function getContentBlock(key: string): Promise<{ key: string; body: string }> {
  return expectOk(await adminFetch(`/api/v1/content/${key}`));
}

export async function saveContentBlock(key: string, body: string): Promise<void> {
  await expectOk(
    await adminFetch(`/api/v1/content/${key}`, { method: 'PUT', body: JSON.stringify({ body }) }),
  );
}
