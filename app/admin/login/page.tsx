'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Login gagal.')
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: '#f0ebe4' }}
    >
      <div className="w-full max-w-sm">
        <div
          className="rounded-2xl px-8 py-10 shadow-sm"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5ddd5',
          }}
        >
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">☕</div>
            <h1 className="text-xl font-bold" style={{ color: '#1a1a1a' }}>
              Super Admin
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6b6560' }}>
              Coffee Dating Management
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#1a1a1a' }}
              >
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@email.com"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition"
                style={{
                  backgroundColor: '#faf8f5',
                  border: '1px solid #e5ddd5',
                  color: '#1a1a1a',
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.boxShadow =
                    '0 0 0 3px rgba(200,118,58,0.2)')
                }
                onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#1a1a1a' }}
              >
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition"
                style={{
                  backgroundColor: '#faf8f5',
                  border: '1px solid #e5ddd5',
                  color: '#1a1a1a',
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.boxShadow =
                    '0 0 0 3px rgba(200,118,58,0.2)')
                }
                onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
              />
            </div>

            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm text-center"
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition mt-2"
              style={{
                backgroundColor: loading ? '#d9a07e' : '#c8763a',
                color: '#ffffff',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Masuk...' : 'Masuk ke Dashboard'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: '#6b6560' }}>
          Hanya untuk tim internal Coffee Dating
        </p>
      </div>
    </main>
  )
}
