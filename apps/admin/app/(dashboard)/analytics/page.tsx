'use client';

import { useEffect, useState } from 'react';

import { adminFetch } from '../../../lib/auth';
import { ui } from '../../../lib/ui';

interface FunnelStage {
  stage: string;
  count: number;
}

interface StatsOverview {
  users: Record<string, number>;
  applicationsByStatus: Record<string, number>;
  scenariosByType: Record<string, number>;
  documentsByStatus: Record<string, number>;
  messages: number;
  notifications: number;
  notificationsDelivered: number;
  funnel: FunnelStage[];
}

const NICE: Record<string, string> = {
  BORROWER: 'Borrowers',
  REALTOR: 'Realtors',
  LOAN_OFFICER: 'Loan officers',
  ADMIN: 'Admins',
  BASIC: 'Mortgage Payment',
  EXTRA_PAYMENT: 'Extra Payments',
  REFINANCE: 'Refinance',
  AFFORDABILITY: 'Affordability',
  RENT_VS_BUY: 'Rent vs. Buy',
  BUYDOWN: 'Rate Buydown',
  PROPERTY_ANALYSIS: 'Property Analysis',
};

function nice(key: string): string {
  return NICE[key] ?? key.replaceAll('_', ' ').toLowerCase();
}

function sum(record: Record<string, number>): number {
  return Object.values(record).reduce((a, b) => a + b, 0);
}

function Tile({ label, value, testId }: { label: string; value: number; testId?: string }) {
  return (
    <div style={{ ...ui.card, textAlign: 'center', padding: 16 }} data-testid={testId}>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#0F2A4A' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#5A6B7C' }}>{label}</div>
    </div>
  );
}

function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort(([, a], [, b]) => b - a);
  return (
    <div style={{ ...ui.card, display: 'grid', gap: 6 }}>
      <h2 style={{ margin: 0, fontSize: 15 }}>{title}</h2>
      {entries.length === 0 ? (
        <p style={ui.muted}>No data yet.</p>
      ) : (
        entries.map(([key, count]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#5A6B7C' }}>{nice(key)}</span>
            <strong>{count}</strong>
          </div>
        ))
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await adminFetch('/api/v1/stats/overview');
      if (response.ok) setStats((await response.json()) as StatsOverview);
      else setError(`could not load stats (${response.status})`);
    })();
  }, []);

  if (error !== null) return <p style={ui.error}>{error}</p>;
  if (stats === null) return <p style={ui.muted}>Loading…</p>;

  const funnelMax = Math.max(...stats.funnel.map((s) => s.count), 1);

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <h1 style={ui.h1}>Analytics</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Tile label="users" value={sum(stats.users)} testId="tile-users" />
        <Tile label="applications" value={sum(stats.applicationsByStatus)} testId="tile-apps" />
        <Tile label="saved scenarios" value={sum(stats.scenariosByType)} testId="tile-scenarios" />
        <Tile label="messages" value={stats.messages} testId="tile-messages" />
      </div>

      <div style={{ ...ui.card, display: 'grid', gap: 10 }} data-testid="funnel">
        <h2 style={{ margin: 0, fontSize: 15 }}>Borrower funnel</h2>
        {stats.funnel.map((step) => (
          <div key={step.stage} style={{ display: 'grid', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#5A6B7C' }}>{step.stage}</span>
              <strong>{step.count}</strong>
            </div>
            <div style={{ background: '#EDF1F6', borderRadius: 6, height: 14 }}>
              <div
                style={{
                  width: `${Math.max((step.count / funnelMax) * 100, step.count > 0 ? 3 : 0)}%`,
                  background: '#0F2A4A',
                  borderRadius: 6,
                  height: 14,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Breakdown title="Users by role" data={stats.users} />
        <Breakdown title="Applications by status" data={stats.applicationsByStatus} />
        <Breakdown title="Saved scenarios by calculator" data={stats.scenariosByType} />
        <Breakdown title="Documents by status" data={stats.documentsByStatus} />
      </div>

      <div style={{ ...ui.card }}>
        <h2 style={{ margin: 0, fontSize: 15 }}>Notifications</h2>
        <p style={{ ...ui.muted, marginTop: 6 }}>
          {stats.notifications} recorded in-app · {stats.notificationsDelivered} reached a device.
        </p>
      </div>

      <p style={ui.muted}>
        These numbers come straight from the app&rsquo;s own database. Once a PostHog project key is
        configured, tap-level behavior (calculator opens, screen views) streams there for deeper
        funnels — nothing else changes on this page.
      </p>
    </section>
  );
}
