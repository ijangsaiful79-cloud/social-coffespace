'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SessionRedirect() {
  const router = useRouter()

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return

      const { data: session } = await supabase
        .from('coffee_shop_sessions')
        .select('coffee_shop_id')
        .eq('user_id', auth.user.id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      if (session) router.replace(`/people?shop=${session.coffee_shop_id}`)
    }
    check()
  }, [router])

  return null
}
