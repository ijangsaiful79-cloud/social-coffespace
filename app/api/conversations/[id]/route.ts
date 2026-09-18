import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params

  // Verify the requesting user is part of this conversation
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Service role client to bypass RLS
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Ensure user is part of this conversation
  const { data: convo } = await admin
    .from('conversations')
    .select('id, user_one_id, user_two_id')
    .eq('id', conversationId)
    .single()

  if (!convo) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  if (convo.user_one_id !== user.id && convo.user_two_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete messages first, then conversation
  const { error: msgError } = await admin
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId)

  if (msgError) {
    return NextResponse.json({ error: 'Gagal hapus pesan' }, { status: 500 })
  }

  const { error: convoError } = await admin
    .from('conversations')
    .delete()
    .eq('id', conversationId)

  if (convoError) {
    return NextResponse.json({ error: 'Gagal hapus percakapan' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
