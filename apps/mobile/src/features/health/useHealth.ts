import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/health');
      if (error !== undefined || data === undefined) {
        throw new Error('API unreachable');
      }
      return data;
    },
    refetchInterval: 30_000,
    retry: 1,
  });
}
