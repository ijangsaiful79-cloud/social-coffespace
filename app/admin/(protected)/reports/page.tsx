import { createAdminClient } from '@/lib/supabase/server'
import ResolveButton from './ResolveButton'

export default async function AdminReportsPage() {
  const supabase = createAdminClient()

  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })

  const reportedUserIds = [...new Set((reports ?? []).map((r) => r.reported_user_id).filter(Boolean))]
  const { data: profiles } = reportedUserIds.length > 0
    ? await supabase.from('profiles').select('user_id, display_name').in('user_id', reportedUserIds)
    : { data: [] }

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p.display_name]))
  const pending = reports?.filter(r => r.status === 'pending').length ?? 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          {pending > 0 && (
            <p className="text-sm text-red-500 mt-0.5">{pending} laporan pending</p>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Dilaporkan</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Alasan</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Deskripsi</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tanggal</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {reports?.map((report) => (
              <tr key={report.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">
                  {profileMap[report.reported_user_id] ?? <span className="text-muted-foreground text-xs">User dihapus</span>}
                </td>
                <td className="px-4 py-3 font-medium">{report.reason}</td>
                <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">
                  {report.description ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    report.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : report.status === 'reviewed'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {report.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(report.created_at).toLocaleDateString('id-ID')}
                </td>
                <td className="px-4 py-3">
                  {report.status === 'pending' && (
                    <ResolveButton reportId={report.id} reportedUserId={report.reported_user_id} />
                  )}
                </td>
              </tr>
            ))}
            {(!reports || reports.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Tidak ada laporan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
