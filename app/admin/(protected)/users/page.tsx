import { createAdminClient } from '@/lib/supabase/server'
import { ToggleChatButton, BanUserButton } from './UserActions'

export default async function AdminUsersPage() {
  const supabase = createAdminClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('user_id, display_name, age, gender, chat_enabled, is_anonymous, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users?.length ?? 0} total</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nama</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mode</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usia</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Gender</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Chat</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Bergabung</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => (
              <tr key={user.user_id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{user.display_name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.is_anonymous ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.is_anonymous ? '🕵️ Anonim' : '😊 Lengkap'}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{user.age ?? '-'}</td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{user.gender ?? '-'}</td>
                <td className="px-4 py-3">
                  <ToggleChatButton userId={user.user_id} chatEnabled={user.chat_enabled} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString('id-ID')}
                </td>
                <td className="px-4 py-3">
                  <BanUserButton userId={user.user_id} />
                </td>
              </tr>
            ))}
            {(!users || users.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Belum ada user.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
