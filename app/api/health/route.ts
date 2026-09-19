import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()

  try {
    const supabase = createAdminClient()

    // Ping DB dengan query ringan
    const { error } = await supabase
      .from('coffee_shops')
      .select('id')
      .limit(1)

    const latency = Date.now() - start

    if (error) {
      return NextResponse.json({
        status: 'degraded',
        db: 'error',
        error: error.message,
        latency_ms: latency,
        timestamp: new Date().toISOString(),
      }, { status: 503 })
    }

    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      latency_ms: latency,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json({
      status: 'down',
      db: 'unreachable',
      error: String(e),
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    }, { status: 503 })
  }
}
