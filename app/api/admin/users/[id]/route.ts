import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  const { error } = await supabase.from('profiles').update(body).eq('user_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = createAdminClient()

  // Delete profile + end active sessions
  await supabase.from('coffee_shop_sessions').update({ status: 'ended' }).eq('user_id', id)
  const { error } = await supabase.from('profiles').delete().eq('user_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
