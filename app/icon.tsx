import { ImageResponse } from 'next/og'

// Browser favicon, generated dynamically (no .ico tooling needed). Next wires
// the <link rel="icon"> automatically from this file.
export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0F6E56',
          color: 'white',
          fontSize: 19,
          fontWeight: 800,
          fontFamily: 'sans-serif',
          borderRadius: 7,
        }}
      >
        XI
      </div>
    ),
    { ...size },
  )
}
