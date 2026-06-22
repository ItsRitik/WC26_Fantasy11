import { ImageResponse } from 'next/og'

// Apple touch icon (home-screen). Generated dynamically; Next wires the
// <link rel="apple-touch-icon"> automatically.
export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #04342C 0%, #0F6E56 100%)',
          color: 'white',
          fontSize: 96,
          fontWeight: 800,
          fontFamily: 'sans-serif',
        }}
      >
        XI
      </div>
    ),
    { ...size },
  )
}
