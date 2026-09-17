'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Message, Profile } from '@/types'

const REPORT_REASONS = [
  'Spam',
  'Konten tidak pantas',
  'Pelecehan atau intimidasi',
  'Profil palsu',
  'Lainnya',
]

interface Props {
  params: Promise<{ id: string }>
}

export default function ChatPage({ params }: Props) {
  const { id: conversationId } = use(params)
  const router = useRouter()

  const [messages, setMessages] = useState<Message[]>([])
  const [otherUser, setOtherUser] = useState<Profile | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)

  // Menu / Report / Block
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDesc, setReportDesc] = useState('')
  const [blockConfirm, setBlockConfirm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    initChat(supabase)

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function initChat(supabase: ReturnType<typeof createClient>) {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { router.push('/'); return }

    const uid = auth.user.id
    setCurrentUserId(uid)

    const { data: convo } = await supabase
      .from('conversations')
      .select('user_one_id, user_two_id')
      .eq('id', conversationId)
      .single()

    if (!convo) { router.push('/people'); return }

    const otherUid = convo.user_one_id === uid ? convo.user_two_id : convo.user_one_id

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', otherUid)
      .single()

    if (profile) setOtherUser(profile as unknown as Profile)

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (msgs) setMessages(msgs)
    setLoading(false)

    supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', uid)
      .is('read_at', null)
      .then(() => {})

    channelRef.current = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !currentUserId) return

    const supabase = createClient()
    const messageText = text.trim()
    setText('')
    inputRef.current?.focus()

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      message: messageText,
    })
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleBlock() {
    if (!currentUserId || !otherUser) return
    setActionLoading(true)
    const supabase = createClient()

    await supabase.from('blocks').insert({
      user_id: currentUserId,
      blocked_user_id: otherUser.user_id,
    })

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

    await supabase.from('reports').insert({
      reporter_id: currentUserId,
      reported_user_id: otherUser.user_id,
      reason: reportReason,
      description: reportDesc.trim() || null,
    })

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
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
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
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card shrink-0">
        <button onClick={() => router.back()} className="text-muted-foreground text-xl leading-none">←</button>
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-primary shrink-0">
          {otherUser?.avatar_url
            ? <img src={otherUser.avatar_url} alt={otherUser.display_name} className="w-full h-full rounded-full object-cover" />
            : otherUser?.display_name?.[0]?.toUpperCase()
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{otherUser?.display_name}</p>
          {!otherUser?.is_anonymous && otherUser?.age && (
            <p className="text-xs text-muted-foreground">{otherUser.age} yo</p>
          )}
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition text-lg shrink-0"
          aria-label="Opsi lainnya"
        >
          •••
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            Kirim pesan pertama kamu 👋
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender_id === currentUserId
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                isOwn
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-card border border-border rounded-bl-sm'
              }`}>
                {msg.message}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex items-center gap-3 px-4 py-4 border-t border-border bg-card shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ketik pesan..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-40"
        >
          Kirim
        </button>
      </form>

      {/* Action Sheet */}
      {menuOpen && !reportOpen && !blockConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-6" onClick={() => setMenuOpen(false)}>
          <div className="bg-background rounded-2xl w-full max-w-sm shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border">
              <p className="font-semibold">{otherUser?.display_name}</p>
              <p className="text-xs text-muted-foreground">{otherUser?.is_anonymous ? 'Mode anonim' : 'Profil lengkap'}</p>
            </div>
            <button
              onClick={() => { setReportOpen(true); setMenuOpen(false) }}
              className="w-full px-5 py-4 text-left text-sm font-medium hover:bg-muted transition flex items-center gap-3"
            >
              <span className="text-lg">🚩</span>
              <span>Laporkan pengguna ini</span>
            </button>
            <button
              onClick={() => { setBlockConfirm(true); setMenuOpen(false) }}
              className="w-full px-5 py-4 text-left text-sm font-medium text-red-500 hover:bg-red-50 transition flex items-center gap-3 border-t border-border"
            >
              <span className="text-lg">🚫</span>
              <span>Blokir pengguna ini</span>
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-full px-5 py-4 text-left text-sm text-muted-foreground hover:bg-muted transition border-t border-border"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-6" onClick={() => setReportOpen(false)}>
          <div className="bg-background rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-1">Laporkan Pengguna</h2>
            <p className="text-sm text-muted-foreground mb-4">Laporan kamu bersifat anonim dan akan ditinjau admin.</p>

            <form onSubmit={handleReport} className="space-y-4">
              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setReportReason(reason)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm text-left transition ${
                      reportReason === reason
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <textarea
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                placeholder="Keterangan tambahan (opsional)"
                rows={2}
                maxLength={300}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition resize-none"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!reportReason || actionLoading}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition disabled:opacity-40"
                >
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
            <p className="text-sm text-muted-foreground mb-6">
              Kamu akan keluar dari percakapan ini dan mereka tidak akan bisa menghubungi kamu lagi.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setBlockConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition"
              >
                Batal
              </button>
              <button
                onClick={handleBlock}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition disabled:opacity-40"
              >
                {actionLoading ? 'Memblokir...' : 'Blokir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-sm font-medium px-5 py-3 rounded-2xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </main>
  )
}
