import type { Metadata, Viewport } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quant-view-screener.vercel.app';
const title = 'Quant View — Live stock watchlist';
const description =
  'A personal markets dashboard for a live stock watchlist, estimated portfolio value, and company headlines.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: '%s · Quant View',
  },
  description,
  applicationName: 'Quant View',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Quant View',
    description,
    siteName: 'Quant View',
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quant View',
    description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#f5f5f7',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <noscript>
          <p style={{ padding: '1.5rem', fontFamily: 'sans-serif' }}>
            Quant View needs JavaScript to load live prices and headlines.
          </p>
        </noscript>
      </body>
    </html>
  );
}
