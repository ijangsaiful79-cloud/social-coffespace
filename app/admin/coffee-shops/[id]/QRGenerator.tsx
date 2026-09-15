'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useRef } from 'react'

export default function QRGenerator({ url, shopName }: { url: string; shopName: string }) {
  const qrRef = useRef<HTMLDivElement>(null)

  function downloadQR() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `qr-${shopName.toLowerCase().replace(/\s+/g, '-')}.svg`
    link.click()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={qrRef} className="bg-white p-4 rounded-xl border border-border inline-block">
        <QRCodeSVG value={url} size={200} includeMargin={false} />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        URL yang sama dipakai untuk QR Code dan NFC Tag
      </p>
      <button
        onClick={downloadQR}
        className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
      >
        Download QR Code
      </button>
    </div>
  )
}
