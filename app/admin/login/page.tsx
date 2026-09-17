'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const s = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0ebe4',
    padding: '0 16px',
    fontFamily: 'Arial, Helvetica, sans-serif',
  } as React.CSSProperties,
  wrapper: {
    width: '100%',
    maxWidth: '380px',
  } as React.CSSProperties,
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5ddd5',
    borderRadius: '16px',
    padding: '40px 32px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  } as React.CSSProperties,
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  } as React.CSSProperties,
  icon: {
    fontSize: '40px',
    marginBottom: '12px',
    display: 'block',
  } as React.CSSProperties,
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: '0 0 4px',
  } as React.CSSProperties,
  subtitle: {
    fontSize: '13px',
    color: '#6b6560',
    margin: 0,
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: '6px',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid #e5ddd5',
    backgroundColor: '#faf8f5',
    fontSize: '14px',
    color: '#1a1a1a',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'box-shadow 0.15s',
  } as React.CSSProperties,
  field: {
    marginBottom: '16px',
  } as React.CSSProperties,
  errorBox: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: '16px',
  } as React.CSSProperties,
  btn: (loading: boolean) => ({
    width: '100%',
    padding: '13px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: loading ? '#d9a07e' : '#c8763a',
    color: '#ffffff',
    fontWeight: '600',
    fontSize: '14px',
    cursor: loading ? 'not-allowed' : 'pointer',
    marginTop: '8px',
    transition: 'opacity 0.15s',
  } as React.CSSProperties),
  footer: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#6b6560',
    marginTop: '16px',
  } as React.CSSProperties,
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function onFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(200,118,58,0.25)'
    e.currentTarget.style.borderColor = '#c8763a'
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.boxShadow = 'none'
    e.currentTarget.style.borderColor = '#e5ddd5'
  }

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
    <main style={s.page}>
      <div style={s.wrapper}>
        <div style={s.card}>
          <div style={s.header}>
            <span style={s.icon}>☕</span>
            <h1 style={s.title}>Super Admin</h1>
            <p style={s.subtitle}>Coffee Dating Management</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={s.field}>
              <label style={s.label}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@email.com"
                style={s.input}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={s.input}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            {error && <div style={s.errorBox}>{error}</div>}

            <button type="submit" disabled={loading} style={s.btn(loading)}>
              {loading ? 'Masuk...' : 'Masuk ke Dashboard'}
            </button>
          </form>
        </div>

        <p style={s.footer}>Hanya untuk tim internal Coffee Dating</p>
      </div>
    </main>
  )
}
