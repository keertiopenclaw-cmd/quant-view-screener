import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clouds',
  description: 'Google-Grade Portfolio Intelligence',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
