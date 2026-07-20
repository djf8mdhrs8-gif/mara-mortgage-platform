import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Mara Mortgage — Admin',
  description: 'Internal dashboard for content, notifications, and analytics.',
};

const navStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 24,
  padding: '14px 24px',
  background: '#0F2A4A',
  color: '#FFFFFF',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#F5F7FA' }}>
        <nav style={navStyle}>
          <strong>Mara Mortgage Admin</strong>
          <span style={{ opacity: 0.7, fontSize: 14 }}>
            content · notifications · analytics (arriving in Milestones 28-30)
          </span>
        </nav>
        <main style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>{children}</main>
      </body>
    </html>
  );
}
