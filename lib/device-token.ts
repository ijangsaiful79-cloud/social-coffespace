const KEY = 'sc_dt'

export function getDeviceToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(KEY)
}

export function generateAndSaveDeviceToken(): string {
  const token = crypto.randomUUID()
  localStorage.setItem(KEY, token)
  return token
}

export function clearDeviceToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}
