'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserRound } from 'lucide-react'
import type { Gender } from '@/types'

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'female', label: 'Cewek' },
  { value: 'male', label: 'Cowok' },
  { value: 'other', label: 'Lainnya' },
  { value: 'prefer_not_to_say', label: 'Skip' },
]

function ProfileSetupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/people'

  const [displayName, setDisplayName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender>('prefer_not_to_say')
  const [bio, setBio] = useState('')
  const [instagram, setInstagram] = useState('')
  const [tiktok, setTiktok] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [chatEnabled, setChatEnabled] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: authData } = await supabase.auth.getUser()

    if (!authData.user) {
      router.push('/login')
      return
    }

    const { error } = await supabase.from('profiles').upsert({
      user_id: authData.user.id,
      display_name: displayName.trim(),
      age: age ? parseInt(age) : null,
      gender,
      bio: bio.trim() || null,
      instagram: instagram.trim() || null,
      tiktok: tiktok.trim() || null,
      whatsapp: whatsapp.trim() || null,
      chat_enabled: chatEnabled,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(redirect)
  }

  return (
    <main className="auth-bg flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'linear-gradient(135deg, #fdf0e6, #f5e0cc)',
              boxShadow: '0 4px 14px 0 rgba(192, 108, 46, 0.18)',
            }}
          >
            <UserRound size={28} strokeWidth={1.75} style={{ color: '#c06c2e' }} />
          </div>
          <h1 className="font-display text-2xl mb-1">Setup Profil</h1>
          <p className="text-sm text-muted-foreground">Begini penampilan kamu di coffee shop.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Nama / Nickname <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={30}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nama atau nickname kamu"
              className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 transition text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Usia</label>
              <input
                type="number"
                min={17}
                max={99}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Usia"
                className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 transition text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 transition text-sm"
              >
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Cerita singkat tentang kamu..."
              maxLength={150}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 transition resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground text-right mt-1">{bio.length}/150</p>
          </div>

          <div className="border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Media Sosial (opsional)</p>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="Instagram (tanpa @)"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
            <input
              type="text"
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              placeholder="TikTok (tanpa @)"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="Nomor WhatsApp"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>

          <div className="flex items-center justify-between border border-border rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium">Aktifkan Chat</p>
              <p className="text-xs text-muted-foreground">Biarkan orang lain kirim pesan ke kamu</p>
            </div>
            <button
              type="button"
              onClick={() => setChatEnabled(!chatEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${chatEnabled ? 'bg-primary' : 'bg-border'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${chatEnabled ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !displayName.trim()}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 active:scale-[0.99] transition disabled:opacity-60 min-h-[48px]"
          >
            {loading ? 'Menyimpan...' : 'Simpan & Lanjut'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default function ProfileSetupPage() {
  return (
    <Suspense>
      <ProfileSetupForm />
    </Suspense>
  )
}
