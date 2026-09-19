import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import AdminSidebar from './AdminSidebar'

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const loginUrl = `/admin/login?key=${process.env.ADMIN_LOGIN_KEY ?? ''}`

  if (!user) redirect(loginUrl)

  const adminSupabase = createAdminClient()
  const { data: adminData } = await adminSupabase
    .from('admin_users')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!adminData) redirect(loginUrl)

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <AdminSidebar />
      <main className="flex-1 p-4 md:p-8 bg-background overflow-auto">
        {children}
      </main>
    </div>
  )
}
