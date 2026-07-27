'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { login } from '../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await login(email, password);
    setBusy(false);
    if (result.ok) {
      router.replace('/');
    } else {
      setError(result.error);
    }
  };

  return (
    <div style={styles.wrap}>
      <form onSubmit={(e) => void onSubmit(e)} style={styles.card}>
        <div style={styles.banner}>
          <Image
            src="/chl-wordmark-white.png"
            alt="Certified Home Loans"
            width={224}
            height={52}
            priority
          />
        </div>
        <h1 style={styles.title}>Admin sign in</h1>
        <label style={styles.label}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            autoComplete="username"
            required
            data-testid="admin-email"
          />
        </label>
        <label style={styles.label}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            autoComplete="current-password"
            required
            data-testid="admin-password"
          />
        </label>
        {error !== null ? (
          <p style={styles.error} data-testid="admin-error">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={busy} style={styles.button} data-testid="admin-submit">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p style={styles.note}>Administrator access only. Sessions end when the tab closes.</p>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F5F7FA',
    padding: 24,
  },
  card: {
    width: 380,
    background: '#FFFFFF',
    border: '1px solid #E1E6EC',
    borderRadius: 12,
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  banner: {
    background: '#0F2A4A',
    borderRadius: 8,
    padding: '18px 12px',
    display: 'flex',
    justifyContent: 'center',
  },
  title: { fontSize: 20, color: '#10202F', margin: '6px 0 0' },
  label: { fontSize: 13, color: '#5A6B7C', display: 'flex', flexDirection: 'column', gap: 6 },
  input: {
    border: '1px solid #E1E6EC',
    borderRadius: 6,
    padding: '10px 12px',
    fontSize: 15,
    color: '#10202F',
  },
  error: { color: '#B3261E', fontSize: 13, margin: 0 },
  button: {
    background: '#0F2A4A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    padding: '12px 16px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  note: { color: '#5A6B7C', fontSize: 12, margin: 0, textAlign: 'center' },
};
