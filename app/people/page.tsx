'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getDeviceToken, clearDeviceToken } from '@/lib/device-token'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Profile, Message } from '@/types'
import { useLocationGuard } from '@/lib/hooks/useLocationGuard'
import LocationExitAlert from '@/components/LocationExitAlert'
import PushPromptBanner from '@/components/PushPromptBanner'
import { isWithinRadius } from '@/lib/utils/distance'
import {
  Users, MessageSquare, LogOut, MoreHorizontal, Trash2,
  Flag, Ban, X, Coffee, EyeOff, Phone, UserRound, Camera, Palette,
  Heart, Clock, MessageCircle,
} from 'lucide-react'
import ThemeSwitcher from '@/components/ThemeSwitcher'
import InterestPicker from '@/components/InterestPicker'
import Image from 'next/image'

interface PersonHere extends Profile { session_id: string }

interface ConversationItem {
  id: string
  otherUser: Profile
  lastMessage: Message | null
  unreadCount: number
  createdAt: string
}

const GENDER_LABEL: Record<string, string> = {
  male: 'M', female: 'F', other: '', prefer_not_to_say: '',
}

const REPORT_REASONS = ['Spam', 'Konten tidak pantas', 'Pelecehan atau intimidasi', 'Profil palsu', 'Lainnya']

const ICE_BREAKERS = [
  'Kopi atau matcha?',
  'Sering nongkrong di sini?',
  'Lagi ngerjain apa hari ini?',
  'Playlist favorit buat nugas?',
  'Rekomendasiin menu terenak di sini dong',
  'Lebih suka pagi atau malem?',
  'Lagi baca buku apa?',
  'Remote work atau kantor?',
  'Udah pernah ke sini sebelumnya?',
  'Nongkrong bareng atau sendirian hari ini?',
]

function getIceBreaker(userId: string) {
  let hash = 0
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0
  return ICE_BREAKERS[Math.abs(hash) % ICE_BREAKERS.length]
}

