import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ShebiSpark',
  description: 'Power that tops itself up.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
