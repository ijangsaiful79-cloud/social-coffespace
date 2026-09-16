'use client'

import { useEffect } from 'react'

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
        <p className="text-4xl mb-4">☕</p>
        <h2 className="text-lg font-semibold mb-2">Ups, ada yang salah</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Coba lagi atau refresh halaman.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  )
}
