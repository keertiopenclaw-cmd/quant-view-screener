import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Quant View',
    short_name: 'Quant View',
    description: 'Live stock watchlist, portfolio value, and company headlines.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f5f7',
    theme_color: '#0f172a',
    icons: [{ src: '/icon', sizes: '32x32', type: 'image/png' }],
  };
}
