import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const body = await request.json()

  const { name, address, latitude, longitude, radius_meter, access_token, slug, logo_url, plan, expires_at, owner_contact } = body

  if (!name || !address || !latitude || !longitude || !access_token) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('coffee_shops')
    .insert({
      name, address, latitude, longitude, radius_meter, access_token, slug,
      logo_url: logo_url ?? null,
      plan: plan ?? 'starter',
      expires_at: expires_at ?? null,
      owner_contact: owner_contact ?? null,
    })
    .select('id, access_token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
