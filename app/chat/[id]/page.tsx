'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Message, Profile } from '@/types'

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

    // Get conversation participants
    const { data: convo } = await supabase
      .from('conversations')
      .select('user_one_id, user_two_id')
      .eq('id', conversationId)
      .single()

    if (!convo) { router.push('/people'); return }

    const otherUid = convo.user_one_id === uid ? convo.user_two_id : convo.user_one_id

    // Fetch other user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', otherUid)
      .single()

    if (profile) setOtherUser(profile as unknown as Profile)

    // Load messages
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (msgs) setMessages(msgs)
    setLoading(false)

    // Mark as read
    supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', uid)
      .is('read_at', null)
      .then(() => {})

    // Realtime — store ref for cleanup
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

  if (loading) {
    return (
      <main className="flex flex-col h-[100dvh] max-w-lg mx-auto">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card shrink-0">
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          <div className="space-y-1.5">
            <div className="w-24 h-3 bg-muted rounded animate-pulse" />
            <div className="w-16 h-2.5 bg-muted rounded animate-pulse" />
          </div>
        </div>
        {/* Messages skeleton */}
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
            : otherUser?.display_name[0].toUpperCase()
          }
        </div>
        <div>
          <p className="font-semibold text-sm">{otherUser?.display_name}</p>
          {!otherUser?.is_anonymous && otherUser?.age && (
            <p className="text-xs text-muted-foreground">{otherUser.age} yo</p>
          )}
        </div>
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
    </main>
  )
}
