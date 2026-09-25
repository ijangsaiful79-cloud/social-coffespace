'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Message, Profile } from '@/types'
import { playNotificationSound } from '@/lib/notification-sound'
import { useLocationGuard } from '@/lib/hooks/useLocationGuard'
import LocationExitAlert from '@/components/LocationExitAlert'
import { ArrowLeft, MoreHorizontal, EyeOff, MessageCircle, Send, Flag, Ban, X, Trash2, CheckCheck, AtSign, Music2, Phone } from 'lucide-react'

const REPORT_REASONS = [
  'Spam',
  'Konten tidak pantas',
  'Pelecehan atau intimidasi',
  'Profil palsu',
  'Lainnya',
]

const AVATAR_GRADIENTS = [
  ['#C57A6E', '#D4907A'],  // dusty rose
  ['#b55c6e', '#d98496'],  // dusty rose
  ['#7c6aad', '#a892d4'],  // soft violet
  ['#4a7fc1', '#7aaee8'],  // periwinkle
  ['#2d9e6b', '#5cc99a'],  // sage green
  ['#956b5a', '#c49080'],  // warm mauve
  ['#7a5c8a', '#a885bd'],  // soft plum
]

function getGradient(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}

function Avatar({ name, avatarUrl, isAnonymous, size = 36 }: { name: string; avatarUrl?: string | null; isAnonymous: boolean; size?: number }) {
  if (isAnonymous) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <EyeOff size={Math.round(size * 0.44)} color="#a1a1aa" strokeWidth={1.75} />
      </div>
    )
  }
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  const gradient = getGradient(name)
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.4, flexShrink: 0 }}>
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

interface Props {
  params: Promise<{ id: string }>
}

