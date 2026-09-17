let audioCtx: AudioContext | null = null
let unlocked = false

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!audioCtx) audioCtx = new AudioContext()
    return audioCtx
  } catch {
    return null
  }
}

// Call on first user interaction to unlock AudioContext on iOS
export function primeAudioContext() {
  if (unlocked) return
  const ctx = getCtx()
  if (!ctx) return
  try {
    const buf = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start(0)
    unlocked = true
  } catch {
    // ignore
  }
}

export async function playNotificationSound() {
  const ctx = getCtx()
  if (!ctx) return
  try {
    if (ctx.state === 'suspended') await ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    const now = ctx.currentTime
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.setValueAtTime(1100, now + 0.08)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.25, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
    osc.start(now)
    osc.stop(now + 0.45)
  } catch {
    // silently fail
  }
}
