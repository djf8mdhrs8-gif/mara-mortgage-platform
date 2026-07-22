import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

/**
 * Fetches an admin-editable content block (public endpoint — works pre-auth).
 * `fallback` renders when offline or before the first response, so compliance
 * text is never missing from the screen.
 */
export function useContentBlock(key: string, fallback: string) {
  const query = useQuery({
    queryKey: ['content', key],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/content/{key}', {
        params: { path: { key } },
      });
      if (error !== undefined || data === undefined) {
        throw new Error('content unavailable');
      }
      return data;
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  return { ...query, body: query.data?.body ?? fallback };
}
