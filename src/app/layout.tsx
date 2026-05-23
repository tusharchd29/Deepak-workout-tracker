import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Performance Management System',
  description: 'Workout tracker',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0f0f13' }}>
        {children}
      </body>
    </html>
  );
}