export default function ChatPage({ params }: Props) {
  const { id: conversationId } = use(params)
  const router = useRouter()

  const [messages, setMessages] = useState<Message[]>([])
  const [otherUser, setOtherUser] = useState<Profile | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [otherUserId, setOtherUserId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [shopContext, setShopContext] = useState<{ name: string; lat: number; lng: number; radius: number; logo_url?: string | null } | null>(null)
  const [locationExitLoading, setLocationExitLoading] = useState(false)

  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDesc, setReportDesc] = useState('')
  const [blockConfirm, setBlockConfirm] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  const { isOutside } = useLocationGuard({
    lat: shopContext?.lat ?? null,
    lng: shopContext?.lng ?? null,
    radiusMeter: shopContext?.radius ?? null,
    enabled: !loading && !!shopContext,
  })

  const bottomRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const currentUserIdRef = useRef<string | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('shopContext')
      if (raw) {
        const ctx = JSON.parse(raw)
        setShopContext({ name: ctx.name, lat: ctx.lat, lng: ctx.lng, radius: ctx.radius, logo_url: ctx.logo_url ?? null })
      }
    } catch {
      // sessionStorage not available or invalid JSON
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    initChat(supabase)
    return () => {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function initChat(supabase: ReturnType<typeof createClient>) {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { router.push('/'); return }

    const uid = auth.user.id
    currentUserIdRef.current = uid
    setCurrentUserId(uid)

    // Register push in background
    registerPush(uid)

    const { data: convo } = await supabase.from('conversations').select('user_one_id, user_two_id').eq('id', conversationId).single()
    if (!convo) { router.push('/'); return }

    const otherUid = convo.user_one_id === uid ? convo.user_two_id : convo.user_one_id
    setOtherUserId(otherUid)

    const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', otherUid).single()
    if (profile) setOtherUser(profile as unknown as Profile)

    const { data: blockRow } = await supabase.from('blocks').select('id').eq('user_id', uid).eq('blocked_user_id', otherUid).maybeSingle()
    if (blockRow) setIsBlocked(true)

    const { data: msgs } = await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true })
    if (msgs) setMessages(msgs)
    setLoading(false)

    // Mark messages as read
    supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('conversation_id', conversationId).neq('sender_id', uid).is('read_at', null).then(() => {})

    channelRef.current = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as Message
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          if (msg.sender_id !== currentUserIdRef.current) {
            playNotificationSound()
            supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id).then(() => {})
          }
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id
          setMessages((prev) => prev.filter((m) => m.id !== deletedId))
        }
      )
      .subscribe()
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleLocationExit() {
    setLocationExitLoading(true)
    const supabase = createClient()
    if (currentUserId) {
      const raw = sessionStorage.getItem('shopContext')
      const ctx = raw ? JSON.parse(raw) : null
      if (ctx?.id) {
        await supabase.from('coffee_shop_sessions')
          .update({ status: 'left' })
          .eq('user_id', currentUserId)
          .eq('coffee_shop_id', ctx.id)
          .eq('status', 'active')
      }
    }
    sessionStorage.removeItem('shopContext')
    router.push('/')
  }

  function handleLongPressStart(msgId: string, isOwn: boolean) {
    if (!isOwn) return
    longPressTimer.current = setTimeout(() => setDeleteTargetId(msgId), 500)
  }

  function handleLongPressEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  async function deleteMessage() {
    if (!deleteTargetId) return
    const targetId = deleteTargetId
    setDeleteTargetId(null)
    const previous = messages
    setMessages((prev) => prev.filter((m) => m.id !== targetId))
    const supabase = createClient()
    const { error } = await supabase.from('messages').delete().eq('id', targetId)
    if (error) {
      showToast('Gagal hapus pesan. Coba lagi.')
      setMessages(previous)
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !currentUserId || sending) return

    const messageText = text.trim()
    setText('')
    setSending(true)
    inputRef.current?.focus()

    const supabase = createClient()
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      message: messageText,
    })

    if (error) {
      showToast('Gagal kirim pesan.')
      setText(messageText)
      setSending(false)
      return
    }

    setSending(false)

    // Send push notification to the other user
    if (otherUserId) {
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: otherUserId,
          title: `Pesan baru`,
          body: messageText.length > 60 ? messageText.slice(0, 60) + '...' : messageText,
          url: `/chat/${conversationId}`,
          icon: shopContext?.logo_url || undefined,
        }),
      }).catch(() => {})
    }
  }

  async function handleBlock() {
    if (!currentUserId || !otherUser) return
    setActionLoading(true)
    const supabase = createClient()
    await supabase.from('blocks').insert({ user_id: currentUserId, blocked_user_id: otherUser.user_id })
    setActionLoading(false)
    setBlockConfirm(false)
    showToast('Pengguna telah diblokir')
    setTimeout(() => router.push('/'), 1500)
  }

  async function handleReport(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUserId || !otherUser || !reportReason) return
    setActionLoading(true)
    const supabase = createClient()
    await supabase.from('reports').insert({ reporter_id: currentUserId, reported_user_id: otherUser.user_id, reason: reportReason, description: reportDesc.trim() || null })
    setReportOpen(false)
    setReportReason('')
    setReportDesc('')
    setActionLoading(false)
    showToast('Laporan berhasil dikirim')
  }

  if (loading) {
    return (
      <main className="flex flex-col h-[100dvh] max-w-lg mx-auto">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card shrink-0">
          <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
          <div className="space-y-1.5">
            <div className="w-24 h-3 bg-muted rounded animate-pulse" />
            <div className="w-16 h-2.5 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="flex-1 px-4 py-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div className={`h-9 rounded-2xl bg-muted animate-pulse ${i % 2 === 0 ? 'w-40' : 'w-52'}`} />
            </div>
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col h-[100dvh] max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 border-b border-border bg-card shrink-0" style={{ boxShadow: '0 1px 4px 0 rgba(0,0,0,0.05)', paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: 12 }}>
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition shrink-0">
          <ArrowLeft size={18} strokeWidth={2} />
        </button>
        <button
          onClick={() => { if (!otherUser?.is_anonymous) setProfileOpen(true) }}
          className={`flex items-center gap-3 flex-1 min-w-0 text-left ${!otherUser?.is_anonymous ? 'active:opacity-70 transition-opacity' : ''}`}
        >
          <Avatar name={otherUser?.display_name ?? '?'} avatarUrl={otherUser?.avatar_url} isAnonymous={otherUser?.is_anonymous ?? true} size={38} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{otherUser?.display_name}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              {otherUser?.is_anonymous
                ? <><EyeOff size={10} strokeWidth={2} />Mode anonim</>
                : <span className="text-primary/70 font-medium">Tap untuk lihat profil</span>
              }
            </p>
          </div>
        </button>
        <button onClick={() => setMenuOpen(true)} className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition shrink-0">
          <MoreHorizontal size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scroll-touch">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <MessageCircle size={26} strokeWidth={1.5} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Mulai percakapan dengan {otherUser?.display_name}</p>
            <p className="text-xs text-muted-foreground mt-1">Pesan pertama kamu adalah awal dari sesuatu yang menarik</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.sender_id === currentUserId
          const prevMsg = messages[i - 1]
          const showAvatar = !isOwn && (!prevMsg || prevMsg.sender_id !== msg.sender_id)
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {!isOwn && (
                <div style={{ width: 28, flexShrink: 0 }}>
                  {showAvatar && <Avatar name={otherUser?.display_name ?? '?'} avatarUrl={otherUser?.avatar_url} isAnonymous={otherUser?.is_anonymous ?? true} size={28} />}
                </div>
              )}
              <div
                className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed select-none ${
                  isOwn
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card border border-border rounded-bl-sm'
                }`}
                onTouchStart={() => handleLongPressStart(msg.id, isOwn)}
                onTouchEnd={handleLongPressEnd}
                onTouchMove={handleLongPressEnd}
                onContextMenu={(e) => { if (isOwn) { e.preventDefault(); setDeleteTargetId(msg.id) } }}
              >
                {msg.message}
                <div className={`text-[10px] mt-1 ${isOwn ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('id', { hour: '2-digit', minute: '2-digit' })}
                  {isOwn && msg.read_at && <CheckCheck size={11} strokeWidth={2.5} className="inline ml-1 opacity-80" />}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {isBlocked ? (
        <div className="px-4 py-4 border-t border-border bg-card shrink-0 flex items-center justify-center gap-2"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <Ban size={14} strokeWidth={2} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Kamu telah memblokir pengguna ini</p>
        </div>
      ) : (
        <form onSubmit={sendMessage}
          className="flex items-center gap-2 px-4 pt-3 border-t border-border bg-card shrink-0"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ketik pesan..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
            style={{ fontSize: 16 }}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="w-11 h-11 rounded-xl flex items-center justify-center bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition disabled:opacity-40 shrink-0"
          >
            <Send size={16} strokeWidth={2} className={sending ? 'opacity-50' : ''} />
          </button>
        </form>
      )}

      {/* Action Sheet */}
      {menuOpen && !reportOpen && !blockConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-6" onClick={() => setMenuOpen(false)}>
          <div className="bg-background rounded-2xl w-full max-w-sm shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <Avatar name={otherUser?.display_name ?? '?'} avatarUrl={otherUser?.avatar_url} isAnonymous={otherUser?.is_anonymous ?? true} size={36} />
              <div>
                <p className="font-semibold">{otherUser?.display_name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">{otherUser?.is_anonymous ? <><EyeOff size={11} strokeWidth={2} />Mode anonim</> : 'Profil lengkap'}</p>
              </div>
            </div>
            <button onClick={() => { setReportOpen(true); setMenuOpen(false) }} className="w-full px-5 py-4 text-left text-sm font-medium hover:bg-muted transition flex items-center gap-3 min-h-[52px]">
              <Flag size={17} strokeWidth={1.75} className="text-primary" /><span>Laporkan pengguna ini</span>
            </button>
            <button onClick={() => { setBlockConfirm(true); setMenuOpen(false) }} className="w-full px-5 py-4 text-left text-sm font-medium text-red-500 hover:bg-red-50 transition flex items-center gap-3 border-t border-border min-h-[52px]">
              <Ban size={17} strokeWidth={1.75} /><span>Blokir pengguna ini</span>
            </button>
            <button onClick={() => setMenuOpen(false)} className="w-full px-5 py-4 text-left text-sm text-muted-foreground hover:bg-muted transition border-t border-border flex items-center gap-3 min-h-[52px]">
              <X size={16} strokeWidth={2} />Batal
            </button>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-6" onClick={() => setReportOpen(false)}>
          <div className="bg-background rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-1">Laporkan Pengguna</h2>
            <p className="text-sm text-muted-foreground mb-4">Laporan kamu bersifat anonim.</p>
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
                <button type="button" onClick={() => setReportOpen(false)} className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition">Batal</button>
                <button type="submit" disabled={!reportReason || actionLoading} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition disabled:opacity-40">
                  {actionLoading ? 'Mengirim...' : 'Kirim Laporan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block Confirm */}
      {blockConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-6" onClick={() => setBlockConfirm(false)}>
          <div className="bg-background rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-1">Blokir {otherUser?.display_name}?</h2>
            <p className="text-sm text-muted-foreground mb-6">Kamu akan keluar dari percakapan ini dan mereka tidak bisa menghubungi kamu lagi.</p>
            <div className="flex gap-3">
              <button onClick={() => setBlockConfirm(false)} className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition">Batal</button>
              <button onClick={handleBlock} disabled={actionLoading} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition disabled:opacity-40">
                {actionLoading ? 'Memblokir...' : 'Blokir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 px-4 pb-6" onClick={() => setDeleteTargetId(null)}>
          <div className="bg-background rounded-2xl w-full max-w-sm shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-muted-foreground text-center pt-4 pb-2 px-5">Hapus pesan ini?</p>
            <div className="border-t border-border">
              <button onClick={deleteMessage} className="w-full px-5 py-4 text-sm font-semibold text-red-500 hover:bg-red-50 transition">
                Hapus
              </button>
              <button onClick={() => setDeleteTargetId(null)} className="w-full px-5 py-4 text-sm text-muted-foreground hover:bg-muted transition border-t border-border">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {isOutside && shopContext && (
        <LocationExitAlert
          shopName={shopContext.name}
          onExit={handleLocationExit}
          loading={locationExitLoading}
        />
      )}

      {/* Profile Sheet */}
      {profileOpen && otherUser && !otherUser.is_anonymous && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-6" onClick={() => setProfileOpen(false)}>
          <div className="bg-background rounded-2xl w-full max-w-sm shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <h2 className="font-bold text-base">Profil</h2>
              <button onClick={() => setProfileOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition">
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>

            {/* Avatar + name */}
            <div className="flex items-center gap-4 px-5 pb-4">
              <Avatar name={otherUser.display_name} avatarUrl={otherUser.avatar_url} isAnonymous={false} size={56} />
              <div>
                <p className="font-bold text-base leading-tight">{otherUser.display_name}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {[otherUser.age ? `${otherUser.age} yo` : null, otherUser.gender === 'male' ? 'Laki-laki' : otherUser.gender === 'female' ? 'Perempuan' : otherUser.gender === 'other' ? 'Lainnya' : null].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>

            {/* Bio */}
            {otherUser.bio && (
              <div className="mx-5 mb-4 px-4 py-3 rounded-xl bg-muted">
                <p className="text-sm text-foreground leading-relaxed">{otherUser.bio}</p>
              </div>
            )}

            {/* Interests */}
            {otherUser.interests && otherUser.interests.length > 0 && (
              <div className="px-5 mb-4">
                <div className="flex flex-wrap gap-2">
                  {otherUser.interests.map((interest) => (
                    <span key={interest} className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium border border-border">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Social links */}
            {(otherUser.instagram || otherUser.tiktok || otherUser.whatsapp) && (
              <div className="border-t border-border mx-5 pt-4 mb-5 flex flex-col gap-2">
                {otherUser.instagram && (
                  <a href={`https://instagram.com/${otherUser.instagram}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted hover:bg-secondary transition active:scale-[0.98]">
                    <AtSign size={16} strokeWidth={2} className="text-pink-500 shrink-0" />
                    <span className="text-sm font-medium">@{otherUser.instagram}</span>
                  </a>
                )}
                {otherUser.tiktok && (
                  <a href={`https://tiktok.com/@${otherUser.tiktok}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted hover:bg-secondary transition active:scale-[0.98]">
                    <Music2 size={16} strokeWidth={2} className="text-foreground shrink-0" />
                    <span className="text-sm font-medium">@{otherUser.tiktok}</span>
                  </a>
                )}
                {otherUser.whatsapp && (
                  <a href={`https://wa.me/${otherUser.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted hover:bg-secondary transition active:scale-[0.98]">
                    <Phone size={16} strokeWidth={2} className="text-green-500 shrink-0" />
                    <span className="text-sm font-medium">{otherUser.whatsapp}</span>
                  </a>
                )}
              </div>
            )}

            {!otherUser.instagram && !otherUser.tiktok && !otherUser.whatsapp && !otherUser.bio && (
              <p className="text-xs text-muted-foreground text-center pb-5 px-5">Belum ada info tambahan di profil ini.</p>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-sm font-medium px-5 py-3 rounded-2xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </main>
  )
}
