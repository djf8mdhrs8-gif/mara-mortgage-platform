import type { paths } from '@mara/shared-types';

type Health =
  paths['/api/v1/health']['get']['responses']['200']['content']['application/json'];

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

async function getHealth(): Promise<Health | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/health`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as Health;
  } catch {
    return null;
  }
}

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E1E6EC',
  borderRadius: 12,
  padding: 20,
  display: 'flex',
  alignItems: 'center',
  gap: 14,
};

export default async function DashboardPage() {
  const health = await getHealth();
  const up = health !== null;

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <h1 style={{ fontSize: 22, color: '#10202F', margin: '8px 0 0' }}>System status</h1>
      <div style={cardStyle}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            background: up ? '#1F7A4D' : '#B3261E',
            display: 'inline-block',
          }}
        />
        <div>
          <div style={{ fontWeight: 600, color: up ? '#1F7A4D' : '#B3261E' }}>
            {up ? 'API connected' : 'API unreachable'}
          </div>
          <div style={{ fontSize: 13, color: '#5A6B7C' }}>
            {up
              ? `status ${health.status} · database ${health.db} · up ${health.uptimeSeconds}s · ${health.timestamp}`
              : `no response from ${API_URL} — is the backend running?`}
          </div>
        </div>
      </div>
    </section>
  );
}
