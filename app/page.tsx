import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import SessionRedirect from '@/components/landing/SessionRedirect'
import MapWrapper from '@/components/landing/MapWrapper'
import type { ShopPin } from '@/components/landing/CoffeeMap'
import {
  Coffee, QrCode, Users, MessageCircle,
  MapPin, Shield, EyeOff, Zap, Bell, UserX, ChevronDown, Mail,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Shield,
    title: 'GPS Verified',
    desc: 'Hanya orang yang benar-benar ada di coffee shop tersebut yang bisa muncul di daftar.',
  },
  {
    icon: EyeOff,
    title: 'Mode Anonim',
    desc: 'Pilih tampil sebagai anonim atau profil lengkap. Kamu yang pegang kendali.',
  },
  {
    icon: Zap,
    title: 'Real-time',
    desc: 'Daftar update otomatis setiap kali ada yang masuk atau keluar dari coffee shop.',
  },
  {
    icon: MessageCircle,
    title: 'Chat Langsung',
    desc: 'Say hi dan ngobrol di dalam app tanpa perlu share nomor atau sosmed dulu.',
  },
  {
    icon: Bell,
    title: 'Notifikasi Push',
    desc: 'Dapat ping kalau ada yang say hi, meski layar terkunci.',
  },
  {
    icon: UserX,
    title: 'Sesi Berbatas',
    desc: 'Sesi otomatis berakhir. Tidak ada jejak digital yang mengendap setelah kamu pergi.',
  },
]

const WHY = [
  {
    title: 'Cuma orang yang ada di sana.',
    desc: 'GPS memverifikasi keberadaanmu. Tidak ada yang bisa join dari rumah.',
  },
  {
    title: 'Offline dulu, online kemudian.',
    desc: 'Kamu lihat orangnya langsung, baru cek profilnya. Bukan sebaliknya.',
  },
  {
    title: 'Privasi bukan fitur tambahan.',
    desc: 'Mode anonim, sesi berbatas, tidak ada akun permanen yang mengumpulkan datamu.',
  },
]

async function getShops(): Promise<ShopPin[]> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('coffee_shops')
      .select('id, name, address, latitude, longitude')
      .eq('is_active', true)
      .order('name')
    return (data ?? []) as ShopPin[]
  } catch {
    return []
  }
}

