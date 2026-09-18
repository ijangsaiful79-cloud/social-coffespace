'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Profile, Message } from '@/types'
import { useLocationGuard } from '@/lib/hooks/useLocationGuard'
import LocationExitAlert from '@/components/LocationExitAlert'
import PushPromptBanner from '@/components/PushPromptBanner'
import { isWithinRadius } from '@/lib/utils/distance'
import {
  Users, MessageSquare, LogOut, Pencil, MoreHorizontal, Trash2,
  Flag, Ban, X, Coffee, EyeOff, Phone, UserRound, Clock, Camera, Palette,
} from 'lucide-react'
import ThemeSwitcher from '@/components/ThemeSwitcher'

interface PersonHere extends Profile { session_id: string }

interface ConversationItem {
  id: string
  otherUser: Profile
  lastMessage: Message | null
  unreadCount: number
}

const GENDER_LABEL: Record<string, string> = {
  male: 'M', female: 'F', other: '', prefer_not_to_say: '',
}

const REPORT_REASONS = ['Spam', 'Konten tidak pantas', 'Pelecehan atau intimidasi', 'Profil palsu', 'Lainnya']

const AVATAR_GRADIENTS = [
  ['#c06c2e', '#e09260'],  // coffee amber
  ['#b55c6e', '#d98496'],  // dusty rose
  ['#7c6aad', '#a892d4'],  // soft violet
  ['#4a7fc1', '#7aaee8'],  // periwinkle
  ['#2d9e6b', '#5cc99a'],  // sage green
  ['#956b5a', '#c49080'],  // warm mauve
  ['#7a5c8a', '#a885bd'],  // soft plum
  ['#c88a3a', '#e8b865'],  // golden amber
]

function getGradient(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}

function Avatar({ name, avatarUrl, isAnonymous, size = 48 }: { name: string; avatarUrl?: string | null; isAnonymous: boolean; size?: number }) {
  const gradient = getGradient(name)
  const iconSize = Math.round(size * 0.44)
  if (isAnonymous) return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', backgroundColor: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <EyeOff size={iconSize} color="#a1a1aa" strokeWidth={1.75} />
    </div>
  )
  if (avatarUrl) return <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.38 }}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

