import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

export function useLoanPrograms() {
  return useQuery({
    queryKey: ['loan-programs'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/loan-programs');
      if (error !== undefined || data === undefined) {
        throw new Error('Could not load loan programs');
      }
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useLoanProgram(slug: string | undefined) {
  return useQuery({
    queryKey: ['loan-programs', slug],
    enabled: slug !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/loan-programs/{slug}', {
        params: { path: { slug: slug ?? '' } },
      });
      if (error !== undefined || data === undefined) {
        throw new Error('Could not load this program');
      }
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
