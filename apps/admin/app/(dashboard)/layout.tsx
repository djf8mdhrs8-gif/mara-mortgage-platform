'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { getSession, logout, type AdminSession } from '../../lib/auth';

/**
 * Client-side gate for the dashboard group. UX only — every admin API
 * endpoint is independently protected by the server-side RolesGuard.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null | 'checking'>('checking');

  useEffect(() => {
    const current = getSession();
    if (current === null) {
      router.replace('/login');
    } else {
      setSession(current);
    }
  }, [router]);

  if (session === 'checking' || session === null) {
    return null;
  }

  const onSignOut = (): void => {
    logout();
    router.replace('/login');
  };

  return (
    <>
      <nav style={styles.nav}>
        <strong>Mara Mortgage Admin</strong>
        <div style={styles.links}>
          <Link href="/" style={styles.link}>
            Dashboard
          </Link>
          <Link href="/content" style={styles.link}>
            Content
          </Link>
          <Link href="/notifications" style={styles.link}>
            Notifications
          </Link>
          <Link href="/messages" style={styles.link}>
            Messages
          </Link>
          <Link href="/analytics" style={styles.link}>
            Analytics
          </Link>
        </div>
        <div style={styles.user}>
          <span style={styles.userName}>
            {session.user.firstName} {session.user.lastName}
          </span>
          <button onClick={onSignOut} style={styles.signOut} data-testid="admin-signout">
            Sign out
          </button>
        </div>
      </nav>
      <main style={styles.main}>{children}</main>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    padding: '14px 24px',
    background: '#0F2A4A',
    color: '#FFFFFF',
  },
  links: { display: 'flex', gap: 18, flex: 1 },
  link: { color: '#FFFFFF', textDecoration: 'none', fontSize: 14 },
  linkDisabled: { color: '#FFFFFF', opacity: 0.45, fontSize: 14 },
  user: { display: 'flex', alignItems: 'center', gap: 12 },
  userName: { fontSize: 13, opacity: 0.85 },
  signOut: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.4)',
    color: '#FFFFFF',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 13,
    cursor: 'pointer',
  },
  main: { maxWidth: 960, margin: '0 auto', padding: 24 },
};
