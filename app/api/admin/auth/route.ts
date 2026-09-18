import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limiting by IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'

  const limit = checkRateLimit(ip)
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil((limit.retryAfterSeconds ?? 600) / 60)} menit.` },
      {
        status: 429,
        headers: { 'Retry-After': String(limit.retryAfterSeconds ?? 600) },
      }
    )
  }

  const { email, password } = await request.json()

  const successResponse = NextResponse.json({ success: true })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            successResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    return NextResponse.json({ error: 'Email atau password salah.' }, { status: 401 })
  }

  const adminSupabase = createSupabaseClient(
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

  // Login sukses — reset counter IP ini
  resetRateLimit(ip)
  return successResponse
}
