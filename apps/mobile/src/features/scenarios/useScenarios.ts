import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

export type ScenarioType =
  | 'BASIC'
  | 'EXTRA_PAYMENT'
  | 'REFINANCE'
  | 'AFFORDABILITY'
  | 'RENT_VS_BUY'
  | 'BUYDOWN'
  | 'PROPERTY_ANALYSIS';

export interface Scenario {
  id: string;
  type: ScenarioType;
  name: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const KEY = ['scenarios'];

export function useScenarios() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Scenario[]> => {
      const { data, error } = await api.GET('/api/v1/scenarios');
      if (error !== undefined) throw new Error('could not load scenarios');
      return data as unknown as Scenario[];
    },
  });
}

export function useSaveScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      type: ScenarioType;
      name: string;
      inputs: Record<string, unknown>;
    }): Promise<Scenario> => {
      const { data, error } = await api.POST('/api/v1/scenarios', {
        body: input as never,
      });
      if (error !== undefined) throw new Error('could not save scenario');
      return data as unknown as Scenario;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await api.DELETE('/api/v1/scenarios/{id}', {
        params: { path: { id } },
      });
      if (error !== undefined) throw new Error('could not delete scenario');
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
