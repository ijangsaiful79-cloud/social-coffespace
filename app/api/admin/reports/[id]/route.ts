import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-admin'

interface Params { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const guard = await requireAdmin(request)
  if (guard.error) return guard.error

  const { id } = await params
  const { action, reported_user_id } = await request.json()
  const supabase = createAdminClient()

  // Always resolve the report
  const { error: reportError } = await supabase
    .from('reports')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', id)

  if (reportError) return NextResponse.json({ error: reportError.message }, { status: 500 })

  if (action === 'disable_chat' && reported_user_id) {
    await supabase.from('profiles').update({ chat_enabled: false }).eq('user_id', reported_user_id)
  }

  if (action === 'delete_user' && reported_user_id) {
    await supabase.from('coffee_shop_sessions').update({ status: 'ended' }).eq('user_id', reported_user_id)
    await supabase.from('profiles').delete().eq('user_id', reported_user_id)
  }

  return NextResponse.json({ success: true })
}
