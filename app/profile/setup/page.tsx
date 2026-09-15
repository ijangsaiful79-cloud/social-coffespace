'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Gender } from '@/types'

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
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
      age: parseInt(age),
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
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">👤</div>
          <h1 className="text-2xl font-bold">Set up your profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            This is how people at the coffee shop will see you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">
              Display Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={30}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name or nickname"
              className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Age <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                required
                min={17}
                max={99}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Age"
                className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Gender <span className="text-red-400">*</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
              >
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A little about yourself..."
              maxLength={150}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 transition resize-none"
            />
            <p className="text-xs text-muted-foreground text-right mt-1">{bio.length}/150</p>
          </div>

          {/* Social media — optional */}
          <div className="border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">Social Media (optional)</p>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="Instagram username"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
            <input
              type="text"
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              placeholder="TikTok username"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="WhatsApp number"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>

          {/* Chat toggle */}
          <div className="flex items-center justify-between border border-border rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium">Enable Chat</p>
              <p className="text-xs text-muted-foreground">Let others send you messages</p>
            </div>
            <button
              type="button"
              onClick={() => setChatEnabled(!chatEnabled)}
              className={`w-11 h-6 rounded-full transition-colors ${
                chatEnabled ? 'bg-primary' : 'bg-border'
              } relative`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  chatEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Save & Continue'}
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
