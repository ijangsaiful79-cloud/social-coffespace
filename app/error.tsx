'use client'

import { useEffect } from 'react'
import { Coffee } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg, #fdf0e6, #f5e0cc)' }}>
          <Coffee size={26} strokeWidth={1.75} style={{ color: '#c06c2e' }} />
        </div>
        <h2 className="text-lg font-semibold mb-2">Ups, ada yang salah</h2>
        <p className="text-sm text-muted-foreground mb-6">Coba lagi atau refresh halaman.</p>
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition min-h-[44px]"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  )
}