const AVATAR_GRADIENTS = [
  ['#C57A6E', '#D4907A'],  // dusty rose
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
  const [shopLogo, setShopLogo] = useState<string | null>(null)
  const [shopPlan, setShopPlan] = useState<string>('starter')
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
  const [sessionExpired, setSessionExpired] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [pendingLikes, setPendingLikes] = useState<Array<{ sender_id: string; profile: Profile }>>([])
  const [sentHis, setSentHis] = useState<Set<string>>(new Set())
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [matchScreen, setMatchScreen] = useState<{ name: string; avatarUrl: string | null; conversationId: string } | null>(null)

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
  const [editInterests, setEditInterests] = useState<string[]>([])
  const [editChatEnabled, setEditChatEnabled] = useState(true)
  const [editSaving, setEditSaving] = useState(false)

  // Report & Block
  const [menuTarget, setMenuTarget] = useState<PersonHere | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDesc, setReportDesc] = useState('')
  const [blockConfirm, setBlockConfirm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [profilePreview, setProfilePreview] = useState<PersonHere | null>(null)
  const [blockListOpen, setBlockListOpen] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState<Profile[]>([])
  const [blockListLoading, setBlockListLoading] = useState(false)
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

  const [realtimeOk, setRealtimeOk] = useState(true)

  const userIdRef = useRef<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const msgChannelRef = useRef<RealtimeChannel | null>(null)
  const likesChannelRef = useRef<RealtimeChannel | null>(null)
  const convosChannelRef = useRef<RealtimeChannel | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  // Tracks previous sentHis to detect when mutual match happens (polling-safe)
  const prevSentHisRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!shopId) { router.push('/join'); return }
    const supabase = createClient()

    async function boot() {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { router.push('/join'); return }
      const uid = auth.user.id
      userIdRef.current = uid
      setCurrentUserId(uid)

      const { data: shop } = await supabase.from('coffee_shops').select('name, latitude, longitude, radius_meter, logo_url, plan').eq('id', shopId).single()
      if (shop) {
        setShopName(shop.name)
        setShopPlan(shop.plan ?? 'starter')
        setShopLogo((shop.plan === 'business' || shop.plan === 'pro') ? (shop.logo_url ?? null) : null)
        const coords = { lat: shop.latitude, lng: shop.longitude, radius: shop.radius_meter }
        setShopCoords(coords)
        sessionStorage.setItem('shopContext', JSON.stringify({ id: shopId, name: shop.name, logo_url: shop.logo_url ?? null, ...coords }))
      }

      const { data: myProf } = await supabase.from('profiles').select('*').eq('user_id', uid).single()
      if (myProf) {
        setMyProfile(myProf as unknown as Profile)
        // Device token check — kick jika akun dibuka di perangkat lain
        const localToken = getDeviceToken()
        if (myProf.device_token && localToken !== myProf.device_token) {
          clearDeviceToken()
          await supabase.auth.signOut()
          router.replace('/login?kicked=1')
          return
        }
      }

      const { data: mySession } = await supabase
        .from('coffee_shop_sessions')
        .select('id, expires_at')
        .eq('user_id', uid)
        .eq('coffee_shop_id', shopId)
        .eq('status', 'active')
        .single()
      if (mySession) {
        // Auto-renew session to 30 min on every page load/refresh
        const newExpires = new Date(Date.now() + 30 * 60 * 1000)
        await supabase.from('coffee_shop_sessions')
          .update({ expires_at: newExpires.toISOString(), last_active_at: new Date().toISOString() })
          .eq('id', mySession.id)
        setSessionId(mySession.id)
        setSessionExpiresAt(newExpires)
      } else {
        // No active session — redirect back to entry so GPS is re-verified
        router.replace('/join')
        return
      }

      await fetchPeople(uid, supabase)
      await fetchInbox(uid, supabase)
      await fetchPendingLikes(uid, supabase)
      await fetchSentHis(uid, supabase)

      registerPush(uid)

      function subscribeChannels() {
        if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
        if (msgChannelRef.current) { supabase.removeChannel(msgChannelRef.current); msgChannelRef.current = null }
        if (likesChannelRef.current) { supabase.removeChannel(likesChannelRef.current); likesChannelRef.current = null }
        if (convosChannelRef.current) { supabase.removeChannel(convosChannelRef.current); convosChannelRef.current = null }

        const channel = supabase
          .channel(`people-${shopId}-${Date.now()}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'coffee_shop_sessions', filter: `coffee_shop_id=eq.${shopId}` },
            () => { if (userIdRef.current) fetchPeople(userIdRef.current, supabase) })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setRealtimeOk(true)
              reconnectAttemptsRef.current = 0
            }
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              setRealtimeOk(false)
              const delay = Math.min(3000 * Math.pow(2, reconnectAttemptsRef.current), 30_000)
              reconnectAttemptsRef.current++
              if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
              reconnectTimerRef.current = setTimeout(() => {
                if (userIdRef.current) subscribeChannels()
              }, delay)
            }
          })
        channelRef.current = channel

        const msgChannel = supabase
          .channel(`inbox-${uid}-${Date.now()}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
            () => { if (userIdRef.current) fetchInbox(userIdRef.current, supabase) })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' },
            () => { if (userIdRef.current) fetchInbox(userIdRef.current, supabase) })
          .subscribe()
        msgChannelRef.current = msgChannel

        const likesChannel = supabase
          .channel(`likes-${uid}-${Date.now()}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'interactions', filter: `receiver_id=eq.${uid}` },
            (payload) => {
              if (payload.new.type === 'say_hi' && userIdRef.current) {
                fetchPendingLikes(userIdRef.current, supabase)
                showToast('Ada yang Say Hi ke kamu!')
              }
            })
          .subscribe()
        likesChannelRef.current = likesChannel

        // Conversations channel: fires when the other person creates the conversation (mutual match from their side)
        // RLS ensures we only receive events for conversations we're part of
        const convosChannel = supabase
          .channel(`convos-${uid}-${Date.now()}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' },
            async (payload) => {
              const row = payload.new as { id: string; user_one_id: string; user_two_id: string }
              if (row.user_one_id !== uid && row.user_two_id !== uid) return
              const otherId = row.user_one_id === uid ? row.user_two_id : row.user_one_id

              // Refresh inbox & sentHis immediately
              fetchInbox(uid, supabase)
              fetchSentHis(uid, supabase)

              // Check if I had sent Hi to this person — if yes, show match screen (they replied)
              const { data: mySentHi } = await supabase
                .from('interactions').select('id')
                .eq('sender_id', uid).eq('receiver_id', otherId).eq('type', 'say_hi')
                .maybeSingle()

              if (mySentHi) {
                const { data: prof } = await supabase
                  .from('profiles').select('display_name, avatar_url').eq('user_id', otherId).single()
                if (prof) {
                  setMatchScreen((prev) => prev ?? {
                    name: prof.display_name,
                    avatarUrl: prof.avatar_url ?? null,
                    conversationId: row.id,
                  })
                }
              }
            })
          .subscribe()
        convosChannelRef.current = convosChannel
      }

      subscribeChannels()

      // Polling fallback setiap 30 detik (tetap jalan meski realtime mati)
      pollRef.current = setInterval(() => {
        if (userIdRef.current) {
          fetchPeople(userIdRef.current, supabase)
          fetchInbox(userIdRef.current, supabase)
          fetchPendingLikes(userIdRef.current, supabase)
          fetchSentHis(userIdRef.current, supabase)
        }
      }, 30_000)
    }

    boot()
    return () => {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
      if (msgChannelRef.current) { supabase.removeChannel(msgChannelRef.current); msgChannelRef.current = null }
      if (likesChannelRef.current) { supabase.removeChannel(likesChannelRef.current); likesChannelRef.current = null }
      if (convosChannelRef.current) { supabase.removeChannel(convosChannelRef.current); convosChannelRef.current = null }
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null }
    }
  }, [shopId])

  useEffect(() => {
    if (!sessionExpiresAt) return
    const id = setInterval(() => {
      if (sessionExpiresAt.getTime() <= Date.now()) {
        setSessionExpired(true)
        clearInterval(id)
      }
    }, 15_000)
    return () => clearInterval(id)
  }, [sessionExpiresAt])


  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !currentUserId) return
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      showToast('Format tidak didukung. Gunakan JPG, PNG, atau WebP.')
      return
    }
    // 10 MB raw limit — canvas will compress it down
    if (file.size > 10 * 1024 * 1024) { showToast('Foto terlalu besar. Maksimal 10MB.'); return }
    setAvatarUploading(true)
    if (avatarInputRef.current) avatarInputRef.current.value = ''

    // Compress: resize to max 600px, export JPEG — handles HEIC/PNG/WebP too
    let blob: Blob
    try {
      blob = await new Promise<Blob>((resolve, reject) => {
        const img = new window.Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
          const MAX = 600
          let { width, height } = img
          if (width > MAX || height > MAX) {
            if (width >= height) { height = Math.round(height * MAX / width); width = MAX }
            else { width = Math.round(width * MAX / height); height = MAX }
          }
          const canvas = document.createElement('canvas')
          canvas.width = width; canvas.height = height
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, width, height)
          // First pass at 0.82 — revoke URL inside blob callback after canvas is done
          canvas.toBlob((b1) => {
            URL.revokeObjectURL(url)
            if (!b1) { reject(new Error('canvas failed')); return }
            // Second pass if still > 150KB — reduce to 0.65
            if (b1.size > 150 * 1024) {
              canvas.toBlob((b2) => b2 ? resolve(b2) : resolve(b1), 'image/jpeg', 0.65)
            } else {
              resolve(b1)
            }
          }, 'image/jpeg', 0.82)
        }
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')) }
        img.src = url
      })
    } catch {
      showToast('Gagal memproses foto. Coba foto lain.'); setAvatarUploading(false); return
    }

    const supabase = createClient()
    const path = `${currentUserId}/avatar.jpg`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (uploadError) { showToast('Gagal upload foto. Coba lagi.'); setAvatarUploading(false); return }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', currentUserId)
    setMyProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : prev)
    setAvatarUploading(false)
    showToast('Foto profil diperbarui!')
  }

  async function fetchPeople(uid: string, supabase: ReturnType<typeof createClient>) {
    const { data: myBlocks } = await supabase.from('blocks').select('user_id, blocked_user_id')
      .or(`user_id.eq.${uid},blocked_user_id.eq.${uid}`)
    const blockedIds = new Set((myBlocks ?? []).map((b) => b.user_id === uid ? b.blocked_user_id : b.user_id))

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
    setLoading(false) // always runs, even if profiles is null
  }

  async function fetchInbox(uid: string, supabase: ReturnType<typeof createClient>) {
    setInboxLoading(true)
    const { data: convos } = await supabase
      .from('conversations')
      .select('id, user_one_id, user_two_id, created_at')
      .or(`user_one_id.eq.${uid},user_two_id.eq.${uid}`)

    if (!convos || convos.length === 0) { setInbox([]); setUnreadTotal(0); setInboxLoading(false); return }

    const { data: myBlocks } = await supabase.from('blocks').select('user_id, blocked_user_id')
      .or(`user_id.eq.${uid},blocked_user_id.eq.${uid}`)
    const blockedIds = new Set((myBlocks ?? []).map((b) => b.user_id === uid ? b.blocked_user_id : b.user_id))

    const visibleConvos = convos.filter((c) => {
      const otherUid = c.user_one_id === uid ? c.user_two_id : c.user_one_id
      return !blockedIds.has(otherUid)
    })
    if (visibleConvos.length === 0) { setInbox([]); setUnreadTotal(0); setInboxLoading(false); return }

    const otherUserIds = visibleConvos.map((c) => c.user_one_id === uid ? c.user_two_id : c.user_one_id)
    const convoIds = visibleConvos.map((c) => c.id)

    const [profilesRes, messagesRes] = await Promise.all([
      supabase.from('profiles').select('*').in('user_id', otherUserIds),
      supabase.from('messages').select('*').in('conversation_id', convoIds).order('created_at', { ascending: false }).limit(300),
    ])

    const profileMap = Object.fromEntries((profilesRes.data ?? []).map((p) => [p.user_id, p as unknown as Profile]))
    const allMessages = (messagesRes.data ?? []) as Message[]

    const now = Date.now()
    const items: ConversationItem[] = visibleConvos.map((convo) => {
      const otherUid = convo.user_one_id === uid ? convo.user_two_id : convo.user_one_id
      const convoMessages = allMessages.filter((m) => m.conversation_id === convo.id)
      const lastMessage = convoMessages[0] ?? null
      const unreadCount = convoMessages.filter((m) => m.sender_id !== uid && !m.read_at).length
      return {
        id: convo.id,
        otherUser: profileMap[otherUid],
        lastMessage,
        unreadCount,
        createdAt: convo.created_at,
      }
    }).filter((item) => {
      if (!item.otherUser) return false
      if (item.lastMessage !== null) return true
      // Tampilkan Say Hi baru (belum ada pesan) selama <24 jam
      return now - new Date(item.createdAt).getTime() < 24 * 60 * 60 * 1000
    }).sort((a, b) => {
        const aTime = a.lastMessage?.created_at ?? a.createdAt
        const bTime = b.lastMessage?.created_at ?? b.createdAt
        return bTime.localeCompare(aTime)
      })

    setInbox(items)
    setUnreadTotal(items.reduce((sum, i) => sum + i.unreadCount, 0))
    setInboxLoading(false)
  }

  async function fetchPendingLikes(uid: string, supabase: ReturnType<typeof createClient>) {
    const [{ data: incoming }, { data: convos }] = await Promise.all([
      supabase.from('interactions').select('sender_id').eq('receiver_id', uid).eq('type', 'say_hi'),
      supabase.from('conversations').select('user_one_id, user_two_id').or(`user_one_id.eq.${uid},user_two_id.eq.${uid}`),
    ])
    const existingPartners = new Set((convos ?? []).map((c) => c.user_one_id === uid ? c.user_two_id : c.user_one_id))
    const pending = [...new Set((incoming ?? []).map((i) => i.sender_id))].filter((id) => !existingPartners.has(id) && id !== uid)
    if (pending.length === 0) { setPendingLikes([]); return }
    const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', pending)
    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]))
    setPendingLikes(pending.map((id) => ({ sender_id: id, profile: profileMap[id] as Profile })).filter((p) => p.profile))
  }

  async function fetchSentHis(uid: string, supabase: ReturnType<typeof createClient>) {
    const [{ data: outgoing }, { data: convos }] = await Promise.all([
      supabase.from('interactions').select('receiver_id').eq('sender_id', uid).eq('type', 'say_hi'),
      supabase.from('conversations').select('id, user_one_id, user_two_id').or(`user_one_id.eq.${uid},user_two_id.eq.${uid}`),
    ])
    // Map otherId → conversation row (keyed by the other person's user_id)
    const partnerConvoMap = new Map((convos ?? []).map((c) => {
      const otherId = c.user_one_id === uid ? c.user_two_id : c.user_one_id
      return [otherId, c] as [string, typeof c]
    }))
    const sent = (outgoing ?? []).map((i: { receiver_id: string }) => i.receiver_id).filter((id) => !partnerConvoMap.has(id))
    const newSentHis = new Set(sent)

    // Detect mutual match for User A (the one who first sent Say Hi)
    // When B replies, B's id moves OUT of sentHis and INTO partnerConvoMap
    for (const prevId of prevSentHisRef.current) {
      if (!newSentHis.has(prevId) && partnerConvoMap.has(prevId)) {
        const convo = partnerConvoMap.get(prevId)!
        const { data: prof } = await supabase
          .from('profiles').select('display_name, avatar_url').eq('user_id', prevId).single()
        if (prof) {
          setMatchScreen((cur) => cur ?? {
            name: prof.display_name,
            avatarUrl: prof.avatar_url ?? null,
            conversationId: convo.id,
          })
        }
      }
    }

    prevSentHisRef.current = newSentHis
    setSentHis(newSentHis)
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
      setEditInterests(myProfile.interests ?? [])
      setEditChatEnabled(myProfile.chat_enabled ?? true)
    }
    setEditOpen(true)
  }

  async function handleExit() {
    if (!currentUserId) { router.push('/join'); return }
    setExitLoading(true)
    const supabase = createClient()
    await supabase.from('coffee_shop_sessions')
      .update({ status: 'left' })
      .eq('user_id', currentUserId)
      .eq('coffee_shop_id', shopId!)
      .eq('status', 'active')
    router.push('/join')
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
    router.push('/join')
  }

  async function handleSayHi(receiverId: string) {
    if (!currentUserId || sayingHiTo.has(receiverId)) return
    setSayingHiTo((prev) => new Set(prev).add(receiverId))
    const supabase = createClient()

    try {
      // 1. If a conversation already exists, navigate to it directly — no duplicate insert
      const { data: existingConvo } = await supabase
        .from('conversations').select('id')
        .or(`and(user_one_id.eq.${currentUserId},user_two_id.eq.${receiverId}),and(user_one_id.eq.${receiverId},user_two_id.eq.${currentUserId})`)
        .maybeSingle()
      if (existingConvo?.id) {
        router.push(`/chat/${existingConvo.id}`)
        return
      }

      const isMutual = pendingLikes.some((p) => p.sender_id === receiverId)
      const matchProfile = isMutual ? pendingLikes.find((p) => p.sender_id === receiverId)?.profile : undefined

      // 2. Still waiting — only block if not mutual (mutual = both sent, must create convo)
      if (sentHis.has(receiverId) && !isMutual) {
        showToast('Sudah kirim Say Hi, tunggu balasannya')
        return
      }

      // 3. Insert interaction — handle unique constraint violation gracefully (code 23505)
      const { error: insertError } = await supabase
        .from('interactions').insert({ sender_id: currentUserId, receiver_id: receiverId, type: 'say_hi' })
      if (insertError && insertError.code !== '23505') {
        showToast('Gagal. Coba lagi.')
        return
      }

      // Lock button immediately regardless of mutual/non-mutual
      setSentHis((prev) => new Set(prev).add(receiverId))

      if (isMutual) {
        // 4. Create conversation (with race condition fallback)
        let convoId: string | null = null
        const { data: newConvo, error: convoError } = await supabase
          .from('conversations').insert({ user_one_id: currentUserId, user_two_id: receiverId }).select('id').single()
        if (convoError) {
          const { data: fallback } = await supabase
            .from('conversations').select('id')
            .or(`and(user_one_id.eq.${currentUserId},user_two_id.eq.${receiverId}),and(user_one_id.eq.${receiverId},user_two_id.eq.${currentUserId})`)
            .maybeSingle()
          convoId = fallback?.id ?? null
        } else {
          convoId = newConvo?.id ?? null
        }

        if (convoId) {
          setPendingLikes((p) => p.filter((x) => x.sender_id !== receiverId))
          fetchInbox(currentUserId, supabase)
          setMatchScreen({
            name: matchProfile?.display_name ?? 'Seseorang',
            avatarUrl: matchProfile?.avatar_url ?? null,
            conversationId: convoId,
          })
        } else {
          showToast('Gagal memulai chat. Coba lagi.')
        }
      }
    } catch {
      showToast('Gagal. Coba lagi.')
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
        interests: editInterests.length > 0 ? editInterests : null,
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
    setInbox((prev) => {
      const updated = prev.filter((i) => i.otherUser?.user_id !== menuTarget.user_id)
      setUnreadTotal(updated.reduce((sum, i) => sum + i.unreadCount, 0))
      return updated
    })
    setBlockConfirm(false); setMenuTarget(null); setActionLoading(false)
    showToast('Pengguna telah diblokir')
  }

  async function fetchBlockedUsers() {
    if (!currentUserId) return
    setBlockListLoading(true)
    const supabase = createClient()
    const { data: blocks } = await supabase.from('blocks').select('blocked_user_id').eq('user_id', currentUserId)
    if (!blocks || blocks.length === 0) { setBlockedUsers([]); setBlockListLoading(false); return }
    const ids = blocks.map((b: { blocked_user_id: string }) => b.blocked_user_id)
    const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', ids)
    setBlockedUsers((profiles ?? []) as unknown as Profile[])
    setBlockListLoading(false)
  }

  async function handleUnblock(targetUserId: string) {
    if (!currentUserId) return
    const supabase = createClient()
    await supabase.from('blocks').delete().eq('user_id', currentUserId).eq('blocked_user_id', targetUserId)
    setBlockedUsers((prev) => prev.filter((u) => u.user_id !== targetUserId))
    showToast('Pengguna berhasil di-unblock')
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
    const targetId = deleteConvoId
    setDeleteLoading(true)

    const res = await fetch(`/api/conversations/${targetId}`, { method: 'DELETE' })
    if (!res.ok) {
      showToast('Gagal hapus percakapan. Coba lagi.')
      setDeleteLoading(false)
      return
    }

    setInbox((prev) => {
      const updated = prev.filter((i) => i.id !== targetId)
      setUnreadTotal(updated.reduce((sum, i) => sum + i.unreadCount, 0))
      return updated
    })
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
    <main className="min-h-[100dvh] max-w-lg mx-auto flex flex-col">
      {/* Header */}
      <div className="px-4 flex items-center justify-between shrink-0 border-b border-border/50 gap-3"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', paddingBottom: 12 }}>
        {/* Left: logo + info */}
        <div className="flex items-center gap-2.5 min-w-0">
          {shopLogo ? (
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-border shrink-0">
              <Image src={shopLogo} alt={shopName} width={36} height={36} className="object-cover w-full h-full" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-[#F7EEE1]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-social.png" alt="Social Coffé" className="w-full h-full object-contain mix-blend-multiply" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-display text-sm font-bold text-foreground leading-tight truncate">
              {shopName}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${realtimeOk ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />
              <p className="text-[11px] text-muted-foreground truncate">
                {people.length} orang di sini
              </p>
            </div>
          </div>
        </div>
        {/* Right: actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => setThemeSwitcherOpen(true)}
            className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition" title="Tampilan">
            <Palette size={14} strokeWidth={2} />
          </button>
          <button onClick={() => setExitConfirm(true)}
            className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition" title="Keluar">
            <LogOut size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Push notification banner */}
      {currentUserId && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && (
        <PushPromptBanner userId={currentUserId} vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 84px)' }}>
        {activeTab === 'people' && (() => {
          // Map otherUser.user_id → conversation id for instant "Chat" button
          const convoMap = new Map(
            inbox.filter((i) => i.otherUser).map((i) => [i.otherUser.user_id, i.id])
          )
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
            <div className="flex items-center gap-1.5 mb-3 mt-4 overflow-x-auto pb-1 scrollbar-none">
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
            </div>


            {/* Pending likes notification strip */}
            {pendingLikes.length > 0 && (
              <div className="mb-3 px-3.5 py-3 rounded-2xl flex items-center gap-3"
                style={{
                  background: 'color-mix(in srgb, var(--primary) 8%, var(--card))',
                  border: '1px solid color-mix(in srgb, var(--primary) 28%, transparent)',
                }}>
                <div className="flex -space-x-2 shrink-0">
                  {pendingLikes.slice(0, 3).map(({ sender_id, profile }) => (
                    <div key={sender_id} className="w-8 h-8 rounded-full ring-2 ring-card overflow-hidden shrink-0">
                      <Avatar name={profile.display_name} avatarUrl={profile.avatar_url} isAnonymous={profile.is_anonymous} size={32} />
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-primary leading-tight">
                    {pendingLikes.length === 1 ? '1 orang Say Hi ke kamu!' : `${pendingLikes.length} orang Say Hi ke kamu!`}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Scroll ke bawah untuk balas ↓</p>
                </div>
                <Heart size={15} strokeWidth={2} className="text-primary shrink-0" fill="currentColor" />
              </div>
            )}

            {filteredPeople.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'var(--secondary)', border: '1.5px solid var(--border)' }}>
                  {genderFilter === 'all'
                    ? <Coffee size={32} strokeWidth={1.5} className="text-primary/60" />
                    : <Users size={32} strokeWidth={1.5} className="text-primary/60" />}
                </div>
                {genderFilter === 'all' ? (
                  <>
                    <p className="font-bold text-base mb-1.5">Kamu yang pertama di sini</p>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-[220px]">Orang lain akan muncul otomatis begitu mereka bergabung.</p>
                    <div className="mt-6 px-4 py-2 rounded-full bg-muted border border-border text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock size={11} strokeWidth={2} className="shrink-0" />
                      Sesi aktif · 30 menit
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-base mb-1.5">Tidak ada hasil</p>
                    <p className="text-sm text-muted-foreground">Tidak ada orang dengan filter ini sekarang.</p>
                    <button onClick={() => setGenderFilter('all')} className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition min-h-[44px]">Tampilkan semua</button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPeople.map((person) => {
                  const isAnon = person.is_anonymous
                  const isLoading = sayingHiTo.has(person.user_id)
                  const isSent = sentHis.has(person.user_id)
                  const isMutual = pendingLikes.some((p) => p.sender_id === person.user_id)
                  const existingConvoId = convoMap.get(person.user_id) ?? null
                  const isMatched = !!existingConvoId
                  const genderLabel = person.gender === 'male' ? 'Pria' : person.gender === 'female' ? 'Wanita' : null
                  const highlighted = isMutual || isMatched
                  return (
                    <div key={person.id}
                      className="rounded-2xl border transition-all duration-300"
                      style={{
                        backgroundColor: highlighted ? 'color-mix(in srgb, var(--primary) 6%, var(--card))' : 'var(--card)',
                        borderColor: highlighted ? 'color-mix(in srgb, var(--primary) 40%, transparent)' : 'var(--border)',
                        borderStyle: isAnon ? 'dashed' : 'solid',
                        boxShadow: highlighted
                          ? '0 0 0 1px color-mix(in srgb, var(--primary) 25%, transparent), 0 4px 16px 0 rgba(197,122,110,0.12)'
                          : isAnon ? 'none' : '0 2px 8px 0 rgba(44,26,8,0.06)',
                      }}>
                      <div className="flex items-start gap-3.5 p-4">
                        {/* Avatar */}
                        <div className="shrink-0 relative">
                          <div
                            onClick={() => !isAnon && person.avatar_url && setPhotoPreview(person.avatar_url)}
                            className={!isAnon && person.avatar_url ? 'cursor-pointer' : ''}
                          >
                            <Avatar name={person.display_name} avatarUrl={person.avatar_url} isAnonymous={isAnon} size={64} />
                          </div>
                          {highlighted && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
                              <Heart size={10} strokeWidth={2.5} color="white" fill="white" />
                            </span>
                          )}
                          {!highlighted && !isAnon && genderLabel && (
                            <span className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground leading-tight">
                              {genderLabel[0]}
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          {isMatched && (
                            <p className="text-[10px] font-bold text-primary mb-1.5">✓ Sudah cocok — mulai ngobrol!</p>
                          )}
                          {!isMatched && isMutual && (
                            <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-full w-fit"
                              style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 35%, transparent)' }}>
                              <Heart size={9} strokeWidth={2.5} fill="currentColor" className="text-primary" />
                              <span className="text-[10px] font-bold text-primary">Balas Say Hi yuk!</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className={`font-bold text-base leading-tight truncate ${isAnon ? 'text-muted-foreground' : 'text-foreground'}`}>
                              {person.display_name}
                              {!isAnon && person.age ? <span className="font-normal text-sm text-muted-foreground">, {person.age}</span> : null}
                            </p>
                          </div>

                          {isAnon ? (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <EyeOff size={10} strokeWidth={2} />Identitas disembunyikan
                            </p>
                          ) : (
                            <>
                              {person.bio && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1 leading-relaxed italic">"{person.bio}"</p>
                              )}
                              {person.interests && person.interests.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {person.interests.slice(0, 3).map((tag) => (
                                    <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary border border-border text-secondary-foreground">
                                      {tag}
                                    </span>
                                  ))}
                                  {person.interests.length > 3 && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                      +{person.interests.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                              {!person.bio && (!person.interests || person.interests.length === 0) && !isMutual && (
                                <span className="inline-block mt-1 text-xs text-primary bg-secondary px-2 py-0.5 rounded-full font-medium border border-border">
                                  Di sini sekarang
                                </span>
                              )}
                              {!isMutual && (
                                <p className="flex items-start gap-1 text-[10px] text-muted-foreground mt-1.5 italic">
                                  <MessageCircle size={10} strokeWidth={2} className="shrink-0 mt-0.5" />
                                  {getIceBreaker(person.user_id)}
                                </p>
                              )}
                            </>
                          )}

                          {/* Action row */}
                          {person.chat_enabled && (
                            <div className="flex items-center gap-2 mt-2.5">
                              {!isAnon && !highlighted && (
                                <button
                                  onClick={() => setProfilePreview(person)}
                                  className="text-xs font-semibold text-muted-foreground border border-border px-3 py-2.5 rounded-xl hover:bg-muted transition min-h-[44px] active:scale-[0.97]"
                                >
                                  Profil
                                </button>
                              )}
                              {isMatched ? (
                                // Sudah match — langsung ke chat
                                <button
                                  onClick={() => router.push(`/chat/${existingConvoId}`)}
                                  className="flex items-center gap-1.5 text-xs font-bold px-4 py-3 rounded-xl active:scale-[0.97] transition-all duration-150 min-h-[44px] text-white"
                                  style={{ background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, #e88))' }}
                                >
                                  <MessageSquare size={13} strokeWidth={2} /> Chat
                                </button>
                              ) : isMutual ? (
                                // Dia sudah say hi, tinggal balas → buat conversation
                                <button
                                  onClick={() => handleSayHi(person.user_id)}
                                  disabled={isLoading}
                                  className="flex items-center gap-1.5 text-xs font-bold px-4 py-3 rounded-xl active:scale-[0.97] transition-all duration-150 min-h-[44px] disabled:opacity-60 text-white"
                                  style={{ background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, #e88))' }}
                                >
                                  {isLoading
                                    ? <span className="animate-pulse">Sebentar...</span>
                                    : <><MessageSquare size={13} strokeWidth={2} /> Chat</>
                                  }
                                </button>
                              ) : (
                                // Belum ada interaksi atau sedang menunggu
                                <button
                                  onClick={() => handleSayHi(person.user_id)}
                                  disabled={isLoading || isSent}
                                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl active:scale-[0.97] transition-all duration-150 min-h-[44px] ${
                                    isSent
                                      ? 'bg-muted text-muted-foreground border border-border cursor-default'
                                      : 'bg-primary text-primary-foreground hover:opacity-90'
                                  }`}
                                >
                                  {isLoading ? (
                                    <span className="animate-pulse">Sebentar...</span>
                                  ) : isSent ? (
                                    <><Clock size={11} strokeWidth={2} className="shrink-0 opacity-50" /> <span className="opacity-60">Menunggu</span></>
                                  ) : (
                                    <><Heart size={12} strokeWidth={2.5} /> Say Hi</>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Menu */}
                        <button onClick={() => setMenuTarget(person)} className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition mt-0.5">
                          <MoreHorizontal size={15} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
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
                        borderColor: hasUnread ? 'var(--primary)' : 'var(--border)',
                        backgroundColor: hasUnread ? 'var(--secondary)' : 'var(--card)',
                        boxShadow: hasUnread ? '0 2px 8px 0 rgba(197,122,110,0.12)' : '0 1px 3px 0 rgba(0,0,0,0.05)',
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

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
        <div className="w-full max-w-lg pointer-events-auto border-t border-border"
          style={{ background: 'var(--card)', backdropFilter: 'blur(16px)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex items-end">

            {/* People tab */}
            <button onClick={() => setActiveTab('people')}
              className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-2 relative transition-colors ${activeTab === 'people' ? 'text-primary' : 'text-muted-foreground'}`}>
              <span className={`absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full transition-all duration-200 bg-primary ${activeTab === 'people' ? 'opacity-100' : 'opacity-0'}`} />
              <div className="relative">
                <Users size={22} strokeWidth={activeTab === 'people' ? 2.5 : 1.75} />
                {people.length > 0 && (
                  <span className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                    {people.length > 9 ? '9+' : people.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold">Di Sini</span>
            </button>

            {/* Center Profile Button */}
            <button onClick={openEdit} className="flex-1 flex flex-col items-center pb-2 relative">
              <div className="w-14 h-14 rounded-full border-[3px] border-card shadow-lg overflow-hidden -mt-6"
                style={{ boxShadow: '0 4px 16px rgba(197,122,110,0.25)' }}>
                <Avatar
                  name={myProfile?.display_name ?? 'A'}
                  avatarUrl={myProfile?.avatar_url}
                  isAnonymous={myProfile?.is_anonymous ?? true}
                  size={56}
                />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground mt-1">Profil</span>
            </button>

            {/* Inbox tab */}
            <button onClick={() => setActiveTab('inbox')}
              className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-2 relative transition-colors ${activeTab === 'inbox' ? 'text-primary' : 'text-muted-foreground'}`}>
              <span className={`absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full transition-all duration-200 bg-primary ${activeTab === 'inbox' ? 'opacity-100' : 'opacity-0'}`} />
              <div className="relative">
                <MessageSquare size={22} strokeWidth={activeTab === 'inbox' ? 2.5 : 1.75} />
                {unreadTotal > 0 && (
                  <span className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                    {unreadTotal > 9 ? '9+' : unreadTotal}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold">Inbox</span>
            </button>

          </div>
        </div>
      </div>

      {/* Location exit alert — blocks all interaction */}
      {isOutside && (
        <LocationExitAlert
          shopName={shopName}
          onExit={handleLocationExit}
          loading={locationExitLoading}
        />
      )}

      {/* Match Screen — Bottom Sheet */}
      {matchScreen && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMatchScreen(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl overflow-hidden"
            style={{ background: 'var(--card)', boxShadow: '0 -8px 48px rgba(0,0,0,0.18)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            <div className="px-6 pt-3 pb-[max(32px,env(safe-area-inset-bottom))]">
              {/* Avatars + nama */}
              <div className="flex items-end justify-center gap-3 mb-5">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 rounded-full overflow-hidden shrink-0"
                    style={{ boxShadow: '0 0 0 4px color-mix(in srgb, var(--primary) 25%, transparent)' }}>
                    <Avatar name={myProfile?.display_name ?? 'A'} avatarUrl={myProfile?.avatar_url} isAnonymous={false} size={80} />
                  </div>
                  <p className="text-xs font-bold text-foreground max-w-[80px] text-center truncate">{myProfile?.display_name ?? 'Kamu'}</p>
                </div>

                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 mb-5"
                  style={{ boxShadow: '0 4px 16px color-mix(in srgb, var(--primary) 45%, transparent)' }}>
                  <Heart size={17} strokeWidth={2.5} color="white" fill="white" />
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 rounded-full overflow-hidden shrink-0"
                    style={{ boxShadow: '0 0 0 4px color-mix(in srgb, var(--primary) 25%, transparent)' }}>
                    <Avatar name={matchScreen.name} avatarUrl={matchScreen.avatarUrl} isAnonymous={false} size={80} />
                  </div>
                  <p className="text-xs font-bold text-foreground max-w-[80px] text-center truncate">{matchScreen.name}</p>
                </div>
              </div>

              {/* Copy */}
              <div className="text-center mb-6">
                <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground mb-1.5">Sama-sama suka ☕</p>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-display, serif)' }}>
                  Cocok banget!
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Kamu dan <span className="font-semibold text-foreground">{matchScreen.name}</span> sama-sama Say Hi.<br />
                  Sekarang kalian bisa mulai ngobrol!
                </p>
              </div>

              {/* CTA */}
              <button
                onClick={() => { setMatchScreen(null); router.push(`/chat/${matchScreen.conversationId}`) }}
                className="w-full py-4 rounded-2xl font-bold text-base text-white mb-3 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #e06060))',
                  boxShadow: '0 4px 20px color-mix(in srgb, var(--primary) 38%, transparent)',
                }}
              >
                <MessageSquare size={18} strokeWidth={2} />
                Mulai Ngobrol
              </button>
              <button
                onClick={() => setMatchScreen(null)}
                className="w-full text-muted-foreground text-sm py-2.5 hover:text-foreground transition rounded-xl"
              >
                Nanti aja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      {photoPreview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPhotoPreview(null)}
        >
          <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={photoPreview}
              alt="Foto profil"
              className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            />
            <button
              onClick={() => setPhotoPreview(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-foreground text-background text-sm font-medium shadow-lg whitespace-nowrap"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 88px)' }}>
          {toast}
        </div>
      )}

      {/* Exit Confirm */}
      {exitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-[max(24px,env(safe-area-inset-bottom))]" onClick={() => setExitConfirm(false)}>
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
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-[max(24px,env(safe-area-inset-bottom))]" onClick={() => setEditOpen(false)}>
          <div className="bg-background rounded-2xl p-6 w-full max-w-sm shadow-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-1">Edit Profil</h2>
            <p className="text-sm text-muted-foreground mb-4">Ubah nama dan informasi kamu</p>

            {/* Avatar upload — use opacity-0 not display:none so iOS Safari can trigger it */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*,image/heic,image/heif"
              onChange={handleAvatarUpload}
              style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
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
                  <InterestPicker selected={editInterests} onChange={setEditInterests} />
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
            <button
              type="button"
              onClick={() => { setEditOpen(false); fetchBlockedUsers(); setBlockListOpen(true) }}
              className="w-full mt-3 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition flex items-center justify-center gap-2"
            >
              <Ban size={14} strokeWidth={2} />Daftar Blokir
            </button>
          </div>
        </div>
      )}

      {/* Action Sheet */}
      {menuTarget && !reportOpen && !blockConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-[max(24px,env(safe-area-inset-bottom))]" onClick={() => setMenuTarget(null)}>
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
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-[max(24px,env(safe-area-inset-bottom))]" onClick={() => { setReportOpen(false); setMenuTarget(null) }}>
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
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-[max(24px,env(safe-area-inset-bottom))]" onClick={() => setDeleteConvoId(null)}>
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

      {/* Profile Preview */}
      {profilePreview && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-[max(24px,env(safe-area-inset-bottom))]" onClick={() => setProfilePreview(null)}>
          <div className="bg-background rounded-2xl w-full max-w-sm shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Top close handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="px-6 pt-2 pb-6">
              {/* Avatar + name */}
              <div className="flex items-center gap-4 mb-5">
                <div
                  onClick={() => profilePreview.avatar_url && setPhotoPreview(profilePreview.avatar_url)}
                  className={profilePreview.avatar_url ? 'cursor-pointer' : ''}
                >
                  <Avatar name={profilePreview.display_name} avatarUrl={profilePreview.avatar_url} isAnonymous={false} size={64} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-lg leading-tight truncate">{profilePreview.display_name}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {profilePreview.gender && GENDER_LABEL[profilePreview.gender] && (
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{GENDER_LABEL[profilePreview.gender]}</span>
                    )}
                    {profilePreview.age && (
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{profilePreview.age} th</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio */}
              {profilePreview.bio && (
                <div className="mb-3 p-3 rounded-xl bg-muted/50 border border-border">
                  <p className="text-sm text-foreground leading-relaxed">{profilePreview.bio}</p>
                </div>
              )}

              {/* Interests */}
              {profilePreview.interests && profilePreview.interests.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Minat & Hobi</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profilePreview.interests.map((tag) => (
                      <span key={tag} className="text-xs font-semibold px-3 py-1 rounded-full bg-secondary border border-border text-secondary-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Socials */}
              {(profilePreview.instagram || profilePreview.whatsapp || profilePreview.tiktok) && (
                <div className="flex flex-col gap-2 mb-5">
                  {profilePreview.instagram && (
                    <a href={`https://instagram.com/${profilePreview.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-pink-100 bg-pink-50 text-sm font-medium text-pink-700 hover:bg-pink-100 transition">
                      <span className="text-xs font-bold bg-pink-200 text-pink-800 px-1.5 py-0.5 rounded">IG</span>
                      @{profilePreview.instagram.replace('@','')}
                    </a>
                  )}
                  {profilePreview.tiktok && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/40 text-sm font-medium text-foreground">
                      <span className="text-xs font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded">TT</span>
                      @{profilePreview.tiktok.replace('@','')}
                    </div>
                  )}
                  {profilePreview.whatsapp && (
                    <a href={`https://wa.me/${profilePreview.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-green-100 bg-green-50 text-sm font-medium text-green-700 hover:bg-green-100 transition">
                      <Phone size={14} strokeWidth={2} />
                      {profilePreview.whatsapp}
                    </a>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={() => setProfilePreview(null)}
                  className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition min-h-[44px]">
                  Tutup
                </button>
                {profilePreview.chat_enabled && (() => {
                  const isSent = sentHis.has(profilePreview.user_id)
                  const isMutual = pendingLikes.some((p) => p.sender_id === profilePreview.user_id)
                  const previewConvoId = inbox.find((i) => i.otherUser?.user_id === profilePreview.user_id)?.id ?? null
                  if (previewConvoId) {
                    return (
                      <button
                        onClick={() => { setProfilePreview(null); router.push(`/chat/${previewConvoId}`) }}
                        className="flex-1 py-3 rounded-xl font-semibold text-sm text-white hover:opacity-90 transition min-h-[44px] flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, #e88))' }}
                      >
                        <MessageSquare size={15} strokeWidth={2} /> Chat
                      </button>
                    )
                  }
                  return (
                    <button
                      onClick={() => { setProfilePreview(null); handleSayHi(profilePreview.user_id) }}
                      disabled={sayingHiTo.has(profilePreview.user_id) || (isSent && !isMutual)}
                      className={`flex-1 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition disabled:opacity-60 min-h-[44px] flex items-center justify-center gap-2 ${
                        isMutual ? 'text-white' : isSent ? 'bg-muted text-muted-foreground border border-border' : 'bg-primary text-primary-foreground'
                      }`}
                      style={isMutual ? { background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, #e88))' } : undefined}
                    >
                      <MessageSquare size={15} strokeWidth={2} />
                      {isMutual ? 'Chat' : isSent ? 'Menunggu...' : 'Say Hi'}
                    </button>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Expired Alert */}
      {sessionExpired && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] px-4">
          <div className="bg-background rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <Coffee size={26} strokeWidth={1.75} className="text-amber-500" />
            </div>
            <h2 className="font-bold text-lg mb-2">Sesi Berakhir</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Sesi kamu di coffee shop ini sudah berakhir. Refresh halaman untuk mulai sesi baru selama 30 menit.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/join')}
                className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition"
              >
                Keluar
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition"
              >
                Refresh Sesi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block List */}
      {blockListOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-[max(24px,env(safe-area-inset-bottom))]" onClick={() => setBlockListOpen(false)}>
          <div className="bg-background rounded-2xl p-6 w-full max-w-sm shadow-xl max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Daftar Blokir</h2>
              <button onClick={() => setBlockListOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition">
                <X size={16} strokeWidth={2} />
              </button>
            </div>
            {blockListLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Memuat...</p>
            ) : blockedUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Ban size={20} strokeWidth={1.75} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Belum ada pengguna yang diblokir</p>
              </div>
            ) : (
              <div className="overflow-y-auto space-y-2">
                {blockedUsers.map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between p-3 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.display_name} avatarUrl={user.avatar_url} isAnonymous={user.is_anonymous} size={36} />
                      <span className="text-sm font-medium">{user.display_name}</span>
                    </div>
                    <button
                      onClick={() => handleUnblock(user.user_id)}
                      className="text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition"
                    >
                      Buka Blokir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Block Confirm */}
      {blockConfirm && menuTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-[max(24px,env(safe-area-inset-bottom))]" onClick={() => { setBlockConfirm(false); setMenuTarget(null) }}>
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
