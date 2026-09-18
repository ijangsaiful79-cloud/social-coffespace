import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import SessionRedirect from '@/components/landing/SessionRedirect'
import MapWrapper from '@/components/landing/MapWrapper'
import type { ShopPin } from '@/components/landing/CoffeeMap'
import {
  Coffee, QrCode, Users, MessageCircle,
  MapPin, Shield, EyeOff, Zap, Bell, UserX, Mail,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Shield,
    title: 'GPS Verified',
    desc: 'Kamu cuma bisa muncul kalau beneran ada di sana. No faking, no cheating.',
  },
  {
    icon: EyeOff,
    title: 'Mode Anonim',
    desc: 'Anonim atau profil lengkap — sepenuhnya pilihan kamu, bisa diganti kapan saja.',
  },
  {
    icon: Zap,
    title: 'Real-time',
    desc: 'List update langsung begitu seseorang datang atau pergi dari coffee shop.',
  },
  {
    icon: MessageCircle,
    title: 'Chat Langsung',
    desc: 'Say hi tanpa perlu share nomor atau sosmed dulu. Ngobrol dulu, lanjut nanti.',
  },
  {
    icon: Bell,
    title: 'Notifikasi Push',
    desc: 'Ada yang say hi? Kamu langsung tahu — meski layar sudah terkunci.',
  },
  {
    icon: UserX,
    title: 'Sesi Berbatas',
    desc: 'Sesi berakhir otomatis. Nggak ada jejak yang tersisa setelah kamu pergi.',
  },
]

const WHY = [
  {
    title: 'Cuma yang ada di sana.',
    desc: 'GPS diverifikasi. Nggak ada yang bisa join dari rumah atau pura-pura ada.',
  },
  {
    title: 'Lihat orangnya dulu.',
    desc: 'Kamu sudah tahu mereka ada di sana sebelum say hi. Bukan swipe-swipe nggak jelas.',
  },
  {
    title: 'Privasi dari awal.',
    desc: 'Anonim, sesi berbatas, nggak ada data yang dikumpulin lebih dari yang perlu.',
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
    <div className="min-h-screen bg-white text-foreground">
      <SessionRedirect />

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#c06c2e' }}>
              <Coffee size={15} strokeWidth={2} color="white" />
            </div>
            <span className="font-display text-base font-bold" style={{ color: '#c06c2e' }}>
              Social Coffé
            </span>
          </div>
          <a href="#partner" className="text-sm font-medium text-muted-foreground hover:text-foreground transition">
            Untuk coffee shop
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-white">
        <div className="max-w-5xl mx-auto px-5 pt-24 pb-28 text-center">
          {shops.length > 0 && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-8 bg-secondary text-secondary-foreground border border-orange-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
              {shops.length} coffee shop aktif
            </div>
          )}

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-tight mb-5">
            Kenalan di coffee&nbsp;shop.
            <br />
            <span style={{ color: '#c06c2e' }}>Beneran, bukan di DM.</span>
          </h1>

          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed mb-12">
            Social Coffé nunjukin siapa aja yang lagi ada di coffee shop yang sama —
            biar kamu bisa say hi tanpa awkward.
          </p>

          {/* 3 steps */}
          <div className="inline-flex items-stretch justify-center gap-3 sm:gap-4 mb-14 flex-wrap">
            {[
              { icon: QrCode, label: 'Scan QR di meja' },
              { icon: Users, label: 'Lihat siapa ada di sini' },
              { icon: MessageCircle, label: 'Say hi dan ngobrol' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2.5 px-4 py-3.5 rounded-2xl bg-secondary border border-orange-100 min-w-[100px] max-w-[120px]">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#c06c2e' }}>
                  <Icon size={18} strokeWidth={1.75} color="white" />
                </div>
                <span className="text-xs font-semibold text-foreground/70 text-center leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <a
            href="#lokasi"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition active:scale-[0.98]"
          >
            Lihat coffee shop bergabung
          </a>
        </div>
      </section>

      {/* Why */}
      <section style={{ background: '#f9f9f9' }}>
        <div className="max-w-5xl mx-auto px-5 py-24">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#c06c2e' }}>
              Kenapa Social Coffé
            </p>
            <h2 className="font-display text-3xl md:text-4xl leading-snug">
              Bukan dating app.{' '}
              <span className="text-muted-foreground">Bukan social media.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {WHY.map(({ title, desc }, i) => (
              <div
                key={title}
                className="rounded-2xl p-6 bg-white border border-border"
                style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.06)' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 font-bold text-sm text-white"
                  style={{ background: '#c06c2e' }}
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

      {/* Lokasi */}
      <section id="lokasi" className="bg-white">
        <div className="max-w-5xl mx-auto px-5 py-24">
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#c06c2e' }}>
              Jaringan kami
            </p>
            <h2 className="font-display text-3xl md:text-4xl">
              {shops.length > 0
                ? `${shops.length} coffee shop bergabung`
                : 'Coffee shop partner'}
            </h2>
            {shops.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">Klik marker untuk detail lokasi</p>
            )}
          </div>

          <MapWrapper shops={shops} />
        </div>
      </section>

      {/* Fitur */}
      <section style={{ background: '#f9f9f9' }}>
        <div className="max-w-5xl mx-auto px-5 py-24">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#c06c2e' }}>
              Fitur
            </p>
            <h2 className="font-display text-3xl md:text-4xl">
              Semua yang kamu butuhkan,{' '}
              <span className="text-muted-foreground">tidak lebih.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl p-5 bg-white border border-border flex flex-col gap-4"
                style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.06)' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#fff7ed' }}>
                  <Icon size={16} strokeWidth={1.75} style={{ color: '#c06c2e' }} />
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

      {/* CTA */}
      <section id="partner" className="bg-white">
        <div className="max-w-5xl mx-auto px-5 py-24">
          <div
            className="rounded-3xl px-8 py-16 text-center overflow-hidden relative"
            style={{ background: 'linear-gradient(135deg, #c06c2e 0%, #a8541e 100%)' }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 60% 80% at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 60%)' }}
            />
            <div className="relative">
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-6"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                <Coffee size={22} strokeWidth={1.75} color="white" />
              </div>
              <h2 className="font-display text-3xl md:text-4xl text-white mb-4">
                Punya coffee shop?
              </h2>
              <p className="text-white/80 text-base max-w-md mx-auto leading-relaxed mb-8">
                Daftarkan tempatmu. Pelanggan dengan selera yang sama bisa saling terhubung — gratis, tanpa ribet.
              </p>
              <a
                href="mailto:inovasoftsolution@gmail.com?subject=Daftar%20Coffee%20Shop%20Social%20Coff%C3%A9"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm transition hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'white', color: '#c06c2e' }}
              >
                <Mail size={15} strokeWidth={2} />
                Hubungi kami
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white">
        <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#c06c2e' }}>
              <Coffee size={12} strokeWidth={2} color="white" />
            </div>
            <span className="text-sm font-bold" style={{ color: '#c06c2e' }}>Social Coffé</span>
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
