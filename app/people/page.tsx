'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Profile } from '@/types'

interface PersonHere extends Profile {
  session_id: string
}

const GENDER_EMOJI: Record<string, string> = {
  male: '♂',
  female: '♀',
  other: '⚧',
  prefer_not_to_say: '',
}

function PeopleHereList() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const shopId = searchParams.get('shop')

  const [people, setPeople] = useState<PersonHere[]>([])
  const [shopName, setShopName] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [myProfile, setMyProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editMode, setEditMode] = useState<'anonymous' | 'full'>('anonymous')
  const [editSaving, setEditSaving] = useState(false)

  const userIdRef = useRef<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!shopId) { router.push('/'); return }

    const supabase = createClient()

    async function boot() {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { router.push('/'); return }

      const uid = auth.user.id
      userIdRef.current = uid
      setCurrentUserId(uid)

      const { data: shop } = await supabase.from('coffee_shops').select('name').eq('id', shopId).single()
      if (shop) setShopName(shop.name)

      const { data: myProf } = await supabase.from('profiles').select('*').eq('user_id', uid).single()
      if (myProf) {
        setMyProfile(myProf as unknown as Profile)
        setEditName(myProf.display_name)
        setEditMode(myProf.is_anonymous ? 'anonymous' : 'full')
      }

      await fetchPeople(uid, supabase)

      // Setup realtime channel
      const channel = supabase
        .channel(`people-${shopId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'coffee_shop_sessions', filter: `coffee_shop_id=eq.${shopId}` },
          () => {
            if (userIdRef.current) fetchPeople(userIdRef.current, supabase)
          }
        )
        .subscribe((status) => {
          // Fallback polling jika realtime gagal connect
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (userIdRef.current) fetchPeople(userIdRef.current, supabase)
          }
        })

      channelRef.current = channel
    }

    boot()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [shopId])

  async function fetchPeople(uid: string, supabase: ReturnType<typeof createClient>) {
    const { data: sessions } = await supabase
      .from('coffee_shop_sessions')
      .select('id, user_id')
      .eq('coffee_shop_id', shopId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .neq('user_id', uid)

    if (!sessions || sessions.length === 0) {
      setPeople([])
      setLoading(false)
      return
    }

    const userIds = sessions.map((s) => s.user_id)
    const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds)

    if (profiles) {
      const sessionMap = Object.fromEntries(sessions.map((s) => [s.user_id, s.id]))
      setPeople(profiles.map((p) => ({ ...(p as unknown as Profile), session_id: sessionMap[p.user_id] })))
    }

    setLoading(false)
  }

  async function handleSayHi(receiverId: string) {
    if (!currentUserId) return
    const supabase = createClient()

    await supabase.from('interactions').insert({ sender_id: currentUserId, receiver_id: receiverId, type: 'say_hi' })

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(user_one_id.eq.${currentUserId},user_two_id.eq.${receiverId}),and(user_one_id.eq.${receiverId},user_two_id.eq.${currentUserId})`)
      .single()

    if (existing) { router.push(`/chat/${existing.id}`); return }

    const { data: convo } = await supabase
      .from('conversations')
      .insert({ user_one_id: currentUserId, user_two_id: receiverId })
      .select('id')
      .single()

    if (convo) router.push(`/chat/${convo.id}`)
  }

  async function handleSaveIdentity(e: React.FormEvent) {
    e.preventDefault()
    const name = editName.trim()
    if (!name || !currentUserId) return
    setEditSaving(true)

    const supabase = createClient()
    await supabase.from('profiles').upsert({
      user_id: currentUserId,
      display_name: name,
      is_anonymous: editMode === 'anonymous',
      chat_enabled: true,
    })

    setMyProfile((prev) => prev ? { ...prev, display_name: name, is_anonymous: editMode === 'anonymous' } : prev)
    setEditOpen(false)
    setEditSaving(false)
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm animate-pulse">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">People Here</h1>
          <p className="text-sm text-muted-foreground">☕ {shopName}</p>
        </div>
        <button
          onClick={() => setEditOpen(true)}
          className="flex items-center gap-1.5 bg-muted rounded-xl px-3 py-2 text-sm hover:bg-border transition"
        >
          <span className="font-medium truncate max-w-[100px]">{myProfile?.display_name ?? 'Kamu'}</span>
          <span className="text-xs">{myProfile?.is_anonymous ? '🕵️' : '😊'}</span>
          <span className="text-muted-foreground text-xs">✏️</span>
        </button>
      </div>

      {people.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">☕</div>
          <p className="font-semibold mb-1">Kamu yang pertama di sini</p>
          <p className="text-sm text-muted-foreground">Orang lain akan muncul otomatis setelah bergabung.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {people.map((person) => (
            <div key={person.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl font-bold text-primary shrink-0">
                {person.avatar_url
                  ? <img src={person.avatar_url} alt={person.display_name} className="w-full h-full rounded-full object-cover" />
                  : person.display_name?.[0]?.toUpperCase() ?? '?'
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-semibold truncate">{person.display_name}</p>
                  {!person.is_anonymous && person.gender && (
                    <span className="text-muted-foreground text-sm">{GENDER_EMOJI[person.gender]}</span>
                  )}
                  {person.is_anonymous && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">anonim</span>
                  )}
                </div>
                {!person.is_anonymous && (
                  <p className="text-sm text-muted-foreground truncate">
                    {[person.age ? `${person.age} yo` : '', person.bio].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>

              {person.chat_enabled && (
                <button
                  onClick={() => handleSayHi(person.user_id)}
                  className="shrink-0 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
                >
                  Say Hi 👋
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground mt-8">
        Sesi kamu berakhir dalam 30 menit. Scan QR lagi untuk perpanjang.
      </p>

      {/* Edit Identity Modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-6" onClick={() => setEditOpen(false)}>
          <div className="bg-background rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-1">Ubah Tampilan</h2>
            <p className="text-sm text-muted-foreground mb-4">Nama dan mode tampil kamu</p>

            <form onSubmit={handleSaveIdentity} className="space-y-4">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nama atau nickname"
                maxLength={30}
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
              />

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setEditMode('anonymous')}
                  className={`py-3 rounded-xl border text-sm font-semibold transition ${editMode === 'anonymous' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                  🕵️ Anonim
                </button>
                <button type="button" onClick={() => setEditMode('full')}
                  className={`py-3 rounded-xl border text-sm font-semibold transition ${editMode === 'full' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                  😊 Tampil Lengkap
                </button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {editMode === 'anonymous' ? 'Hanya nama yang terlihat oleh orang lain' : 'Nama, usia, bio, dan sosmed kamu terlihat'}
              </p>

              <div className="flex gap-3">
                <button type="button" onClick={() => setEditOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition">
                  Batal
                </button>
                <button type="submit" disabled={editSaving || !editName.trim()}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition disabled:opacity-40">
                  {editSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

export default function PeoplePage() {
  return (
    <Suspense>
      <PeopleHereList />
    </Suspense>
  )
}
