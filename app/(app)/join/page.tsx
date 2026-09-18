'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Coffee, MapPin, Loader2, AlertCircle, WifiOff } from 'lucide-react'

type Step = 'locating' | 'found' | 'none' | 'ambiguous' | 'denied' | 'unavailable' | 'timeout' | 'error'

interface FoundShop {
  id: string
  name: string
  address: string
  access_token: string
}

export default function JoinPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('locating')
  const [shop, setShop] = useState<FoundShop | null>(null)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    detect()
  }, [])

  // Auto-redirect once shop is found
  useEffect(() => {
    if (step === 'found' && shop) {
      const t = setTimeout(() => {
        router.replace(`/c/${shop.access_token}`)
      }, 1800)
      return () => clearTimeout(t)
    }
  }, [step, shop, router])

  async function detect() {
    setRetrying(false)

    if (!navigator.geolocation) {
      setStep('unavailable')
      return
    }

    // Get position with high accuracy first, fall back to network
    navigator.geolocation.getCurrentPosition(
      (pos) => locate(pos.coords.latitude, pos.coords.longitude),
      (firstErr) => {
        if (firstErr.code === GeolocationPositionError.PERMISSION_DENIED) {
          setStep('denied')
          return
        }
        // Retry with lower accuracy
        navigator.geolocation.getCurrentPosition(
          (pos) => locate(pos.coords.latitude, pos.coords.longitude),
          (err) => {
            if (err.code === GeolocationPositionError.PERMISSION_DENIED) setStep('denied')
            else setStep('timeout')
          },
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
        )
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  }

  async function locate(lat: number, lng: number) {
    try {
      const res = await fetch(`/api/locate-shop?lat=${lat}&lng=${lng}`)
      const data = await res.json()

      if (data.shop) {
        setShop(data.shop)
        setStep('found')
      } else if (data.error === 'ambiguous') {
        setStep('ambiguous')
      } else {
        setStep('none')
      }
    } catch {
      setStep('error')
    }
  }

  function retry() {
    setRetrying(true)
    setStep('locating')
    detect()
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4"
            style={{ boxShadow: '0 4px 16px rgba(197,122,110,0.30)' }}>
            <Coffee size={28} strokeWidth={2} color="white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-primary">Social Coffé</h1>
          <p className="text-sm text-muted-foreground mt-1">Kenalan di coffee shop</p>
        </div>

        {/* Locating */}
        {step === 'locating' && (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto">
              <MapPin size={24} strokeWidth={1.75} className="text-primary animate-pulse" />
            </div>
            <div>
              <p className="font-semibold text-base">Mendeteksi lokasi kamu...</p>
              <p className="text-sm text-muted-foreground mt-1">
                {retrying ? 'Mencoba kembali dengan akurasi lebih rendah...' : 'Izinkan akses lokasi saat diminta'}
              </p>
            </div>
            <Loader2 size={20} className="animate-spin text-muted-foreground mx-auto" />
          </div>
        )}

        {/* Found */}
        {step === 'found' && shop && (
          <div className="text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <MapPin size={24} strokeWidth={2} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Coffee shop terdeteksi</p>
              <p className="font-display text-xl font-bold text-foreground">{shop.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{shop.address}</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Mengarahkan ke halaman masuk...
            </div>
          </div>
        )}

        {/* Not in any shop */}
        {step === 'none' && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={24} strokeWidth={1.75} className="text-muted-foreground" />
              </div>
              <p className="font-semibold text-base">Tidak terdeteksi di coffee shop</p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                GPS kamu tidak mendeteksi coffee shop terdaftar di sekitar kamu. Pastikan kamu sudah berada di dalam coffee shop.
              </p>
            </div>
            <button onClick={retry}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition min-h-[48px]">
              Coba Lagi
            </button>
          </div>
        )}

        {/* Ambiguous */}
        {step === 'ambiguous' && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={24} strokeWidth={1.75} className="text-amber-600" />
              </div>
              <p className="font-semibold text-base">GPS mendeteksi beberapa lokasi</p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Ada lebih dari satu coffee shop terdeteksi di sekitar kamu. Minta barista untuk membantu atau coba dari dalam coffee shop.
              </p>
            </div>
            <button onClick={retry}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition min-h-[48px]">
              Coba Lagi
            </button>
          </div>
        )}

        {/* Location denied */}
        {step === 'denied' && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <MapPin size={24} strokeWidth={1.75} className="text-red-500" />
              </div>
              <p className="font-semibold text-base">Izin lokasi ditolak</p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Aplikasi ini membutuhkan izin lokasi untuk mendeteksi coffee shop kamu.
              </p>
            </div>
            <div className="bg-muted rounded-xl p-4 text-sm text-muted-foreground space-y-1.5">
              <p className="font-medium text-foreground">Cara mengaktifkan:</p>
              <p>• iPhone: Pengaturan → Safari → Lokasi → Izinkan</p>
              <p>• Android: Pengaturan → Aplikasi → Chrome → Izin → Lokasi</p>
            </div>
            <button onClick={retry}
              className="w-full py-3 rounded-xl border border-border font-semibold hover:bg-muted transition min-h-[48px]">
              Sudah diaktifkan, Coba Lagi
            </button>
          </div>
        )}

        {/* GPS unavailable */}
        {step === 'unavailable' && (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto">
              <WifiOff size={24} strokeWidth={1.75} className="text-muted-foreground" />
            </div>
            <p className="font-semibold text-base">GPS tidak tersedia</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Browser kamu tidak mendukung GPS. Coba pakai Chrome atau Safari terbaru.
            </p>
          </div>
        )}

        {/* Timeout */}
        {step === 'timeout' && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <WifiOff size={24} strokeWidth={1.75} className="text-muted-foreground" />
              </div>
              <p className="font-semibold text-base">Sinyal GPS lemah</p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Tidak bisa mendapatkan lokasi kamu. Aktifkan WiFi untuk membantu akurasi GPS, lalu coba lagi.
              </p>
            </div>
            <button onClick={retry}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition min-h-[48px]">
              Coba Lagi
            </button>
          </div>
        )}

        {/* Generic error */}
        {step === 'error' && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={24} strokeWidth={1.75} className="text-red-500" />
              </div>
              <p className="font-semibold text-base">Terjadi kesalahan</p>
              <p className="text-sm text-muted-foreground mt-2">Gagal menghubungi server. Periksa koneksi internet kamu.</p>
            </div>
            <button onClick={retry}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition min-h-[48px]">
              Coba Lagi
            </button>
          </div>
        )}

      </div>
    </main>
  )
}