export default async function LandingPage() {
  const shops = await getShops()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SessionRedirect />

      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#fdf0e6,#f5e0cc)' }}
            >
              <Coffee size={14} strokeWidth={1.75} style={{ color: '#c06c2e' }} />
            </div>
            <span className="font-display text-base font-bold" style={{ color: '#c06c2e' }}>
              Social Coffé
            </span>
          </div>
          <a
            href="#partner"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition"
          >
            Untuk coffee shop
          </a>
        </div>
      </nav>

      {/* ─── 1. Hero ─── */}
      <section className="relative overflow-hidden">
        {/* Subtle ambient gradient */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(192,108,46,0.10) 0%, transparent 65%)',
          }}
        />

        <div className="max-w-5xl mx-auto px-5 pt-20 pb-24 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8"
            style={{
              background: 'var(--secondary)',
              color: 'var(--secondary-foreground)',
              border: '1px solid var(--border)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#22c55e' }}
            />
            {shops.length > 0 ? `${shops.length} coffee shop aktif` : 'Tersedia di coffee shop tertentu'}
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-tight mb-5">
            Kenalan di coffee&nbsp;shop.
            <br />
            <span style={{ color: 'var(--primary)' }}>Beneran, bukan di DM.</span>
          </h1>

          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed mb-10">
            Social Coffé menunjukkan siapa saja yang lagi ada di coffee shop yang sama — dan
            membuatmu bisa say hi tanpa canggung.
          </p>

          {/* 3-step visual */}
          <div className="flex items-center justify-center gap-0 mb-12 flex-wrap">
            {[
              { icon: QrCode, label: 'Scan QR di meja' },
              { icon: Users, label: 'Lihat siapa ada di sana' },
              { icon: MessageCircle, label: 'Say hi dan ngobrol' },
            ].map(({ icon: Icon, label }, i) => (
              <div key={label} className="flex items-center">
                <div className="flex flex-col items-center gap-2 px-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--secondary)' }}
                  >
                    <Icon size={18} strokeWidth={1.75} style={{ color: 'var(--primary)' }} />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium max-w-[80px] text-center leading-tight">
                    {label}
                  </span>
                </div>
                {i < 2 && (
                  <div
                    className="w-8 h-px mx-0 hidden sm:block"
                    style={{ background: 'var(--border)' }}
                  />
                )}
              </div>
            ))}
          </div>

          <a
            href="#lokasi"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition group"
          >
            Lihat coffee shop yang sudah bergabung
            <ChevronDown
              size={15}
              strokeWidth={2}
              className="group-hover:translate-y-0.5 transition-transform"
            />
          </a>
        </div>
      </section>

      {/* ─── 2. About ─── */}
      <section className="border-t border-border/60" style={{ background: 'var(--muted)' }}>
        <div className="max-w-5xl mx-auto px-5 py-20">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>
              Kenapa Social Coffé
            </p>
            <h2 className="font-display text-3xl md:text-4xl leading-snug">
              Bukan dating app.{' '}
              <span className="text-muted-foreground">Bukan social media.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {WHY.map(({ title, desc }, i) => (
              <div
                key={title}
                className="rounded-2xl p-6"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-4 text-sm font-bold"
                  style={{ background: 'var(--secondary)', color: 'var(--primary)' }}
                >
                  {i + 1}
                </div>
                <h3 className="font-semibold text-base mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. Lokasi ─── */}
      <section id="lokasi" className="border-t border-border/60">
        <div className="max-w-5xl mx-auto px-5 py-20">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--primary)' }}>
                Jaringan kami
              </p>
              <h2 className="font-display text-3xl md:text-4xl">
                {shops.length > 0
                  ? `${shops.length} coffee shop bergabung`
                  : 'Coffee shop partner'}
              </h2>
            </div>
            {shops.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Klik marker untuk detail lokasi
              </p>
            )}
          </div>

          <MapWrapper shops={shops} />

          {shops.length > 0 && (
            <div className="mt-6 grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {shops.map((shop) => (
                <div
                  key={shop.id}
                  className="flex items-start gap-3 rounded-xl p-4"
                  style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'var(--secondary)' }}
                  >
                    <MapPin size={14} strokeWidth={2} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{shop.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-0.5">
                      {shop.address}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── 4. Fitur ─── */}
      <section className="border-t border-border/60" style={{ background: 'var(--muted)' }}>
        <div className="max-w-5xl mx-auto px-5 py-20">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>
              Fitur
            </p>
            <h2 className="font-display text-3xl md:text-4xl">
              Semua yang kamu butuhkan,{' '}
              <span className="text-muted-foreground">tidak lebih.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl p-5 flex flex-col gap-4"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--secondary)' }}
                >
                  <Icon size={16} strokeWidth={1.75} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1.5">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. CTA ─── */}
      <section id="partner" className="border-t border-border/60">
        <div className="max-w-5xl mx-auto px-5 py-20">
          <div
            className="rounded-3xl px-8 py-14 text-center overflow-hidden relative"
            style={{
              background: 'linear-gradient(135deg, #c06c2e 0%, #a8541e 100%)',
            }}
          >
            {/* Subtle pattern overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 60% 80% at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 60%)',
              }}
            />
            <div className="relative">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-6"
                style={{ background: 'rgba(255,255,255,0.15)' }}>
                <Coffee size={22} strokeWidth={1.75} color="white" />
              </div>
              <h2 className="font-display text-3xl md:text-4xl text-white mb-4">
                Punya coffee shop?
              </h2>
              <p className="text-white/80 text-base max-w-md mx-auto leading-relaxed mb-8">
                Daftarkan tempatmu dan biarkan pelanggan yang punya selera sama saling terhubung —
                tanpa biaya apapun untuk memulai.
              </p>
              <a
                href="mailto:inovasoftsolution@gmail.com?subject=Daftar%20Coffee%20Shop%20Social%20Coff%C3%A9"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm transition hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'white', color: '#c06c2e' }}
              >
                <Mail size={15} strokeWidth={2} />
                Hubungi kami via email
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/60">
        <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Coffee size={14} strokeWidth={1.75} style={{ color: 'var(--primary)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
              Social Coffé
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Terhubung, offline, bermakna. &copy; {new Date().getFullYear()}
          </p>
          <Link href="/admin/login" className="text-xs text-muted-foreground hover:text-foreground transition">
            Admin
          </Link>
        </div>
      </footer>
    </div>
  )
}
