'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isWithinRadius } from '@/lib/utils/distance'
import { Coffee, MapPin, EyeOff, UserRound, Loader2 } from 'lucide-react'
import InterestPicker from '@/components/InterestPicker'

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

type Step = 'checking' | 'welcome' | 'gps' | 'verifying' | 'failed' | 'identity' | 'joining'
type Mode = 'anonymous' | 'full'

export default function CoffeeShopEntry({ shop }: { shop: Shop }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('checking')
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [mode, setMode] = useState<Mode>('anonymous')
  const [age, setAge] = useState('')
  const [bio, setBio] = useState('')
  const [instagram, setInstagram] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('')
  const [interests, setInterests] = useState<string[]>([])
  const [joinError, setJoinError] = useState<string | null>(null)
  const [existingUserId, setExistingUserId] = useState<string | null>(null)

  useEffect(() => {
    checkExistingSession()
  }, [])

  async function checkExistingSession() {
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()

    if (!auth.user) {
      setStep('welcome')
      return
    }

    const uid = auth.user.id
    setExistingUserId(uid)

    // Check if they have a profile (meaning they've set identity before)
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, is_anonymous')
      .eq('user_id', uid)
      .single()

    if (!profile) {
      // Has auth but no profile — must verify GPS first before identity
      setStep('gps')
      return
    }

    // Pre-fill identity fields in case they need to re-enter
    setDisplayName(profile.display_name)
    setMode(profile.is_anonymous ? 'anonymous' : 'full')

    // Check if coffee shop session is still active
    const { data: session } = await supabase
      .from('coffee_shop_sessions')
      .select('id')
      .eq('user_id', uid)
      .eq('coffee_shop_id', shop.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (session) {
      // Session masih aktif — langsung ke People Here
      router.replace(`/people?shop=${shop.id}`)
      return
    }

    // Profile ada tapi session expired — skip ke GPS saja
    setStep('gps')
  }

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
      const verified = isWithinRadius(latitude, longitude, shop.latitude, shop.longitude, shop.radius_meter)
      if (!verified) {
        setGpsError(`Kamu terlalu jauh dari ${shop.name}. Pastikan kamu berada di dalam coffee shop.`)
        setStep('failed')
        return
      }
      // Kalau sudah punya profile → langsung join, skip identity
      if (existingUserId && displayName) {
        joinSession(existingUserId)
      } else {
        setStep('identity')
      }
    }

    const onError = (error: GeolocationPositionError) => {
      if (error.code === 1) {
        setGpsError('Akses lokasi ditolak. Buka Pengaturan → Safari → Lokasi → Izinkan, lalu coba lagi.')
      } else if (error.code === 2) {
        setGpsError('Sinyal GPS lemah. Aktifkan WiFi untuk bantu lokasi lalu coba lagi.')
      } else {
        setGpsError('Waktu habis saat mengambil lokasi. Pastikan GPS aktif lalu coba lagi.')
      }
      setStep('failed')
    }

    navigator.geolocation.getCurrentPosition(onSuccess, (firstError) => {
      if (firstError.code === 1) { onError(firstError); return }
      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 60000,
      })
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 })
  }

  async function joinSession(uid: string) {
    const supabase = createClient()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000)

    const { data: existingSession } = await supabase
      .from('coffee_shop_sessions')
      .select('id')
      .eq('user_id', uid)
      .eq('coffee_shop_id', shop.id)
      .eq('status', 'active')
      .single()

    if (existingSession) {
      await supabase
        .from('coffee_shop_sessions')
        .update({ last_active_at: now.toISOString(), expires_at: expiresAt.toISOString(), gps_verified: true })
        .eq('id', existingSession.id)
    } else {
      await supabase.from('coffee_shop_sessions').insert({
        user_id: uid,
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

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const name = displayName.trim()
    if (!name) return

    setStep('joining')
    setJoinError(null)

    const supabase = createClient()
    let uid = existingUserId

    if (!uid) {
      const { data: anon, error: anonError } = await supabase.auth.signInAnonymously()
      if (anonError || !anon.user) {
        setJoinError('Gagal masuk. Coba lagi.')
        setStep('identity')
        return
      }
      uid = anon.user.id
      setExistingUserId(uid)
    }

    await supabase.from('profiles').upsert({
      user_id: uid,
      display_name: name,
      is_anonymous: mode === 'anonymous',
      gender: gender || 'prefer_not_to_say',
      chat_enabled: true,
      ...(mode === 'full' && {
        age: age ? parseInt(age) : null,
        bio: bio.trim() || null,
        interests: interests.length > 0 ? interests : null,
        instagram: instagram.trim() || null,
        whatsapp: whatsapp.trim() || null,
      }),
    }, { onConflict: 'user_id' })

    await joinSession(uid)
  }

  if (step === 'checking') {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-4">
        <Coffee size={36} strokeWidth={1.5} className="text-primary animate-pulse" />
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4" style={{ boxShadow: '0 4px 16px rgba(197,122,110,0.30)' }}>
            <Coffee size={28} strokeWidth={2} color="white" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-1 text-primary">{shop.name}</h1>
          <p className="text-sm text-muted-foreground">{shop.address}</p>
        </div>

        {step === 'welcome' && (
          <div className="space-y-4">
            <p className="text-center text-muted-foreground text-sm">
              Lihat siapa aja yang lagi di sini dan mulai ngobrol.
            </p>
            <button
              onClick={() => setStep('gps')}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition min-h-[48px]"
            >
              Gabung Sekarang
            </button>
          </div>
        )}

        {step === 'gps' && (
          <div className="space-y-4">
            {existingUserId && displayName && (
              <div className="bg-muted rounded-xl px-4 py-3 text-sm text-center text-muted-foreground">
                Selamat datang lagi, <strong>{displayName}</strong>
              </div>
            )}
            <div className="bg-muted rounded-xl p-4 flex items-start gap-3 text-sm text-muted-foreground">
              <MapPin size={16} strokeWidth={2} className="shrink-0 mt-0.5 text-primary" />
              <span>Kami perlu verifikasi bahwa kamu berada di <strong>{shop.name}</strong>.</span>
            </div>
            <button
              onClick={handleGPSVerify}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition min-h-[48px]"
            >
              Verifikasi Lokasi
            </button>
          </div>
        )}

        {step === 'verifying' && (
          <div className="text-center space-y-3">
            <Loader2 size={32} strokeWidth={2} className="animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground text-sm">Mengecek lokasi kamu...</p>
          </div>
        )}

        {step === 'failed' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
              {gpsError}
            </div>
            <button
              onClick={() => setStep('gps')}
              className="w-full py-3 rounded-xl border border-border font-semibold hover:bg-muted transition min-h-[48px]"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {step === 'identity' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="text-center mb-2">
              <p className="font-semibold text-base">Kamu mau tampil sebagai?</p>
              <p className="text-sm text-muted-foreground">Masukkan nama atau nickname kamu</p>
            </div>

            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nama atau nickname"
              maxLength={30}
              required
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition min-h-[48px]"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('anonymous')}
                className={`py-3 rounded-xl border text-sm font-semibold transition flex items-center justify-center gap-2 min-h-[48px] ${
                  mode === 'anonymous' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                }`}
              >
                <EyeOff size={15} strokeWidth={2} />
                Anonim
              </button>
              <button
                type="button"
                onClick={() => setMode('full')}
                className={`py-3 rounded-xl border text-sm font-semibold transition flex items-center justify-center gap-2 min-h-[48px] ${
                  mode === 'full' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                }`}
              >
                <UserRound size={15} strokeWidth={2} />
                Profil Lengkap
              </button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {mode === 'anonymous' ? 'Hanya nama yang terlihat oleh orang lain' : 'Nama, usia, bio, dan sosmed kamu terlihat'}
            </p>

            <div>
              <p className="text-xs font-medium text-muted-foreground text-center mb-2">Jenis kelamin kamu?</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'female', label: 'Cewek' },
                  { value: 'male', label: 'Cowok' },
                  { value: 'other', label: 'Lainnya' },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGender(value)}
                    className={`py-2.5 rounded-xl border text-sm font-semibold transition ${
                      gender === value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'full' && (
              <div className="space-y-3 border border-border rounded-xl p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data Profil Lengkap</p>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Usia"
                  min={17}
                  max={99}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                />
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Bio singkat (opsional)"
                  maxLength={150}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition resize-none"
                />
                <InterestPicker selected={interests} onChange={setInterests} />
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="Instagram username (opsional)"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                />
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Nomor WhatsApp (opsional)"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                />
              </div>
            )}

            {joinError && <p className="text-sm text-red-500 text-center">{joinError}</p>}

            <button
              type="submit"
              disabled={!displayName.trim() || !gender}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-40"
            >
              Masuk ke People Here
            </button>
          </form>
        )}

        {step === 'joining' && (
          <div className="text-center space-y-3">
            <Loader2 size={32} strokeWidth={2} className="animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground text-sm">Sedang masuk...</p>
          </div>
        )}
      </div>
    </main>
  )
}
