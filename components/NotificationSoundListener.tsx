'use client'

import { useEffect } from 'react'
import { playNotificationSound, primeAudioContext } from '@/lib/notification-sound'

export default function NotificationSoundListener() {
  useEffect(() => {
    // Unlock AudioContext on first user interaction (required on iOS)
    const unlock = () => {
      primeAudioContext()
      document.removeEventListener('touchstart', unlock)
      document.removeEventListener('click', unlock)
    }
    document.addEventListener('touchstart', unlock, { passive: true })
    document.addEventListener('click', unlock)

    if (!('serviceWorker' in navigator)) return
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'PLAY_NOTIFICATION_SOUND') {
        playNotificationSound()
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => {
      navigator.serviceWorker.removeEventListener('message', handler)
      document.removeEventListener('touchstart', unlock)
      document.removeEventListener('click', unlock)
    }
  }, [])
  return null
}
