'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useRef } from 'react'
import { Download, Scan } from 'lucide-react'

export default function UniversalQR({ appUrl }: { appUrl: string }) {
  const joinUrl = `${appUrl}/join`
  const qrRef = useRef<HTMLDivElement>(null)

  function downloadQR() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'social-coffe-universal-qr.svg'
    link.click()
  }

  return (
    <div className="mb-8 bg-card border border-border rounded-2xl p-6">
      <div className="flex items-start gap-6 flex-wrap">
        {/* QR */}
        <div ref={qrRef} className="bg-white p-3 rounded-xl border border-border shrink-0">
          <QRCodeSVG value={joinUrl} size={140} includeMargin={false} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Scan size={14} strokeWidth={2} className="text-primary" />
            </div>
            <h2 className="font-bold text-base">QR Code Universal</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Satu QR Code ini berlaku untuk <strong>semua coffee shop</strong>. Pasang di setiap meja — sistem otomatis mendeteksi lokasi pengunjung via GPS dan mengarahkan ke coffee shop yang tepat.
          </p>
          <div className="bg-muted rounded-xl px-4 py-3 text-xs font-mono text-muted-foreground break-all mb-4">
            {joinUrl}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={downloadQR}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
            >
              <Download size={14} strokeWidth={2.5} />
              Download QR
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Tip: cetak dan laminasi QR ini untuk dipasang di semua meja. Tidak perlu QR berbeda per coffee shop.
          </p>
        </div>
      </div>
    </div>
  )
}
