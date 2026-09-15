'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function adminLogin(email: string, password: string) {
  const supabase = await createClient()

  // Login dulu
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return { error: 'Email atau password salah.' }
  }

  // Cek admin pakai service role (bypass RLS)
  const adminSupabase = createAdminClient()
  const { data: adminData } = await adminSupabase
    .from('admin_users')
    .select('id')
    .eq('user_id', data.user.id)
    .single()

  if (!adminData) {
    await supabase.auth.signOut()
    return { error: 'Akun ini tidak memiliki akses admin.' }
  }

  return { success: true }
}
