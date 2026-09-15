import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Login
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    return NextResponse.json({ error: 'Email atau password salah.' }, { status: 401 })
  }

  // Cek admin
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: adminData } = await adminSupabase
    .from('admin_users')
    .select('id')
    .eq('user_id', data.user.id)
    .single()

  if (!adminData) {
    return NextResponse.json({ error: 'Akun ini tidak memiliki akses admin.' }, { status: 403 })
  }

  // Set session cookie
  const response = NextResponse.json({ success: true })
  const { access_token, refresh_token } = data.session

  response.cookies.set('sb-access-token', access_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  response.cookies.set('sb-refresh-token', refresh_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return response
}
