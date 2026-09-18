'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor, X } from 'lucide-react'

const ACCENTS = [
  { key: 'kopi', label: 'Kopi', color: '#c06c2e' },
  { key: 'rose', label: 'Mawar', color: '#c04868' },
  { key: 'sage', label: 'Sage', color: '#4a7c6e' },
] as const

type AccentKey = typeof ACCENTS[number]['key']

interface Props {
  onClose: () => void
}

export default function ThemeSwitcher({ onClose }: Props) {
  const { theme, setTheme } = useTheme()
  const [accent, setAccent] = useState<AccentKey>('kopi')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = (localStorage.getItem('accent') ?? 'kopi') as AccentKey
    setAccent(saved)
    // Restore accent to DOM on every mount (survives page refresh)
    if (saved === 'kopi') {
      document.documentElement.removeAttribute('data-accent')
    } else {
      document.documentElement.setAttribute('data-accent', saved)
    }
  }, [])

  function applyAccent(key: AccentKey) {
    setAccent(key)
    localStorage.setItem('accent', key)
    if (key === 'kopi') {
      document.documentElement.removeAttribute('data-accent')
    } else {
      document.documentElement.setAttribute('data-accent', key)
    }
  }

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-auto rounded-t-2xl bg-card border border-border pb-safe-bottom"
        style={{ boxShadow: '0 -4px 24px 0 rgba(0,0,0,0.12)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="px-5 pt-2 pb-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-base">Tampilan</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition text-muted-foreground">
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Mode */}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2.5">Mode</p>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {([
              { value: 'light', label: 'Terang', icon: Sun },
              { value: 'system', label: 'Sistem', icon: Monitor },
              { value: 'dark', label: 'Gelap', icon: Moon },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-2 py-3 rounded-xl border text-sm font-semibold transition ${
                  theme === value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-muted text-foreground'
                }`}
              >
                <Icon size={18} strokeWidth={1.75} />
                {label}
              </button>
            ))}
          </div>

          {/* Accent */}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2.5">Warna Aksen</p>
          <div className="flex gap-3">
            {ACCENTS.map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => applyAccent(key)}
                className="flex flex-col items-center gap-2 flex-1"
              >
                <div
                  className="w-12 h-12 rounded-full transition-all"
                  style={{
                    background: color,
                    boxShadow: accent === key
                      ? `0 0 0 3px var(--background), 0 0 0 5px ${color}`
                      : '0 1px 4px rgba(0,0,0,0.15)',
                    transform: accent === key ? 'scale(1.12)' : 'scale(1)',
                  }}
                />
                <span className={`text-xs font-medium ${accent === key ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
