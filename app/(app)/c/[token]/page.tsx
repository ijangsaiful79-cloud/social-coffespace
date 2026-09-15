import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CoffeeShopEntry from './CoffeeShopEntry'

interface Props {
  params: Promise<{ token: string }>
}

export default async function CoffeeShopPage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()

  const { data: shop } = await supabase
    .from('coffee_shops')
    .select('id, name, address, latitude, longitude, radius_meter, access_token, is_active')
    .eq('access_token', token)
    .eq('is_active', true)
    .single()

  if (!shop) return notFound()

  return <CoffeeShopEntry shop={shop} />
}
