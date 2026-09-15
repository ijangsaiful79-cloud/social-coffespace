'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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

  useEffect(() => {
    initChat()
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function initChat() {
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()

    if (!auth.user) {
      router.push('/login')
      return
    }

    setCurrentUserId(auth.user.id)

    // Get conversation + other user
    const { data: convo } = await supabase
      .from('conversations')
      .select('*, user_one:user_one_id(profiles(*)), user_two:user_two_id(profiles(*))')
      .eq('id', conversationId)
      .single()

    if (!convo) {
      router.push('/people')
      return
    }

    // Determine other user
    const isUserOne = convo.user_one_id === auth.user.id
    const otherProfile = isUserOne
      ? (convo.user_two as { profiles: Profile }).profiles
      : (convo.user_one as { profiles: Profile }).profiles

    setOtherUser(otherProfile)

    // Load messages
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (msgs) setMessages(msgs)
    setLoading(false)

    // Subscribe to realtime messages
    supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    // Mark messages as read
    supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', auth.user.id)
      .is('read_at', null)
      .then(() => {})
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !currentUserId) return

    const supabase = createClient()
    const messageText = text.trim()
    setText('')

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      message: messageText,
    })
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm animate-pulse">Loading chat...</p>
      </main>
    )
  }

  return (
    <main className="flex flex-col h-[100dvh] max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card shrink-0">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground text-xl"
        >
          ←
        </button>
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-primary">
          {otherUser?.avatar_url ? (
            <img
              src={otherUser.avatar_url}
              alt={otherUser.display_name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            otherUser?.display_name[0].toUpperCase()
          )}
        </div>
        <div>
          <p className="font-semibold text-sm">{otherUser?.display_name}</p>
          <p className="text-xs text-muted-foreground">{otherUser?.age} yo</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            Say hi to start the conversation!
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender_id === currentUserId
          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isOwn
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card border border-border rounded-bl-sm'
                }`}
              >
                {msg.message}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="flex items-center gap-3 px-4 py-4 border-t border-border bg-card shrink-0"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </main>
  )
}
