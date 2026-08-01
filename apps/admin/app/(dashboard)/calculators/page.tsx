'use client';

import { useEffect, useState } from 'react';

import { adminFetch } from '../../../lib/auth';
import { ui } from '../../../lib/ui';

interface CalculatorState {
  key: string;
  title: string;
  enabled: boolean;
}

interface Assumptions {
  defaultRatePct: number;
  pmiAnnualPct: number;
  propertyTaxAnnualPct: number;
  homeInsuranceAnnual: number;
}

interface Config {
  assumptions: Assumptions;
  calculators: CalculatorState[];
}

const ASSUMPTION_FIELDS: { key: keyof Assumptions; label: string; hint: string }[] = [
  { key: 'defaultRatePct', label: 'Default interest rate (%)', hint: 'Prefilled in every calculator' },
  { key: 'pmiAnnualPct', label: 'Default PMI (%/yr)', hint: 'Applied while under 20% down' },
  { key: 'propertyTaxAnnualPct', label: 'Property tax (%/yr of value)', hint: 'Quick Quote & affordability estimate' },
  { key: 'homeInsuranceAnnual', label: 'Homeowners insurance ($/yr)', hint: 'Quick Quote & affordability estimate' },
];

export default function CalculatorsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await adminFetch('/api/v1/calculators/config');
      if (response.ok) {
        const data = (await response.json()) as Config;
        setConfig(data);
        setDrafts(
          Object.fromEntries(
            ASSUMPTION_FIELDS.map((f) => [f.key, String(data.assumptions[f.key])]),
          ),
        );
      } else {
        setError(`could not load config (${response.status})`);
      }
    })();
  }, []);

  const patch = async (body: unknown): Promise<void> => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const response = await adminFetch('/api/v1/calculators/config', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`save failed (${response.status})`);
      const data = (await response.json()) as Config;
      setConfig(data);
      setNote('Saved — the app picks this up on its next launch or sign-in.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save failed');
    } finally {
      setBusy(false);
    }
  };

  const saveAssumptions = (): void => {
    const assumptions: Record<string, number> = {};
    for (const field of ASSUMPTION_FIELDS) {
      const value = Number(drafts[field.key]);
      if (!Number.isFinite(value) || value < 0) {
        setError(`${field.label} must be a non-negative number`);
        return;
      }
      assumptions[field.key] = value;
    }
    void patch({ assumptions });
  };

  if (error !== null && config === null) return <p style={ui.error}>{error}</p>;
  if (config === null) return <p style={ui.muted}>Loading…</p>;

  return (
    <section style={{ display: 'grid', gap: 16, maxWidth: 640 }}>
      <h1 style={ui.h1}>Calculators</h1>
      <p style={ui.muted}>
        Turn calculators on or off in the borrower app, and tune the default assumptions they
        start with. Borrowers can always change values themselves.
      </p>

      <div style={{ ...ui.card, display: 'grid', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 15 }}>Available calculators</h2>
        {config.calculators.map((calc) => (
          <label
            key={calc.key}
            style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}
          >
            <input
              type="checkbox"
              checked={calc.enabled}
              disabled={busy}
              onChange={(e) =>
                void patch({ calculators: [{ key: calc.key, enabled: e.target.checked }] })
              }
              data-testid={`calc-toggle-${calc.key}`}
            />
            {calc.title}
          </label>
        ))}
      </div>

      <div style={{ ...ui.card, display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15 }}>Default assumptions</h2>
        {ASSUMPTION_FIELDS.map((field) => (
          <label key={field.key} style={ui.label}>
            {field.label}
            <input
              style={ui.input}
              inputMode="decimal"
              value={drafts[field.key] ?? ''}
              onChange={(e) => setDrafts((cur) => ({ ...cur, [field.key]: e.target.value }))}
              data-testid={`assume-${field.key}`}
            />
            <span style={{ fontSize: 11, color: '#5A6B7C' }}>{field.hint}</span>
          </label>
        ))}
        <button
          style={ui.button}
          disabled={busy}
          onClick={saveAssumptions}
          data-testid="assume-save"
        >
          {busy ? 'Saving…' : 'Save assumptions'}
        </button>
      </div>

      {note !== null ? <p style={ui.success} data-testid="calc-note">{note}</p> : null}
      {error !== null ? <p style={ui.error}>{error}</p> : null}
    </section>
  );
}
