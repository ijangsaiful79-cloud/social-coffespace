'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!shopId) {
      router.push('/')
      return
    }
    loadPeople()
  }, [shopId])

  async function loadPeople() {
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()

    if (!auth.user) {
      router.push('/login')
      return
    }

    setCurrentUserId(auth.user.id)

    // Get shop info
    const { data: shop } = await supabase
      .from('coffee_shops')
      .select('name')
      .eq('id', shopId)
      .single()

    if (shop) setShopName(shop.name)

    // Get active sessions + profiles for this coffee shop (excluding blocks)
    const { data: sessions } = await supabase
      .from('coffee_shop_sessions')
      .select('id, user_id, profiles(*)')
      .eq('coffee_shop_id', shopId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .neq('user_id', auth.user.id)

    if (sessions) {
      const persons = sessions
        .filter((s) => s.profiles)
        .map((s) => ({
          ...(s.profiles as unknown as Profile),
          session_id: s.id,
        }))
      setPeople(persons)
    }

    setLoading(false)
  }

  async function handleSayHi(receiverId: string) {
    const supabase = createClient()

    // Log interaction
    await supabase.from('interactions').insert({
      sender_id: currentUserId,
      receiver_id: receiverId,
      type: 'say_hi',
    })

    // Create or get conversation
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(user_one_id.eq.${currentUserId},user_two_id.eq.${receiverId}),and(user_one_id.eq.${receiverId},user_two_id.eq.${currentUserId})`
      )
      .single()

    if (existing) {
      router.push(`/chat/${existing.id}`)
      return
    }

    const { data: convo } = await supabase
      .from('conversations')
      .insert({ user_one_id: currentUserId, user_two_id: receiverId })
      .select('id')
      .single()

    if (convo) router.push(`/chat/${convo.id}`)
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">People Here</h1>
          <p className="text-sm text-muted-foreground">☕ {shopName}</p>
        </div>
        <Link
          href="/profile/setup"
          className="text-sm text-primary font-medium"
        >
          My Profile
        </Link>
      </div>

      {people.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">☕</div>
          <p className="font-semibold mb-1">You&apos;re the first one here</p>
          <p className="text-sm text-muted-foreground">
            Others will appear here once they join.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {people.map((person) => (
            <div
              key={person.id}
              className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4"
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl font-bold text-primary shrink-0">
                {person.avatar_url ? (
                  <img
                    src={person.avatar_url}
                    alt={person.display_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  person.display_name[0].toUpperCase()
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold truncate">{person.display_name}</p>
                  <span className="text-muted-foreground text-sm">
                    {GENDER_EMOJI[person.gender]}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {person.age} yo{person.bio ? ` · ${person.bio}` : ''}
                </p>
              </div>

              {/* Say Hi */}
              {person.chat_enabled && (
                <button
                  onClick={() => handleSayHi(person.user_id)}
                  className="shrink-0 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
                >
                  Say Hi
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Session timer note */}
      <p className="text-center text-xs text-muted-foreground mt-8">
        Your session expires in 30 minutes. Scan QR again to extend.
      </p>
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
