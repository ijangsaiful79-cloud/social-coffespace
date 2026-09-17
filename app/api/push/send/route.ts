import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/server'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(request: NextRequest) {
  const { receiverId, title, body, url } = await request.json()
  if (!receiverId) return NextResponse.json({ error: 'Missing receiverId' }, { status: 400 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', receiverId)
    .single()

  if (!data?.subscription) return NextResponse.json({ ok: false, reason: 'no_subscription' })

  try {
    await webpush.sendNotification(
      data.subscription as webpush.PushSubscription,
      JSON.stringify({ title, body, url: url || '/' })
    )
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ ok: false, reason: 'send_failed' })
  }
}
