import { useEffect, useRef, useState } from 'react'
import { isWithinRadius } from '@/lib/utils/distance'

interface Options {
  lat: number | null
  lng: number | null
  radiusMeter: number | null
  enabled: boolean
}

// Extra buffer beyond the shop radius before we consider someone "outside"
const GRACE_BUFFER_METERS = 50
// First check starts after 2 min (user just verified GPS — no need to re-check immediately)
const FIRST_CHECK_MS = 2 * 60 * 1000
// Subsequent checks every 3 minutes
const CHECK_INTERVAL_MS = 3 * 60 * 1000
// Need 2 consecutive misses to confirm the user is really outside (avoids GPS glitches)
const REQUIRED_MISSES = 2

export function useLocationGuard({ lat, lng, radiusMeter, enabled }: Options) {
  const [isOutside, setIsOutside] = useState(false)
  const missesRef = useRef(0)

  useEffect(() => {
    if (!enabled || lat == null || lng == null || radiusMeter == null) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    const check = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const within = isWithinRadius(
            pos.coords.latitude,
            pos.coords.longitude,
            lat,
            lng,
            radiusMeter + GRACE_BUFFER_METERS
          )
          if (within) {
            missesRef.current = 0
          } else {
            missesRef.current += 1
            if (missesRef.current >= REQUIRED_MISSES) {
              setIsOutside(true)
            }
          }
        },
        () => {
          // GPS error — don't penalize the user, they might just have bad signal
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      )
    }

    const firstTimer = setTimeout(check, FIRST_CHECK_MS)
    const intervalId = setInterval(check, CHECK_INTERVAL_MS)

    return () => {
      clearTimeout(firstTimer)
      clearInterval(intervalId)
    }
  }, [enabled, lat, lng, radiusMeter])

  return { isOutside }
}
