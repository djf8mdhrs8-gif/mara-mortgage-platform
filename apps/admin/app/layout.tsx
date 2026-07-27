import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Mara Mortgage — Admin',
  description: 'Internal dashboard for content, notifications, and analytics.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#F5F7FA' }}>
        {children}
      </body>
    </html>
  );
}
