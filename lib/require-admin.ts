import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function requireAdmin(
  request: NextRequest
): Promise<{ error: NextResponse } | { error: null }> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const supabase = createAdminClient()
  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!adminRow) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  return { error: null }
}
