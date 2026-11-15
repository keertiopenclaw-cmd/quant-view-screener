import { ImageResponse } from 'next/og';

export const alt = 'Quant View, a live stock watchlist and market news dashboard';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0f172a',
          color: '#ffffff',
          padding: '64px',
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, letterSpacing: 4, color: '#94a3b8' }}>
          MARKETS DASHBOARD
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 700 }}>Quant View</div>
          <div style={{ display: 'flex', marginTop: 16, fontSize: 32, color: '#cbd5e1' }}>
            Live watchlist, portfolio, and company news
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
