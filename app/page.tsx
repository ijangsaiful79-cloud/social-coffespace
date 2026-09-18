import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import MapWrapper from '@/components/landing/MapWrapper'

export const revalidate = 60
import type { ShopPin } from '@/components/landing/CoffeeMap'
import { Coffee, Shield, EyeOff, Zap, MessageCircle, Bell, UserX, Mail } from 'lucide-react'

// ─── Pamphlet-derived palette ───────────────────────────────────────────────
const C = {
  parchment:   '#F7EEE1',
  parchmentDk: '#EDE0CE',
  rose:        '#C57A6E',
  roseLight:   '#F5EAE8',
  forest:      '#2D4A3E',
  espresso:    '#2C1A08',
  tan:         '#DDD0BC',
  muted:       '#8A7060',
  white:       '#FFFFFF',
}

const FEATURES = [
  { icon: Shield,        title: 'GPS Verified',      desc: 'Kamu cuma bisa muncul kalau beneran ada di sana. No faking.' },
  { icon: EyeOff,        title: 'Mode Anonim',        desc: 'Anonim atau profil lengkap — pilihan kamu, ganti kapan saja.' },
  { icon: Zap,           title: 'Real-time',           desc: 'List update langsung waktu seseorang datang atau pergi.' },
  { icon: MessageCircle, title: 'Chat Langsung',       desc: 'Say hi tanpa share nomor dulu. Ngobrol dulu, lanjut nanti.' },
  { icon: Bell,          title: 'Notifikasi Push',     desc: 'Ada yang say hi? Langsung tahu — meski layar sudah terkunci.' },
  { icon: UserX,         title: 'Sesi Berbatas',       desc: 'Sesi berakhir otomatis. Nggak ada jejak setelah kamu pergi.' },
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
    <div style={{ minHeight: '100vh', background: C.parchment, color: C.espresso }}>

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: `rgba(247, 238, 225, 0.92)`,
        backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${C.tan}`,
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: C.rose, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 6px rgba(197,122,110,0.35)` }}>
              <Coffee size={15} strokeWidth={2} color={C.white} />
            </div>
            <span style={{ fontFamily: 'var(--font-calistoga), serif', fontSize: 16, fontWeight: 700, color: C.rose }}>
              Social Coffé
            </span>
          </div>
          <a href="#partner" style={{ fontSize: 13, fontWeight: 500, color: C.muted, textDecoration: 'none' }}>
            Untuk coffee shop
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: C.parchment }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '96px 20px 104px', textAlign: 'center' }}>

          {/* Tagline chip */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: C.roseLight, border: `1px solid ${C.tan}`,
            borderRadius: 99, padding: '5px 14px', marginBottom: 28,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.rose }}>
              More People. More Stories.
            </span>
          </div>

          <div style={{ fontFamily: 'var(--font-calistoga), serif', fontSize: 'clamp(2.4rem, 6vw, 3.8rem)', lineHeight: 1.15, color: C.espresso, marginBottom: 6 }}>
            Kenalan di coffee shop.
          </div>
          <div style={{ fontFamily: 'var(--font-calistoga), serif', fontSize: 'clamp(2.4rem, 6vw, 3.8rem)', lineHeight: 1.15, color: C.rose, marginBottom: 28 }}>
            Beneran, bukan di DM.
          </div>

          <p style={{ color: C.muted, fontSize: 17, lineHeight: 1.7, maxWidth: 460, margin: '0 auto 48px' }}>
            Social Coffé nunjukin siapa aja yang lagi ada di coffee shop yang sama — biar kamu bisa say hi tanpa awkward.
          </p>

          {/* Steps */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 48 }}>
            {[
              { n: '1', label: 'Scan QR di meja' },
              { n: '2', label: 'Lihat siapa ada di sini' },
              { n: '3', label: 'Say hi dan ngobrol' },
            ].map(({ n, label }, i) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: C.rose, color: C.white,
                    fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    boxShadow: `0 2px 5px rgba(197,122,110,0.30)`,
                  }}>{n}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: C.espresso }}>{label}</span>
                </div>
                {i < 2 && <span style={{ color: C.tan, fontSize: 16 }}>→</span>}
              </div>
            ))}
          </div>

          <a
            href="#lokasi"
            style={{
              display: 'inline-flex', alignItems: 'center',
              background: C.rose, color: C.white,
              padding: '13px 30px', borderRadius: 12,
              fontWeight: 600, fontSize: 14, textDecoration: 'none',
              boxShadow: `0 4px 14px rgba(197,122,110,0.40)`,
              letterSpacing: '0.01em',
            }}
          >
            Lihat coffee shop bergabung
          </a>
        </div>
      </section>

      {/* Why */}
      <section style={{ background: C.parchmentDk, borderTop: `1px solid ${C.tan}`, borderBottom: `1px solid ${C.tan}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '88px 20px' }}>
          <div style={{ marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.rose, marginBottom: 12 }}>
              Kenapa Social Coffé
            </p>
            <div style={{ fontFamily: 'var(--font-calistoga), serif', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.2, color: C.espresso }}>
              Bukan dating app.{' '}
              <span style={{ color: C.muted }}>Bukan social media.</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {[
              { n: 1, title: 'Cuma yang ada di sana.', desc: 'GPS diverifikasi. Nggak ada yang bisa join dari rumah atau pura-pura ada.' },
              { n: 2, title: 'Lihat orangnya dulu.', desc: 'Kamu sudah tahu mereka ada di sana sebelum say hi. Bukan swipe-swipe nggak jelas.' },
              { n: 3, title: 'Privasi dari awal.', desc: 'Anonim, sesi berbatas, nggak ada data yang dikumpulin lebih dari yang perlu.' },
            ].map(({ n, title, desc }) => (
              <div key={n} style={{
                background: C.white, border: `1px solid ${C.tan}`,
                borderRadius: 20, padding: 24,
                boxShadow: `0 2px 8px rgba(44,26,8,0.06)`,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: C.rose, color: C.white,
                  fontWeight: 700, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                  boxShadow: `0 2px 6px rgba(197,122,110,0.30)`,
                }}>
                  {n}
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, color: C.espresso, marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lokasi */}
      <section id="lokasi" style={{ background: C.parchment }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '88px 20px' }}>
          <div style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.rose, marginBottom: 10 }}>
              Jaringan kami
            </p>
            <div style={{ fontFamily: 'var(--font-calistoga), serif', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: C.espresso }}>
              {shops.length > 0 ? `${shops.length} coffee shop bergabung` : 'Coffee shop partner'}
            </div>
            {shops.length > 0 && (
              <p style={{ fontSize: 14, color: C.muted, marginTop: 8 }}>Klik marker untuk detail lokasi</p>
            )}
          </div>
          <MapWrapper shops={shops} />
        </div>
      </section>

      {/* Fitur */}
      <section style={{ background: C.parchmentDk, borderTop: `1px solid ${C.tan}`, borderBottom: `1px solid ${C.tan}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '88px 20px' }}>
          <div style={{ marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.rose, marginBottom: 12 }}>
              Fitur
            </p>
            <div style={{ fontFamily: 'var(--font-calistoga), serif', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.2, color: C.espresso }}>
              Semua yang kamu butuhkan,{' '}
              <span style={{ color: C.muted }}>tidak lebih.</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{
                background: C.white, border: `1px solid ${C.tan}`,
                borderRadius: 20, padding: '20px 22px',
                display: 'flex', flexDirection: 'column', gap: 14,
                boxShadow: `0 2px 8px rgba(44,26,8,0.05)`,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: C.roseLight, border: `1px solid ${C.tan}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={16} strokeWidth={1.75} color={C.rose} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.espresso, marginBottom: 6 }}>{title}</div>
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.65 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="partner" style={{ background: C.parchment }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '88px 20px' }}>
          <div style={{
            background: `linear-gradient(135deg, ${C.forest} 0%, #1E3530 100%)`,
            borderRadius: 28, padding: '64px 40px', textAlign: 'center',
            position: 'relative', overflow: 'hidden',
            boxShadow: `0 8px 32px rgba(45,74,62,0.30)`,
          }}>
            {/* Subtle warm radial glow */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 80% at 20% 30%, rgba(197,122,110,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 60% at 80% 70%, rgba(255,255,255,0.04) 0%, transparent 50%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 16,
                background: 'rgba(197,122,110,0.25)', border: '1px solid rgba(197,122,110,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
              }}>
                <Coffee size={22} strokeWidth={1.75} color={C.roseLight} />
              </div>
              <div style={{ fontFamily: 'var(--font-calistoga), serif', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', color: C.parchment, marginBottom: 16 }}>
                Punya coffee shop?
              </div>
              <p style={{ color: 'rgba(247,238,225,0.70)', fontSize: 15, maxWidth: 400, margin: '0 auto 32px', lineHeight: 1.65 }}>
                Daftarkan tempatmu. Pelanggan dengan selera yang sama bisa saling terhubung — gratis, tanpa ribet.
              </p>
              <a
                href="mailto:inovasoftsolution@gmail.com?subject=Daftar%20Coffee%20Shop%20Social%20Coff%C3%A9"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: C.rose, color: C.white,
                  padding: '12px 26px', borderRadius: 12,
                  fontWeight: 600, fontSize: 14, textDecoration: 'none',
                  boxShadow: `0 4px 14px rgba(197,122,110,0.35)`,
                }}
              >
                <Mail size={15} strokeWidth={2} />
                Hubungi kami
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.tan}`, background: C.parchmentDk }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 8, background: C.rose, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Coffee size={12} strokeWidth={2} color={C.white} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.rose }}>Social Coffé</span>
          </div>
          <p style={{ fontSize: 12, color: C.muted }}>
            Terhubung, offline, bermakna. &copy; {new Date().getFullYear()}
          </p>
          <Link href="/admin/login" style={{ fontSize: 12, color: C.muted, textDecoration: 'none' }}>
            Admin
          </Link>
        </div>
      </footer>
    </div>
  )
}
