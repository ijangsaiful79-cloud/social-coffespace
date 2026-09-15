import { createAdminClient } from '@/lib/supabase/server'
import ResolveButton from './ResolveButton'

export default async function AdminReportsPage() {
  const supabase = createAdminClient()

  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })

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
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
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
                <td className="px-4 py-3 font-medium">{report.reason}</td>
                <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
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
                    <ResolveButton reportId={report.id} />
                  )}
                </td>
              </tr>
            ))}
            {(!reports || reports.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
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
