'use client'

import { useEffect, useState } from 'react'
import { Bell, Smartphone, X } from 'lucide-react'

interface Props {
  userId: string
  vapidKey: string
}

export default function PushPromptBanner({ userId, vapidKey }: Props) {
  const [state, setState] = useState<'hidden' | 'ios-guide' | 'ios-ask' | 'ask'>('hidden')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') return

    // iPad iOS 13+ reports as "Macintosh" — check maxTouchPoints as fallback
    const isIos = (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
      !(window as unknown as Record<string, unknown>)['MSStream']
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as Record<string, unknown>)['standalone'] === true

    if (isIos) {
      if (!isStandalone) {
        if (localStorage.getItem('push-ios-guide-dismissed')) return
        setState('ios-guide')
      } else {
        if (sessionStorage.getItem('push-banner-dismissed')) return
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          setState('ios-ask')
        }
      }
    } else if ('serviceWorker' in navigator && 'PushManager' in window) {
      if (sessionStorage.getItem('push-banner-dismissed')) return
      setState('ask')
    }
  }, [])

  function dismissGuide() {
    localStorage.setItem('push-ios-guide-dismissed', '1')
    setState('hidden')
  }

  function dismissAsk() {
    sessionStorage.setItem('push-banner-dismissed', '1')
    setState('hidden')
  }

  async function enableNotifications() {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { dismissAsk(); return }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription: sub }),
      })
    } catch {
      // Push not supported or user denied
    }
    dismissAsk()
  }

  if (state === 'hidden') return null

  if (state === 'ios-guide') {
    return (
      <div className="mx-4 mb-3 flex items-start gap-3 bg-secondary border border-border rounded-2xl px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <Smartphone size={15} strokeWidth={2} className="text-secondary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Aktifkan notifikasi di iPhone</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tap <strong>Share ↑</strong> lalu pilih <strong>"Add to Home Screen"</strong>, kemudian buka app dari ikon di home screen.
          </p>
        </div>
        <button onClick={dismissGuide} className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition shrink-0">
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>
    )
  }

  if (state === 'ios-ask') {
    return (
      <div className="mx-4 mb-3 flex items-center gap-3 bg-secondary border border-border rounded-2xl px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Bell size={14} strokeWidth={2} className="text-secondary-foreground" />
        </div>
        <p className="flex-1 text-sm font-medium text-foreground">Aktifkan notifikasi pesan baru di iPhone</p>
        <button onClick={enableNotifications} className="shrink-0 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition">Aktifkan</button>
        <button onClick={dismissAsk} className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition shrink-0">
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>
    )
  }

  return (
    <div className="mx-4 mb-3 flex items-center gap-3 bg-secondary border border-border rounded-2xl px-4 py-3">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Bell size={14} strokeWidth={2} className="text-secondary-foreground" />
      </div>
      <p className="flex-1 text-sm font-medium text-foreground">Aktifkan notifikasi pesan baru</p>
      <button onClick={enableNotifications} className="shrink-0 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition">Aktifkan</button>
      <button onClick={dismissAsk} className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition shrink-0">
        <X size={13} strokeWidth={2.5} />
      </button>
    </div>
  )
}
