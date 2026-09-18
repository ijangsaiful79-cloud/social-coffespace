import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  const logoData = readFileSync(join(process.cwd(), 'public/logo-social.png'))
  const logoBase64 = logoData.toString('base64')

  return new ImageResponse(
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F7EEE1',
      borderRadius: '38px',
    }}>
      <img
        src={`data:image/png;base64,${logoBase64}`}
        style={{ width: '88%', height: '88%', objectFit: 'contain' }}
      />
    </div>,
    { ...size }
  )
}
