import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import MapWrapper from '@/components/landing/MapWrapper'
import type { ShopPin } from '@/components/landing/CoffeeMap'
import { Coffee, Shield, EyeOff, Zap, MessageCircle, Bell, UserX, Mail } from 'lucide-react'

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
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#1c1917' }}>

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e4e4e7',
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#c06c2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Coffee size={15} strokeWidth={2} color="white" />
            </div>
            <span style={{ fontFamily: 'var(--font-calistoga), serif', fontSize: 16, fontWeight: 700, color: '#c06c2e' }}>
              Social Coffé
            </span>
          </div>
          <a href="#partner" style={{ fontSize: 13, fontWeight: 500, color: '#71717a', textDecoration: 'none' }}>
            Untuk coffee shop
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: '#ffffff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '96px 20px 104px', textAlign: 'center' }}>


          <div style={{ fontFamily: 'var(--font-calistoga), serif', fontSize: 'clamp(2.4rem, 6vw, 3.8rem)', lineHeight: 1.15, color: '#1c1917', marginBottom: 6 }}>
            Kenalan di coffee shop.
          </div>
          <div style={{ fontFamily: 'var(--font-calistoga), serif', fontSize: 'clamp(2.4rem, 6vw, 3.8rem)', lineHeight: 1.15, color: '#c06c2e', marginBottom: 24 }}>
            Beneran, bukan di DM.
          </div>

          <p style={{ color: '#71717a', fontSize: 17, lineHeight: 1.65, maxWidth: 460, margin: '0 auto 44px' }}>
            Social Coffé nunjukin siapa aja yang lagi ada di coffee shop yang sama — biar kamu bisa say hi tanpa awkward.
          </p>

          {/* Steps — text only, no dark cards */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 44 }}>
            {[
              { n: '1', label: 'Scan QR di meja' },
              { n: '2', label: 'Lihat siapa ada di sini' },
              { n: '3', label: 'Say hi dan ngobrol' },
            ].map(({ n, label }, i) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: '#c06c2e', color: '#ffffff',
                    fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>{n}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#3f3f46' }}>{label}</span>
                </div>
                {i < 2 && <span style={{ color: '#d4d4d8', fontSize: 16 }}>→</span>}
              </div>
            ))}
          </div>

          <a
            href="#lokasi"
            style={{
              display: 'inline-flex', alignItems: 'center',
              background: '#c06c2e', color: '#ffffff',
              padding: '12px 28px', borderRadius: 12,
              fontWeight: 600, fontSize: 14, textDecoration: 'none',
            }}
          >
            Lihat coffee shop bergabung
          </a>
        </div>
      </section>

      {/* Why */}
      <section style={{ background: '#fafafa', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '88px 20px' }}>
          <div style={{ marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c06c2e', marginBottom: 12 }}>
              Kenapa Social Coffé
            </p>
            <div style={{ fontFamily: 'var(--font-calistoga), serif', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.2, color: '#1c1917' }}>
              Bukan dating app.{' '}
              <span style={{ color: '#a1a1aa' }}>Bukan social media.</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {[
              { n: 1, title: 'Cuma yang ada di sana.', desc: 'GPS diverifikasi. Nggak ada yang bisa join dari rumah atau pura-pura ada.' },
              { n: 2, title: 'Lihat orangnya dulu.', desc: 'Kamu sudah tahu mereka ada di sana sebelum say hi. Bukan swipe-swipe nggak jelas.' },
              { n: 3, title: 'Privasi dari awal.', desc: 'Anonim, sesi berbatas, nggak ada data yang dikumpulin lebih dari yang perlu.' },
            ].map(({ n, title, desc }) => (
              <div key={n} style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: 20, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#c06c2e', color: '#ffffff', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  {n}
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#1c1917', marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 14, color: '#71717a', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lokasi */}
      <section id="lokasi" style={{ background: '#ffffff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '88px 20px' }}>
          <div style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c06c2e', marginBottom: 10 }}>
              Jaringan kami
            </p>
            <div style={{ fontFamily: 'var(--font-calistoga), serif', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#1c1917' }}>
              {shops.length > 0 ? `${shops.length} coffee shop bergabung` : 'Coffee shop partner'}
            </div>
            {shops.length > 0 && (
              <p style={{ fontSize: 14, color: '#71717a', marginTop: 8 }}>Klik marker untuk detail lokasi</p>
            )}
          </div>
          <MapWrapper shops={shops} />
        </div>
      </section>

      {/* Fitur */}
      <section style={{ background: '#fafafa', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '88px 20px' }}>
          <div style={{ marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c06c2e', marginBottom: 12 }}>
              Fitur
            </p>
            <div style={{ fontFamily: 'var(--font-calistoga), serif', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.2, color: '#1c1917' }}>
              Semua yang kamu butuhkan,{' '}
              <span style={{ color: '#a1a1aa' }}>tidak lebih.</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: 20, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} strokeWidth={1.75} color="#c06c2e" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1c1917', marginBottom: 6 }}>{title}</div>
                  <div style={{ fontSize: 13, color: '#71717a', lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="partner" style={{ background: '#ffffff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '88px 20px' }}>
          <div style={{ background: 'linear-gradient(135deg, #c06c2e 0%, #a8541e 100%)', borderRadius: 28, padding: '64px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <Coffee size={22} strokeWidth={1.75} color="white" />
              </div>
              <div style={{ fontFamily: 'var(--font-calistoga), serif', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', color: '#ffffff', marginBottom: 16 }}>
                Punya coffee shop?
              </div>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, maxWidth: 400, margin: '0 auto 32px', lineHeight: 1.6 }}>
                Daftarkan tempatmu. Pelanggan dengan selera yang sama bisa saling terhubung — gratis, tanpa ribet.
              </p>
              <a
                href="mailto:inovasoftsolution@gmail.com?subject=Daftar%20Coffee%20Shop%20Social%20Coff%C3%A9"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: '#ffffff', color: '#c06c2e',
                  padding: '12px 24px', borderRadius: 12,
                  fontWeight: 600, fontSize: 14, textDecoration: 'none',
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
      <footer style={{ borderTop: '1px solid #e4e4e7', background: '#ffffff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 8, background: '#c06c2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Coffee size={12} strokeWidth={2} color="white" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#c06c2e' }}>Social Coffé</span>
          </div>
          <p style={{ fontSize: 12, color: '#a1a1aa' }}>
            Terhubung, offline, bermakna. &copy; {new Date().getFullYear()}
          </p>
          <Link href="/admin/login" style={{ fontSize: 12, color: '#a1a1aa', textDecoration: 'none' }}>
            Admin
          </Link>
        </div>
      </footer>
    </div>
  )
}
