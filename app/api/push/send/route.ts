import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Only authenticated users can trigger push notifications
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { receiverId, title, body, url, icon } = await request.json()
  if (!receiverId) return NextResponse.json({ error: 'Missing receiverId' }, { status: 400 })

  // Sender can only push to someone they share a conversation with (prevents harassment spam)
  const supabase = createAdminClient()
  const { data: sharedConvo } = await supabase
    .from('conversations')
    .select('id')
    .or(
      `and(user_one_id.eq.${user.id},user_two_id.eq.${receiverId}),` +
      `and(user_one_id.eq.${receiverId},user_two_id.eq.${user.id})`
    )
    .maybeSingle()

  if (!sharedConvo) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!process.env.VAPID_SUBJECT || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ ok: false, reason: 'vapid_not_configured' })
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  const { data } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', receiverId)
    .maybeSingle()

  if (!data?.subscription) return NextResponse.json({ ok: false, reason: 'no_subscription' })

  try {
    await webpush.sendNotification(
      data.subscription as webpush.PushSubscription,
      JSON.stringify({ title, body, url: url || '/', icon: icon || null })
    )
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ ok: false, reason: 'send_failed' })
  }
}