async function registerPush(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const existing = await reg.pushManager.getSubscription()
    if (existing) {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription: existing }),
      })
      return
    }

    // iOS requires user gesture to request permission — let PushPromptBanner handle it
    if (isIos) return

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    })
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subscription: sub }),
    })
  } catch {
    // Push not supported or denied
  }
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'baru saja'
  if (diffMins < 60) return `${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}j`
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function PeopleHereList() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const shopId = searchParams.get('shop')

  const [activeTab, setActiveTab] = useState<'people' | 'inbox'>('people')
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'other'>('all')
  const [people, setPeople] = useState<PersonHere[]>([])
  const [inbox, setInbox] = useState<ConversationItem[]>([])
  const [inboxLoading, setInboxLoading] = useState(false)
  const [shopName, setShopName] = useState('')
  const [shopCoords, setShopCoords] = useState<{ lat: number; lng: number; radius: number } | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [myProfile, setMyProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sayingHiTo, setSayingHiTo] = useState<Set<string>>(new Set())
  const [exitLoading, setExitLoading] = useState(false)
  const [locationExitLoading, setLocationExitLoading] = useState(false)
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [extendLoading, setExtendLoading] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Edit state
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editMode, setEditMode] = useState<'anonymous' | 'full'>('anonymous')
  const [editAge, setEditAge] = useState('')
  const [editGender, setEditGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say'>('prefer_not_to_say')
  const [editBio, setEditBio] = useState('')
  const [editInstagram, setEditInstagram] = useState('')
  const [editTiktok, setEditTiktok] = useState('')
  const [editWhatsapp, setEditWhatsapp] = useState('')
  const [editChatEnabled, setEditChatEnabled] = useState(true)
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
  const [deleteConvoId, setDeleteConvoId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [themeSwitcherOpen, setThemeSwitcherOpen] = useState(false)

  const { isOutside } = useLocationGuard({
    lat: shopCoords?.lat ?? null,
    lng: shopCoords?.lng ?? null,
    radiusMeter: shopCoords?.radius ?? null,
    enabled: !loading && !!shopCoords,
  })

  const userIdRef = useRef<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const msgChannelRef = useRef<RealtimeChannel | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!shopId) { router.push('/'); return }
    const supabase = createClient()

    async function boot() {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { router.push('/'); return }
      const uid = auth.user.id
      userIdRef.current = uid
      setCurrentUserId(uid)

      const { data: shop } = await supabase.from('coffee_shops').select('name, latitude, longitude, radius_meter').eq('id', shopId).single()
      if (shop) {
        setShopName(shop.name)
        const coords = { lat: shop.latitude, lng: shop.longitude, radius: shop.radius_meter }
        setShopCoords(coords)
        sessionStorage.setItem('shopContext', JSON.stringify({ id: shopId, name: shop.name, ...coords }))
      }

      const { data: myProf } = await supabase.from('profiles').select('*').eq('user_id', uid).single()
      if (myProf) setMyProfile(myProf as unknown as Profile)

      const { data: mySession } = await supabase
        .from('coffee_shop_sessions')
        .select('id, expires_at')
        .eq('user_id', uid)
        .eq('coffee_shop_id', shopId)
        .eq('status', 'active')
        .single()
      if (mySession) {
        setSessionId(mySession.id)
        setSessionExpiresAt(new Date(mySession.expires_at))
      }

      await fetchPeople(uid, supabase)
      await fetchInbox(uid, supabase)

      // Register push notifications
      registerPush(uid)

      const channel = supabase
        .channel(`people-${shopId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'coffee_shop_sessions', filter: `coffee_shop_id=eq.${shopId}` },
          () => { if (userIdRef.current) fetchPeople(userIdRef.current, supabase) })
        .subscribe()
      channelRef.current = channel

      // Listen for new messages to update inbox badge
      const msgChannel = supabase
        .channel(`inbox-messages-${uid}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
          () => { if (userIdRef.current) fetchInbox(userIdRef.current, supabase) })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' },
          () => { if (userIdRef.current) fetchInbox(userIdRef.current, supabase) })
        .subscribe()
      msgChannelRef.current = msgChannel

      pollRef.current = setInterval(() => {
        if (userIdRef.current) {
          fetchPeople(userIdRef.current, supabase)
          fetchInbox(userIdRef.current, supabase)
        }
      }, 30_000)
    }

    boot()
    return () => {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
      if (msgChannelRef.current) { supabase.removeChannel(msgChannelRef.current); msgChannelRef.current = null }
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [shopId])

  useEffect(() => {
    if (!sessionExpiresAt) return
    function tick() {
      const diff = sessionExpiresAt!.getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('0:00'); return }
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [sessionExpiresAt])

  async function handleExtendSession() {
    if (!shopCoords || !sessionId) return
    setExtendLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const ok = isWithinRadius(pos.coords.latitude, pos.coords.longitude, shopCoords.lat, shopCoords.lng, shopCoords.radius)
        if (!ok) { showToast('Kamu sudah keluar dari area coffee shop'); setExtendLoading(false); return }
        const supabase = createClient()
        const newExpires = new Date(Date.now() + 30 * 60 * 1000)
        await supabase.from('coffee_shop_sessions')
          .update({ expires_at: newExpires.toISOString(), last_active_at: new Date().toISOString() })
          .eq('id', sessionId)
        setSessionExpiresAt(newExpires)
        setExtendLoading(false)
        showToast('Sesi diperpanjang 30 menit!')
      },
      () => { showToast('Gagal akses lokasi. Coba lagi.'); setExtendLoading(false) },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !currentUserId) return
    if (file.size > 2 * 1024 * 1024) { showToast('Foto terlalu besar. Maksimal 2MB.'); return }
    setAvatarUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${currentUserId}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) { showToast('Gagal upload foto. Pastikan bucket avatars sudah dibuat.'); setAvatarUploading(false); return }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', currentUserId)
    setMyProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : prev)
    setAvatarUploading(false)
    showToast('Foto profil diperbarui!')
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

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

  async function fetchInbox(uid: string, supabase: ReturnType<typeof createClient>) {
    setInboxLoading(true)
    const { data: convos } = await supabase
      .from('conversations')
      .select('id, user_one_id, user_two_id, created_at')
      .or(`user_one_id.eq.${uid},user_two_id.eq.${uid}`)

    if (!convos || convos.length === 0) { setInbox([]); setUnreadTotal(0); setInboxLoading(false); return }

    const otherUserIds = convos.map((c) => c.user_one_id === uid ? c.user_two_id : c.user_one_id)
    const convoIds = convos.map((c) => c.id)

    const [profilesRes, messagesRes] = await Promise.all([
      supabase.from('profiles').select('*').in('user_id', otherUserIds),
      supabase.from('messages').select('*').in('conversation_id', convoIds).order('created_at', { ascending: false }),
    ])

    const profileMap = Object.fromEntries((profilesRes.data ?? []).map((p) => [p.user_id, p as unknown as Profile]))
    const allMessages = (messagesRes.data ?? []) as Message[]

    const items: ConversationItem[] = convos.map((convo) => {
      const otherUid = convo.user_one_id === uid ? convo.user_two_id : convo.user_one_id
      const convoMessages = allMessages.filter((m) => m.conversation_id === convo.id)
      const lastMessage = convoMessages[0] ?? null
      const unreadCount = convoMessages.filter((m) => m.sender_id !== uid && !m.read_at).length
      return {
        id: convo.id,
        otherUser: profileMap[otherUid],
        lastMessage,
        unreadCount,
      }
    }).filter((item) => item.otherUser) // filter out conversations where profile was deleted
      .sort((a, b) => {
        const aTime = a.lastMessage?.created_at ?? ''
        const bTime = b.lastMessage?.created_at ?? ''
        return bTime.localeCompare(aTime)
      })

    setInbox(items)
    setUnreadTotal(items.reduce((sum, i) => sum + i.unreadCount, 0))
    setInboxLoading(false)
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
      setEditGender(myProfile.gender ?? 'prefer_not_to_say')
      setEditBio(myProfile.bio ?? '')
      setEditInstagram(myProfile.instagram ?? '')
      setEditTiktok(myProfile.tiktok ?? '')
      setEditWhatsapp(myProfile.whatsapp ?? '')
      setEditChatEnabled(myProfile.chat_enabled ?? true)
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

  async function handleLocationExit() {
    setLocationExitLoading(true)
    const supabase = createClient()
    if (currentUserId && shopId) {
      await supabase.from('coffee_shop_sessions')
        .update({ status: 'left' })
        .eq('user_id', currentUserId)
        .eq('coffee_shop_id', shopId)
        .eq('status', 'active')
    }
    sessionStorage.removeItem('shopContext')
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
      chat_enabled: editChatEnabled,
      ...(editMode === 'full' && {
        age: editAge ? parseInt(editAge) : null,
        gender: editGender,
        bio: editBio.trim() || null,
        instagram: editInstagram.trim() || null,
        tiktok: editTiktok.trim() || null,
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

  async function handleDeleteConversation() {
    if (!deleteConvoId) return
    setDeleteLoading(true)
    const supabase = createClient()
    await supabase.from('messages').delete().eq('conversation_id', deleteConvoId)
    await supabase.from('conversations').delete().eq('id', deleteConvoId)
    setInbox((prev) => prev.filter((i) => i.id !== deleteConvoId))
    const remaining = inbox.filter((i) => i.id !== deleteConvoId)
    setUnreadTotal(remaining.reduce((sum, i) => sum + i.unreadCount, 0))
    setDeleteConvoId(null)
    setDeleteLoading(false)
    showToast('Percakapan dihapus')
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm animate-pulse">Memuat...</p>
    </main>
  )

  return (
    <main className="min-h-screen max-w-lg mx-auto flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-wide" style={{ color: '#c06c2e' }}>Social Coffé</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Coffee size={13} strokeWidth={2} className="text-muted-foreground" />
              {shopName}
            </p>
            {timeLeft && (
              <div className="flex items-center gap-2 mt-1">
                <span className={`flex items-center gap-1 text-xs font-medium tabular-nums ${
                  sessionExpiresAt && sessionExpiresAt.getTime() - Date.now() < 5 * 60 * 1000
                    ? 'text-red-500' : 'text-muted-foreground'
                }`}>
                  <Clock size={11} strokeWidth={2} />
                  {timeLeft}
                </span>
                <button
                  onClick={handleExtendSession}
                  disabled={extendLoading}
                  className="text-xs font-semibold text-primary hover:underline disabled:opacity-50 transition"
                >
                  {extendLoading ? 'Mengecek...' : 'Perpanjang'}
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openEdit} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm border border-border hover:bg-muted transition min-h-[44px]">
              <Avatar name={myProfile?.display_name ?? 'A'} avatarUrl={myProfile?.avatar_url} isAnonymous={myProfile?.is_anonymous ?? true} size={26} />
              <span className="font-medium truncate max-w-[70px]">{myProfile?.display_name ?? 'Kamu'}</span>
              <Pencil size={13} strokeWidth={2} className="text-muted-foreground" />
            </button>
            <button onClick={() => setThemeSwitcherOpen(true)} className="w-11 h-11 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition" title="Tampilan">
              <Palette size={16} strokeWidth={2} />
            </button>
            <button onClick={() => setExitConfirm(true)} className="w-11 h-11 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition" title="Keluar">
              <LogOut size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('people')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition min-h-[44px] ${activeTab === 'people' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            style={activeTab === 'people' ? { boxShadow: '0 1px 4px 0 rgba(0,0,0,0.08)' } : {}}
          >
            <Users size={16} strokeWidth={2} />
            <span>Di Sini</span>
            {people.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'people' ? 'bg-secondary text-primary' : 'bg-muted text-muted-foreground'}`}>
                {people.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition min-h-[44px] ${activeTab === 'inbox' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            style={activeTab === 'inbox' ? { boxShadow: '0 1px 4px 0 rgba(0,0,0,0.08)' } : {}}
          >
            <MessageSquare size={16} strokeWidth={2} />
            <span>Inbox</span>
            {unreadTotal > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold bg-primary text-primary-foreground">
                {unreadTotal > 9 ? '9+' : unreadTotal}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Push notification banner */}
      {currentUserId && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && (
        <PushPromptBanner userId={currentUserId} vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
      )}

      {/* Tab Content */}
      <div className="flex-1 px-4 pb-6">
        {activeTab === 'people' && (() => {
          const filteredPeople = genderFilter === 'all'
            ? people
            : people.filter((p) => {
                if (p.is_anonymous) return false
                if (genderFilter === 'other') return p.gender === 'other' || p.gender === 'prefer_not_to_say'
                return p.gender === genderFilter
              })
          return (
          <>
            {/* Filter chips */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
              {([
                { key: 'all', label: 'Semua' },
                { key: 'female', label: 'Cewek' },
                { key: 'male', label: 'Cowok' },
                { key: 'other', label: 'Lainnya' },
              ] as const).map(({ key, label }) => (
                <button key={key} onClick={() => setGenderFilter(key)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${genderFilter === key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>
                  {label}
                </button>
              ))}
              <span className="ml-auto shrink-0 text-xs text-muted-foreground font-medium">{filteredPeople.length} orang</span>
            </div>

            {filteredPeople.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  {genderFilter === 'all' ? <Coffee size={28} strokeWidth={1.5} className="text-muted-foreground" /> : <Users size={28} strokeWidth={1.5} className="text-muted-foreground" />}
                </div>
                {genderFilter === 'all' ? (
                  <>
                    <p className="font-semibold mb-1">Kamu yang pertama di sini</p>
                    <p className="text-sm text-muted-foreground">Orang lain akan muncul otomatis setelah bergabung.</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold mb-1">Tidak ada hasil</p>
                    <p className="text-sm text-muted-foreground">Tidak ada orang dengan filter ini sekarang.</p>
                    <button onClick={() => setGenderFilter('all')} className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-muted transition min-h-[44px]">Tampilkan semua</button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPeople.map((person) => {
                  const isAnon = person.is_anonymous
                  const isLoading = sayingHiTo.has(person.user_id)
                  return (
                    <div key={person.id} className="rounded-2xl p-4 flex items-center gap-3 border transition-all duration-200"
                      style={{
                        backgroundColor: '#ffffff',
                        borderColor: isAnon ? '#e4e4e7' : '#e4e4e7',
                        borderStyle: isAnon ? 'dashed' : 'solid',
                        boxShadow: isAnon ? 'none' : '0 1px 3px 0 rgba(0,0,0,0.06)',
                      }}>
                      <Avatar name={person.display_name} avatarUrl={person.avatar_url} isAnonymous={isAnon} size={48} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`font-semibold truncate ${isAnon ? 'text-muted-foreground' : 'text-foreground'}`}>{person.display_name}</p>
                          {!isAnon && person.gender && GENDER_LABEL[person.gender] && (
                            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{GENDER_LABEL[person.gender]}</span>
                          )}
                          {isAnon
                            ? <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md font-medium">anonim</span>
                            : <span className="text-xs text-primary bg-secondary px-1.5 py-0.5 rounded-md font-medium border border-border">profil lengkap</span>
                          }
                        </div>
                        {!isAnon
                          ? <p className="text-sm text-muted-foreground truncate mt-0.5">{[person.age ? `${person.age} yo` : '', person.bio].filter(Boolean).join(' · ')}</p>
                          : <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><EyeOff size={11} strokeWidth={2} />Identitas disembunyikan</p>
                        }
                        {!isAnon && (person.instagram || person.whatsapp) && (
                          <div className="flex items-center gap-1.5 mt-1">
                            {person.instagram && <span className="flex items-center gap-1 text-xs text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded-md border border-pink-100"><span className="text-[10px] font-bold">IG</span></span>}
                            {person.whatsapp && <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded-md border border-green-100"><Phone size={10} strokeWidth={2} />WA</span>}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        {person.chat_enabled && (
                          <button
                            onClick={() => handleSayHi(person.user_id)}
                            disabled={isLoading}
                            className="w-11 h-11 rounded-xl flex items-center justify-center bg-primary hover:opacity-90 active:scale-95 transition disabled:opacity-50"
                            title="Mulai chat"
                          >
                            <MessageSquare size={17} color="#fff" strokeWidth={2} />
                          </button>
                        )}
                        <button onClick={() => setMenuTarget(person)} className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition">
                          <MoreHorizontal size={16} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground mt-8">Sesi berakhir dalam 30 menit. Scan QR lagi untuk perpanjang.</p>
          </>
          )
        })()}

        {activeTab === 'inbox' && (
          <>
            {inboxLoading ? (
              <div className="space-y-3 mt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-4 rounded-2xl border border-border animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-muted shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : inbox.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={28} strokeWidth={1.5} className="text-muted-foreground" />
                </div>
                <p className="font-semibold mb-1">Belum ada percakapan</p>
                <p className="text-sm text-muted-foreground">Say Hi ke seseorang untuk mulai ngobrol.</p>
                <button onClick={() => setActiveTab('people')} className="mt-4 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition min-h-[44px]">
                  Lihat orang di sini
                </button>
              </div>
            ) : (
              <div className="space-y-2 mt-2">
                {inbox.map((item) => {
                  const isAnon = item.otherUser?.is_anonymous ?? false
                  const hasUnread = item.unreadCount > 0
                  return (
                    <div
                      key={item.id}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200"
                      style={{
                        borderColor: hasUnread ? '#c06c2e' : '#e4e4e7',
                        backgroundColor: hasUnread ? '#fff8f2' : '#ffffff',
                        boxShadow: hasUnread ? '0 2px 8px 0 rgba(192,108,46,0.08)' : '0 1px 3px 0 rgba(0,0,0,0.05)',
                      }}
                    >
                      <button
                        onClick={() => router.push(`/chat/${item.id}`)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left active:scale-[0.99] transition"
                      >
                        <Avatar
                          name={item.otherUser?.display_name ?? '?'}
                          avatarUrl={item.otherUser?.avatar_url}
                          isAnonymous={isAnon}
                          size={48}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold truncate text-sm text-foreground">
                              {item.otherUser?.display_name ?? 'Pengguna'}
                            </p>
                            {item.lastMessage && (
                              <span className="text-xs text-muted-foreground shrink-0">{formatTime(item.lastMessage.created_at)}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className={`text-sm truncate ${hasUnread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                              {item.lastMessage ? item.lastMessage.message : 'Belum ada pesan'}
                            </p>
                            {item.unreadCount > 0 && (
                              <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                                {item.unreadCount > 9 ? '9+' : item.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => setDeleteConvoId(item.id)}
                        className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50 transition"
                        title="Hapus percakapan"
                      >
                        <Trash2 size={15} strokeWidth={2} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Location exit alert — blocks all interaction */}
      {isOutside && (
        <LocationExitAlert
          shopName={shopName}
          onExit={handleLocationExit}
          loading={locationExitLoading}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-foreground text-background text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}

      {/* Exit Confirm */}
      {exitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-6" onClick={() => setExitConfirm(false)}>
          <div className="bg-background rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <LogOut size={22} strokeWidth={2} className="text-red-500" />
            </div>
            <h2 className="font-bold text-lg mb-1 text-center">Keluar dari sesi?</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">Kamu akan keluar dari <strong>{shopName}</strong>. Scan QR lagi untuk masuk kembali.</p>
            <div className="flex gap-3">
              <button onClick={() => setExitConfirm(false)} className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition min-h-[44px]">Batal</button>
              <button onClick={handleExit} disabled={exitLoading} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition disabled:opacity-50 min-h-[44px]">
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

            {/* Avatar upload */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <div className="flex flex-col items-center mb-5">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="relative group"
                title="Ganti foto profil"
              >
                <Avatar
                  name={editName || myProfile?.display_name || 'A'}
                  avatarUrl={myProfile?.avatar_url}
                  isAnonymous={false}
                  size={72}
                />
                <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                  {avatarUploading
                    ? <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                    : <Camera size={12} color="#fff" strokeWidth={2.5} />
                  }
                </div>
              </button>
              <p className="text-xs text-muted-foreground mt-2">
                {avatarUploading ? 'Mengupload...' : 'Tap untuk ganti foto'}
              </p>
            </div>

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
                    className={`py-3 rounded-xl border text-sm font-semibold transition flex items-center justify-center gap-2 min-h-[44px] ${editMode === 'anonymous' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                    <EyeOff size={14} strokeWidth={2} /> Anonim
                  </button>
                  <button type="button" onClick={() => setEditMode('full')}
                    className={`py-3 rounded-xl border text-sm font-semibold transition flex items-center justify-center gap-2 min-h-[44px] ${editMode === 'full' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                    <UserRound size={14} strokeWidth={2} /> Profil Lengkap
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {editMode === 'anonymous' ? 'Hanya nama yang terlihat oleh orang lain' : 'Nama, usia, bio, dan sosmed terlihat'}
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
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Gender</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: 'female', label: 'Cewek' },
                        { value: 'male', label: 'Cowok' },
                        { value: 'other', label: 'Lainnya' },
                        { value: 'prefer_not_to_say', label: 'Skip' },
                      ] as const).map(({ value, label }) => (
                        <button key={value} type="button" onClick={() => setEditGender(value)}
                          className={`py-2.5 rounded-lg border text-xs font-semibold transition min-h-[40px] ${editGender === value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Bio</label>
                    <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Cerita singkat tentang kamu..." maxLength={150} rows={2}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition resize-none" />
                    <p className="text-xs text-muted-foreground text-right mt-0.5">{editBio.length}/150</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Instagram</label>
                    <input type="text" value={editInstagram} onChange={(e) => setEditInstagram(e.target.value)} placeholder="username (tanpa @)"
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">TikTok</label>
                    <input type="text" value={editTiktok} onChange={(e) => setEditTiktok(e.target.value)} placeholder="username (tanpa @)"
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">WhatsApp</label>
                    <input type="text" value={editWhatsapp} onChange={(e) => setEditWhatsapp(e.target.value)} placeholder="Nomor HP (contoh: 08123...)"
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
                  </div>
                </div>
              )}

              {/* Chat toggle — selalu tampil */}
              <div className="flex items-center justify-between border border-border rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Aktifkan Chat</p>
                  <p className="text-xs text-muted-foreground">Biarkan orang lain kirim pesan ke kamu</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditChatEnabled(!editChatEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${editChatEnabled ? 'bg-primary' : 'bg-border'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editChatEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

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
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                {menuTarget.is_anonymous ? <><EyeOff size={11} strokeWidth={2} />Mode anonim</> : <><UserRound size={11} strokeWidth={2} />Profil lengkap</>}
              </p>
            </div>
            <button onClick={() => setReportOpen(true)} className="w-full px-5 py-4 text-left text-sm font-medium hover:bg-muted transition flex items-center gap-3 min-h-[52px]">
              <Flag size={18} strokeWidth={1.75} className="text-primary" /><span>Laporkan pengguna ini</span>
            </button>
            <button onClick={() => setBlockConfirm(true)} className="w-full px-5 py-4 text-left text-sm font-medium text-red-500 hover:bg-red-50 transition flex items-center gap-3 border-t border-border min-h-[52px]">
              <Ban size={18} strokeWidth={1.75} /><span>Blokir pengguna ini</span>
            </button>
            <button onClick={() => setMenuTarget(null)} className="w-full px-5 py-4 text-left text-sm text-muted-foreground hover:bg-muted transition border-t border-border flex items-center gap-3 min-h-[52px]">
              <X size={16} strokeWidth={2} />Batal
            </button>
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
                <button type="submit" disabled={!reportReason || actionLoading} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition disabled:opacity-50">
                  {actionLoading ? 'Mengirim...' : 'Kirim Laporan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Conversation Confirm */}
      {deleteConvoId && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-6" onClick={() => setDeleteConvoId(null)}>
          <div className="bg-background rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={22} strokeWidth={2} className="text-red-500" />
            </div>
            <h2 className="font-bold text-lg mb-1 text-center">Hapus percakapan?</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">Semua pesan dalam percakapan ini akan dihapus permanen.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConvoId(null)} className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition min-h-[44px]">Batal</button>
              <button onClick={handleDeleteConversation} disabled={deleteLoading} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition disabled:opacity-50 min-h-[44px]">
                {deleteLoading ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Confirm */}
      {blockConfirm && menuTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-6" onClick={() => { setBlockConfirm(false); setMenuTarget(null) }}>
          <div className="bg-background rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <Ban size={22} strokeWidth={2} className="text-red-500" />
            </div>
            <h2 className="font-bold text-lg mb-1 text-center">Blokir {menuTarget.display_name}?</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">Pengguna ini tidak akan bisa melihat atau menghubungi kamu.</p>
            <div className="flex gap-3">
              <button onClick={() => { setBlockConfirm(false); setMenuTarget(null) }} className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition min-h-[44px]">Batal</button>
              <button onClick={handleBlock} disabled={actionLoading} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition disabled:opacity-50 min-h-[44px]">
                {actionLoading ? 'Memblokir...' : 'Ya, Blokir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {themeSwitcherOpen && (
        <ThemeSwitcher onClose={() => setThemeSwitcherOpen(false)} />
      )}
    </main>
  )
}

export default function PeoplePage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground text-sm animate-pulse">Memuat...</p></main>}>
      <PeopleHereList />
    </Suspense>
  )
}
