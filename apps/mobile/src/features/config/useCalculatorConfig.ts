import { create } from 'zustand';

import { api } from '@/lib/api';

export interface Assumptions {
  defaultRatePct: number;
  pmiAnnualPct: number;
  propertyTaxAnnualPct: number;
  homeInsuranceAnnual: number;
}

interface CalculatorConfigState {
  assumptions: Assumptions;
  disabledKeys: string[];
  loaded: boolean;
  refresh: () => Promise<void>;
}

/** Code fallbacks — mirror the API's defaults so offline/boot behavior matches. */
const FALLBACK: Assumptions = {
  defaultRatePct: 6.5,
  pmiAnnualPct: 0.85,
  propertyTaxAnnualPct: 1.1,
  homeInsuranceAnnual: 1_500,
};

/**
 * Admin-tunable calculator settings, fetched once at app boot (and after
 * sign-in). Screens read initial input values synchronously via
 * `calculatorDefaults()` — if the fetch hasn't landed yet they get the same
 * code defaults the API would return for an untouched config.
 */
export const useCalculatorConfig = create<CalculatorConfigState>((set) => ({
  assumptions: FALLBACK,
  disabledKeys: [],
  loaded: false,
  refresh: async () => {
    try {
      const { data, error } = await api.GET('/api/v1/calculators/config');
      if (error !== undefined || data === undefined) return;
      const config = data as unknown as {
        assumptions: Assumptions;
        calculators: { key: string; enabled: boolean }[];
      };
      set({
        assumptions: config.assumptions,
        disabledKeys: config.calculators.filter((c) => !c.enabled).map((c) => c.key),
        loaded: true,
      });
    } catch {
      // Offline — keep fallbacks; the next refresh will catch up.
    }
  },
}));

/** Synchronous read for useState initializers. */
export function calculatorDefaults(): Assumptions {
  return useCalculatorConfig.getState().assumptions;
}
