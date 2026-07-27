import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

export function useArticles() {
  return useQuery({
    queryKey: ['articles'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/articles');
      if (error !== undefined || data === undefined) {
        throw new Error('Could not load articles');
      }
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useArticle(slug: string | undefined) {
  return useQuery({
    queryKey: ['articles', slug],
    enabled: slug !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/articles/{slug}', {
        params: { path: { slug: slug ?? '' } },
      });
      if (error !== undefined || data === undefined) {
        throw new Error('Could not load this article');
      }
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
