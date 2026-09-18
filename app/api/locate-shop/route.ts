import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { calculateDistance } from '@/lib/utils/distance'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lng = parseFloat(searchParams.get('lng') ?? '')

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'invalid_coords' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: shops } = await supabase
    .from('coffee_shops')
    .select('id, name, address, access_token, latitude, longitude, radius_meter')
    .eq('is_active', true)

  if (!shops || shops.length === 0) {
    return NextResponse.json({ error: 'none', count: 0 })
  }

  const matches = shops.filter((shop) =>
    calculateDistance(lat, lng, shop.latitude, shop.longitude) <= shop.radius_meter
  )

  if (matches.length === 0) return NextResponse.json({ error: 'none', count: 0 })
  if (matches.length > 1)   return NextResponse.json({ error: 'ambiguous', count: matches.length })

  return NextResponse.json({ shop: matches[0] })
}
