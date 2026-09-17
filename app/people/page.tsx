'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Profile } from '@/types'

interface PersonHere extends Profile { session_id: string }

const GENDER_EMOJI: Record<string, string> = {
  male: '♂', female: '♀', other: '⚧', prefer_not_to_say: '',
}

const REPORT_REASONS = ['Spam', 'Konten tidak pantas', 'Pelecehan atau intimidasi', 'Profil palsu', 'Lainnya']

const AVATAR_GRADIENTS = [
  ['#c8763a', '#e8a265'], ['#7c6aad', '#a892d4'], ['#2d9e6b', '#5cc99a'],
  ['#c85c5c', '#e88585'], ['#4a7fc1', '#7aaee8'], ['#c88a3a', '#e8b865'], ['#5a8a6a', '#83b890'],
]

function getGradient(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}

function Avatar({ name, avatarUrl, isAnonymous, size = 48 }: { name: string; avatarUrl?: string | null; isAnonymous: boolean; size?: number }) {
  const gradient = getGradient(name)
  if (isAnonymous) return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4 }}>🕵️</div>
  )
  if (avatarUrl) return <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.38 }}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
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
  const [sayingHiTo, setSayingHiTo] = useState<Set<string>>(new Set())
  const [exitLoading, setExitLoading] = useState(false)

  // Edit state
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editMode, setEditMode] = useState<'anonymous' | 'full'>('anonymous')
  const [editAge, setEditAge] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editInstagram, setEditInstagram] = useState('')
  const [editWhatsapp, setEditWhatsapp] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Report & Block
  const [menuTarget, setMenuTarget] = useState<PersonHere | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDesc, setReportDesc] = useState('')
  const [blockConfirm, setBlockConfirm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [exitConfirm, setExitConfirm] = useState(false)

  const userIdRef = useRef<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
      if (myProf) setMyProfile(myProf as unknown as Profile)

      await fetchPeople(uid, supabase)

      const channel = supabase
        .channel(`people-${shopId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'coffee_shop_sessions', filter: `coffee_shop_id=eq.${shopId}` },
          () => { if (userIdRef.current) fetchPeople(userIdRef.current, supabase) })
        .subscribe()

      channelRef.current = channel
      pollRef.current = setInterval(() => {
        if (userIdRef.current) fetchPeople(userIdRef.current, supabase)
      }, 30_000)
    }

    boot()
    return () => {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [shopId])

  async function fetchPeople(uid: string, supabase: ReturnType<typeof createClient>) {
    const { data: myBlocks } = await supabase.from('blocks').select('blocked_user_id').eq('user_id', uid)
    const blockedIds = new Set((myBlocks ?? []).map((b: { blocked_user_id: string }) => b.blocked_user_id))

    const { data: sessions } = await supabase
      .from('coffee_shop_sessions').select('id, user_id')
      .eq('coffee_shop_id', shopId).eq('status', 'active')
      .gt('expires_at', new Date().toISOString()).neq('user_id', uid)

    const filtered = (sessions ?? []).filter((s) => !blockedIds.has(s.user_id))
    if (filtered.length === 0) { setPeople([]); setLoading(false); return }

    const userIds = filtered.map((s) => s.user_id)
    const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds)
    if (profiles) {
      const sessionMap = Object.fromEntries(filtered.map((s) => [s.user_id, s.id]))
      setPeople(profiles.map((p) => ({ ...(p as unknown as Profile), session_id: sessionMap[p.user_id] })))
    }
    setLoading(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function openEdit() {
    if (myProfile) {
      setEditName(myProfile.display_name)
      setEditMode(myProfile.is_anonymous ? 'anonymous' : 'full')
      setEditAge(myProfile.age ? String(myProfile.age) : '')
      setEditBio(myProfile.bio ?? '')
      setEditInstagram(myProfile.instagram ?? '')
      setEditWhatsapp(myProfile.whatsapp ?? '')
    }
    setEditOpen(true)
  }

  async function handleExit() {
    if (!currentUserId) { router.push('/'); return }
    setExitLoading(true)
    const supabase = createClient()
    await supabase.from('coffee_shop_sessions')
      .update({ status: 'left' })
      .eq('user_id', currentUserId)
      .eq('coffee_shop_id', shopId!)
      .eq('status', 'active')
    router.push('/')
  }

  async function handleSayHi(receiverId: string) {
    if (!currentUserId || sayingHiTo.has(receiverId)) return
    setSayingHiTo((prev) => new Set(prev).add(receiverId))
    const supabase = createClient()
    try {
      await supabase.from('interactions').insert({ sender_id: currentUserId, receiver_id: receiverId, type: 'say_hi' })
      const { data: existing } = await supabase
        .from('conversations').select('id')
        .or(`and(user_one_id.eq.${currentUserId},user_two_id.eq.${receiverId}),and(user_one_id.eq.${receiverId},user_two_id.eq.${currentUserId})`)
        .maybeSingle()
      if (existing?.id) { router.push(`/chat/${existing.id}`); return }
      const { data: convo, error } = await supabase
        .from('conversations').insert({ user_one_id: currentUserId, user_two_id: receiverId }).select('id').single()
      if (error || !convo) { showToast('Gagal memulai chat. Coba lagi.'); return }
      router.push(`/chat/${convo.id}`)
    } catch {
      showToast('Gagal memulai chat. Coba lagi.')
    } finally {
      setSayingHiTo((prev) => { const s = new Set(prev); s.delete(receiverId); return s })
    }
  }

  async function handleSaveIdentity(e: React.FormEvent) {
    e.preventDefault()
    const name = editName.trim()
    if (!name || !currentUserId) return
    setEditSaving(true)
    const supabase = createClient()
    const updates = {
      user_id: currentUserId,
      display_name: name,
      is_anonymous: editMode === 'anonymous',
      chat_enabled: true,
      ...(editMode === 'full' && {
        age: editAge ? parseInt(editAge) : null,
        bio: editBio.trim() || null,
        instagram: editInstagram.trim() || null,
        whatsapp: editWhatsapp.trim() || null,
      }),
    }
    await supabase.from('profiles').upsert(updates, { onConflict: 'user_id' })
    setMyProfile((prev) => prev ? { ...prev, ...updates } as Profile : prev)
    setEditOpen(false)
    setEditSaving(false)
    showToast('Profil berhasil diperbarui')
  }

  async function handleBlock() {
    if (!currentUserId || !menuTarget) return
    setActionLoading(true)
    const supabase = createClient()
    await supabase.from('blocks').insert({ user_id: currentUserId, blocked_user_id: menuTarget.user_id })
    setPeople((prev) => prev.filter((p) => p.user_id !== menuTarget.user_id))
    setBlockConfirm(false); setMenuTarget(null); setActionLoading(false)
    showToast('Pengguna telah diblokir')
  }

  async function handleReport(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUserId || !menuTarget || !reportReason) return
    setActionLoading(true)
    const supabase = createClient()
    await supabase.from('reports').insert({ reporter_id: currentUserId, reported_user_id: menuTarget.user_id, reason: reportReason, description: reportDesc.trim() || null })
    setReportOpen(false); setMenuTarget(null); setReportReason(''); setReportDesc(''); setActionLoading(false)
    showToast('Laporan berhasil dikirim')
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm animate-pulse">Memuat...</p>
    </main>
  )

  return (
    <main className="min-h-screen px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">People Here</h1>
          <p className="text-sm text-muted-foreground">☕ {shopName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openEdit} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm border border-border hover:bg-muted transition">
            <Avatar name={myProfile?.display_name ?? 'A'} avatarUrl={myProfile?.avatar_url} isAnonymous={myProfile?.is_anonymous ?? true} size={26} />
            <span className="font-medium truncate max-w-[70px]">{myProfile?.display_name ?? 'Kamu'}</span>
            <span className="text-xs text-muted-foreground">✏️</span>
          </button>
          <button onClick={() => setExitConfirm(true)} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition text-base" title="Keluar">
            🚪
          </button>
        </div>
      </div>

      {/* Count bar */}
      <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full bg-stone-200 flex items-center justify-center text-[10px]">🕵️</div><span>Anonim</span></div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(135deg, #c8763a, #e8a265)' }} /><span>Profil lengkap</span></div>
        <div className="ml-auto font-medium text-foreground">{people.length} orang</div>
      </div>

      {people.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">☕</div>
          <p className="font-semibold mb-1">Kamu yang pertama di sini</p>
          <p className="text-sm text-muted-foreground">Orang lain akan muncul otomatis setelah bergabung.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {people.map((person) => {
            const isAnon = person.is_anonymous
            const isLoading = sayingHiTo.has(person.user_id)
            return (
              <div key={person.id} className="rounded-2xl p-4 flex items-center gap-3 border transition"
                style={{ backgroundColor: isAnon ? '#f3f4f6' : '#ffffff', borderColor: isAnon ? '#d1d5db' : '#e5ddd5', borderStyle: isAnon ? 'dashed' : 'solid' }}>
                <Avatar name={person.display_name} avatarUrl={person.avatar_url} isAnonymous={isAnon} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold truncate" style={{ color: isAnon ? '#6b7280' : '#1a1a1a' }}>{person.display_name}</p>
                    {!isAnon && person.gender && <span className="text-muted-foreground text-sm">{GENDER_EMOJI[person.gender]}</span>}
                    {isAnon
                      ? <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded-md font-medium">anonim</span>
                      : <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md font-medium">profil lengkap</span>
                    }
                  </div>
                  {!isAnon
                    ? <p className="text-sm text-muted-foreground truncate mt-0.5">{[person.age ? `${person.age} yo` : '', person.bio].filter(Boolean).join(' · ')}</p>
                    : <p className="text-xs text-gray-400 mt-0.5">Identitas disembunyikan</p>
                  }
                  {!isAnon && (person.instagram || person.whatsapp) && (
                    <div className="flex items-center gap-2 mt-1">
                      {person.instagram && <span className="text-xs text-pink-500 bg-pink-50 px-1.5 py-0.5 rounded-md">📸 IG</span>}
                      {person.whatsapp && <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md">💬 WA</span>}
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  {person.chat_enabled && (
                    <button onClick={() => handleSayHi(person.user_id)} disabled={isLoading}
                      className="px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-60"
                      style={{ backgroundColor: isLoading ? '#d9a07e' : '#c8763a', color: '#fff' }}>
                      {isLoading ? '...' : 'Say Hi 👋'}
                    </button>
                  )}
                  <button onClick={() => setMenuTarget(person)} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition text-xs">•••</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground mt-8">Sesi berakhir dalam 30 menit. Scan QR lagi untuk perpanjang.</p>

      {/* Exit Confirm */}
      {exitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-6" onClick={() => setExitConfirm(false)}>
          <div className="bg-background rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-3xl mb-3 text-center">🚪</div>
            <h2 className="font-bold text-lg mb-1 text-center">Keluar dari sesi?</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">Kamu akan keluar dari <strong>{shopName}</strong>. Scan QR lagi untuk masuk kembali.</p>
            <div className="flex gap-3">
              <button onClick={() => setExitConfirm(false)} className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition">Batal</button>
              <button onClick={handleExit} disabled={exitLoading} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition disabled:opacity-50">
                {exitLoading ? 'Keluar...' : 'Keluar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Identity Modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-6" onClick={() => setEditOpen(false)}>
          <div className="bg-background rounded-2xl p-6 w-full max-w-sm shadow-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-1">Edit Profil</h2>
            <p className="text-sm text-muted-foreground mb-4">Ubah nama dan informasi kamu</p>
            <form onSubmit={handleSaveIdentity} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nama / Nickname</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nama atau nickname" maxLength={30} required autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Mode Tampil</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setEditMode('anonymous')}
                    className={`py-3 rounded-xl border text-sm font-semibold transition ${editMode === 'anonymous' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                    🕵️ Anonim
                  </button>
                  <button type="button" onClick={() => setEditMode('full')}
                    className={`py-3 rounded-xl border text-sm font-semibold transition ${editMode === 'full' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                    😊 Profil Lengkap
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {editMode === 'anonymous' ? '🕵️ Hanya nama yang terlihat oleh orang lain' : '😊 Nama, usia, bio, dan sosmed terlihat'}
                </p>
              </div>

              {editMode === 'full' && (
                <div className="space-y-3 border border-border rounded-xl p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data Profil Lengkap</p>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Usia</label>
                    <input type="number" value={editAge} onChange={(e) => setEditAge(e.target.value)} placeholder="Usia kamu" min={17} max={99}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Bio</label>
                    <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Cerita singkat tentang kamu..." maxLength={150} rows={2}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Instagram</label>
                    <input type="text" value={editInstagram} onChange={(e) => setEditInstagram(e.target.value)} placeholder="username (tanpa @)"
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">WhatsApp</label>
                    <input type="text" value={editWhatsapp} onChange={(e) => setEditWhatsapp(e.target.value)} placeholder="Nomor HP (contoh: 08123...)"
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditOpen(false)} className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition">Batal</button>
                <button type="submit" disabled={editSaving || !editName.trim()} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition disabled:opacity-40">
                  {editSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Sheet */}
      {menuTarget && !reportOpen && !blockConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-6" onClick={() => setMenuTarget(null)}>
          <div className="bg-background rounded-2xl w-full max-w-sm shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border">
              <p className="font-semibold">{menuTarget.display_name}</p>
              <p className="text-xs text-muted-foreground">{menuTarget.is_anonymous ? '🕵️ Mode anonim' : '😊 Profil lengkap'}</p>
            </div>
            <button onClick={() => setReportOpen(true)} className="w-full px-5 py-4 text-left text-sm font-medium hover:bg-muted transition flex items-center gap-3">
              <span className="text-lg">🚩</span><span>Laporkan pengguna ini</span>
            </button>
            <button onClick={() => setBlockConfirm(true)} className="w-full px-5 py-4 text-left text-sm font-medium text-red-500 hover:bg-red-50 transition flex items-center gap-3 border-t border-border">
              <span className="text-lg">🚫</span><span>Blokir pengguna ini</span>
            </button>
            <button onClick={() => setMenuTarget(null)} className="w-full px-5 py-4 text-left text-sm text-muted-foreground hover:bg-muted transition border-t border-border">Batal</button>
          </div>
        </div>
      )}

      {/* Report */}
      {reportOpen && menuTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-6" onClick={() => { setReportOpen(false); setMenuTarget(null) }}>
          <div className="bg-background rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-1">Laporkan Pengguna</h2>
            <p className="text-sm text-muted-foreground mb-4">Laporan kamu bersifat anonim dan akan ditinjau admin.</p>
            <form onSubmit={handleReport} className="space-y-4">
              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <button key={reason} type="button" onClick={() => setReportReason(reason)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm text-left transition ${reportReason === reason ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                    {reason}
                  </button>
                ))}
              </div>
              <textarea value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} placeholder="Keterangan tambahan (opsional)" rows={2} maxLength={300}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition resize-none" />
              <div className="flex gap-3">
                <button type="button" onClick={() => { setReportOpen(false); setMenuTarget(null) }} className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition">Batal</button>
                <button type="submit" disabled={!reportReason || actionLoading} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition disabled:opacity-40">
                  {actionLoading ? 'Mengirim...' : 'Kirim Laporan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block Confirm */}
      {blockConfirm && menuTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-6" onClick={() => { setBlockConfirm(false); setMenuTarget(null) }}>
          <div className="bg-background rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-1">Blokir {menuTarget.display_name}?</h2>
            <p className="text-sm text-muted-foreground mb-6">Mereka tidak akan muncul di daftar kamu dan tidak bisa mengirim pesan.</p>
            <div className="flex gap-3">
              <button onClick={() => { setBlockConfirm(false); setMenuTarget(null) }} className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition">Batal</button>
              <button onClick={handleBlock} disabled={actionLoading} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition disabled:opacity-40">
                {actionLoading ? 'Memblokir...' : 'Blokir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-sm font-medium px-5 py-3 rounded-2xl shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </main>
  )
}

export default function PeoplePage() {
  return <Suspense><PeopleHereList /></Suspense>
}
