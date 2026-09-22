import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-admin'

interface Params { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const guard = await requireAdmin(request)
  if (guard.error) return guard.error

  const { id } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('coffee_shops').select('*').eq('id', id).single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const guard = await requireAdmin(request)
  if (guard.error) return guard.error

  const { id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  const { error } = await supabase.from('coffee_shops').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const guard = await requireAdmin(request)
  if (guard.error) return guard.error

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase.from('coffee_shops').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
