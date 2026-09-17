'use client'

import { useEffect } from 'react'
import { playNotificationSound } from '@/lib/notification-sound'

export default function NotificationSoundListener() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'PLAY_NOTIFICATION_SOUND') {
        playNotificationSound()
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])
  return null
}
