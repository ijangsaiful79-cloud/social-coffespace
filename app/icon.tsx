import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

export const size = { width: 192, height: 192 }
export const contentType = 'image/png'

export default function Icon() {
  const logoData = readFileSync(join(process.cwd(), 'public/logo-social.png'))
  const logoBase64 = logoData.toString('base64')

  return new ImageResponse(
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F7EEE1',
      borderRadius: '40px',
    }}>
      <img
        src={`data:image/png;base64,${logoBase64}`}
        style={{ width: '88%', height: '88%', objectFit: 'contain' }}
      />
    </div>,
    { ...size }
  )
}
