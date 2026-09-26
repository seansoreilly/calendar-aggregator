import { ImageResponse } from 'next/og'

export const alt = 'Calendar Aggregator — one URL for all your calendars'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          backgroundColor: '#F2F4F3',
          color: '#14161A',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: 28,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: '#63696B',
          }}
        >
          iCal feed aggregator
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 84,
            fontWeight: 800,
            lineHeight: 1.05,
            marginTop: 28,
            letterSpacing: -2,
          }}
        >
          <span>Many calendars.</span>
          <span style={{ color: '#BD3D24' }}>One URL.</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 30,
            color: '#63696B',
            marginTop: 40,
            maxWidth: 820,
          }}
        >
          Combine several iCal feeds into a single subscription URL.
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
