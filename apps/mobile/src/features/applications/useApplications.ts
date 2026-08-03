import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

export function useApplications() {
  return useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/applications');
      if (error !== undefined || data === undefined) {
        throw new Error('Could not load your application');
      }
      return data;
    },
    // Status changes come from the loan-officer side; poll so they show up
    // without the borrower doing anything.
    refetchInterval: 30_000,
  });
}

/**
 * Arive portal handoff (M19): where the borrower completes the real 1003
 * application. Served by the API's AriveAdapter so the URL can change
 * server-side without a mobile release.
 */
export function useAriveLink() {
  return useQuery({
    queryKey: ['arive-link'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/applications/arive-link');
      if (error !== undefined || data === undefined) {
        throw new Error('Could not load the application portal link');
      }
      return data;
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useStartApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST('/api/v1/applications');
      if (error !== undefined || data === undefined) {
        throw new Error('Could not start your application');
      }
      return data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['applications'] }),
  });
}
