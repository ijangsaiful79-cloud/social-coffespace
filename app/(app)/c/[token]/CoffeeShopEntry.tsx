'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isWithinRadius } from '@/lib/utils/distance'

interface Shop {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  radius_meter: number
  access_token: string
  is_active: boolean
}

type Step = 'welcome' | 'gps' | 'verifying' | 'failed' | 'identity' | 'joining'

export default function CoffeeShopEntry({ shop }: { shop: Shop }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('welcome')
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setStep('gps')
      }
    })
  }, [])

  function handleGPSVerify() {
    setStep('verifying')
    setGpsError(null)

    if (!navigator.geolocation) {
      setGpsError('Browser kamu tidak mendukung GPS. Coba pakai Chrome.')
      setStep('failed')
      return
    }

    const onSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords
      const verified = isWithinRadius(
        latitude,
        longitude,
        shop.latitude,
        shop.longitude,
        shop.radius_meter
      )

      if (!verified) {
        setGpsError(`Kamu terlalu jauh dari ${shop.name}. Pastikan kamu berada di dalam coffee shop.`)
        setStep('failed')
        return
      }

      setStep('identity')
    }

    const onError = (error: GeolocationPositionError) => {
      if (error.code === 1) {
        setGpsError('Akses lokasi ditolak. Buka Pengaturan → Safari → Lokasi → Izinkan, lalu coba lagi.')
      } else if (error.code === 2) {
        setGpsError('Sinyal GPS lemah. Pastikan kamu di luar ruangan sebentar atau aktifkan WiFi untuk bantu lokasi.')
      } else {
        setGpsError('Waktu habis saat mengambil lokasi. Pastikan GPS aktif lalu coba lagi.')
      }
      setStep('failed')
    }

    // Pertama coba dengan akurasi tinggi
    navigator.geolocation.getCurrentPosition(onSuccess, (firstError) => {
      if (firstError.code === 1) {
        // Permission denied — langsung kasih error, jangan retry
        onError(firstError)
        return
      }
      // Timeout atau unavailable — fallback ke akurasi rendah + cache
      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 60000,
      })
    }, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    })
  }

  async function handleJoin(name: string) {
    setStep('joining')
    setJoinError(null)

    const supabase = createClient()

    // Sign in anonymously if not already logged in
    let userId: string
    const { data: existing } = await supabase.auth.getUser()
    if (existing.user) {
      userId = existing.user.id
    } else {
      const { data: anon, error: anonError } = await supabase.auth.signInAnonymously()
      if (anonError || !anon.user) {
        setJoinError('Gagal masuk. Coba lagi.')
        setStep('identity')
        return
      }
      userId = anon.user.id
    }

    // Upsert profile
    await supabase.from('profiles').upsert({
      user_id: userId,
      display_name: name,
      chat_enabled: true,
    })

    // Create or refresh coffee shop session
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000)

    const { data: existingSession } = await supabase
      .from('coffee_shop_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('coffee_shop_id', shop.id)
      .eq('status', 'active')
      .gt('expires_at', now.toISOString())
      .single()

    if (existingSession) {
      await supabase
        .from('coffee_shop_sessions')
        .update({
          last_active_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          gps_verified: true,
        })
        .eq('id', existingSession.id)
    } else {
      await supabase.from('coffee_shop_sessions').insert({
        user_id: userId,
        coffee_shop_id: shop.id,
        joined_at: now.toISOString(),
        last_active_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        gps_verified: true,
        status: 'active',
      })
    }

    router.push(`/people?shop=${shop.id}`)
  }

  function handleAnonymous() {
    const suffix = Math.floor(1000 + Math.random() * 9000)
    handleJoin(`Anonim #${suffix}`)
  }

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = displayName.trim()
    if (!name) return
    handleJoin(name)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Shop info */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">☕</div>
          <h1 className="text-2xl font-bold mb-1">{shop.name}</h1>
          <p className="text-sm text-muted-foreground">{shop.address}</p>
        </div>

        {step === 'welcome' && (
          <div className="space-y-4">
            <p className="text-center text-muted-foreground text-sm">
              Lihat siapa aja yang lagi di sini dan mulai ngobrol.
            </p>
            <button
              onClick={() => setStep('gps')}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
            >
              Gabung Sekarang
            </button>
          </div>
        )}

        {step === 'gps' && (
          <div className="space-y-4">
            <div className="bg-muted rounded-xl p-4 text-center text-sm text-muted-foreground">
              Kami perlu verifikasi bahwa kamu berada di <strong>{shop.name}</strong>.
            </div>
            <button
              onClick={handleGPSVerify}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
            >
              Verifikasi Lokasi
            </button>
          </div>
        )}

        {step === 'verifying' && (
          <div className="text-center space-y-3">
            <div className="text-3xl animate-pulse">📍</div>
            <p className="text-muted-foreground text-sm">Mengecek lokasi kamu...</p>
          </div>
        )}

        {step === 'failed' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-sm text-red-600">
              {gpsError}
            </div>
            <button
              onClick={() => setStep('gps')}
              className="w-full py-3 rounded-xl border border-border font-semibold hover:bg-muted transition"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {step === 'identity' && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="font-semibold text-base mb-1">Kamu mau tampil sebagai?</p>
              <p className="text-sm text-muted-foreground">Pilih anonim atau masukkan namamu</p>
            </div>

            <button
              onClick={handleAnonymous}
              className="w-full py-3 rounded-xl border border-border font-semibold hover:bg-muted transition text-sm"
            >
              Anonim
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">atau</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleNameSubmit} className="space-y-3">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Masukkan nama atau nickname"
                maxLength={30}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
              />
              <button
                type="submit"
                disabled={!displayName.trim()}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-40"
              >
                Masuk dengan Nama Ini
              </button>
            </form>

            {joinError && (
              <p className="text-sm text-red-500 text-center">{joinError}</p>
            )}
          </div>
        )}

        {step === 'joining' && (
          <div className="text-center space-y-3">
            <div className="text-3xl animate-pulse">✨</div>
            <p className="text-muted-foreground text-sm">Sedang masuk...</p>
          </div>
        )}
      </div>
    </main>
  )
}
