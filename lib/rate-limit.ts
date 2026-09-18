const MAX_ATTEMPTS = 5
const WINDOW_MS = 10 * 60 * 1000 // 10 minutes

const store = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(ip: string): {
  ok: boolean
  remaining: number
  retryAfterSeconds?: number
} {
  const now = Date.now()
  const rec = store.get(ip)

  if (!rec || now > rec.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true, remaining: MAX_ATTEMPTS - 1 }
  }

  rec.count += 1

  if (rec.count > MAX_ATTEMPTS) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((rec.resetAt - now) / 1000),
    }
  }

  return { ok: true, remaining: MAX_ATTEMPTS - rec.count }
}

export function resetRateLimit(ip: string) {
  store.delete(ip)
}
