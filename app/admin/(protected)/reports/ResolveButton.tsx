'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResolveButton({ reportId }: { reportId: string }) {
  const router = useRouter()

  async function resolve() {
    const supabase = createClient()
    await supabase
      .from('reports')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', reportId)
    router.refresh()
  }

  return (
    <button
      onClick={resolve}
      className="px-3 py-1 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition"
    >
      Resolve
    </button>
  )
}
