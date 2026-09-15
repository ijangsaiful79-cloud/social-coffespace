'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isWithinRadius } from '@/lib/utils/distance'

interface Shop {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  radius_meter: number
  access_token: string
  is_active: boolean
}

type Step = 'welcome' | 'gps' | 'verifying' | 'failed' | 'auth'

export default function CoffeeShopEntry({ shop }: { shop: Shop }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('welcome')
  const [gpsError, setGpsError] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is already logged in
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        // Already logged in — go straight to GPS
        setStep('gps')
      }
    })
  }, [])

  async function handleGPSVerify() {
    setStep('verifying')
    setGpsError(null)

    if (!navigator.geolocation) {
      setGpsError('Your browser does not support GPS.')
      setStep('failed')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const verified = isWithinRadius(
          latitude,
          longitude,
          shop.latitude,
          shop.longitude,
          shop.radius_meter
        )

        if (!verified) {
          setGpsError(
            `You are too far from ${shop.name}. Please make sure you are inside the coffee shop.`
          )
          setStep('failed')
          return
        }

        // GPS verified — create session
        const supabase = createClient()
        const { data: user } = await supabase.auth.getUser()

        if (!user.user) {
          // Not logged in — redirect to auth with return url
          router.push(`/login?redirect=/c/${shop.access_token}`)
          return
        }

        const now = new Date()
        const expiresAt = new Date(now.getTime() + 30 * 60 * 1000)

        // Check for existing active session
        const { data: existing } = await supabase
          .from('coffee_shop_sessions')
          .select('id')
          .eq('user_id', user.user.id)
          .eq('coffee_shop_id', shop.id)
          .eq('status', 'active')
          .gt('expires_at', now.toISOString())
          .single()

        if (existing) {
          // Refresh existing session
          await supabase
            .from('coffee_shop_sessions')
            .update({
              last_active_at: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              gps_verified: true,
            })
            .eq('id', existing.id)
        } else {
          // Create new session
          await supabase.from('coffee_shop_sessions').insert({
            user_id: user.user.id,
            coffee_shop_id: shop.id,
            joined_at: now.toISOString(),
            last_active_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            gps_verified: true,
            status: 'active',
          })
        }

        router.push(`/people?shop=${shop.id}`)
      },
      (error) => {
        setGpsError(
          error.code === 1
            ? 'GPS permission denied. Please allow location access.'
            : 'Could not get your location. Try again.'
        )
        setStep('failed')
      },
      { timeout: 10000, maximumAge: 0 }
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Shop info */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">☕</div>
          <h1 className="text-2xl font-bold mb-1">{shop.name}</h1>
          <p className="text-sm text-muted-foreground">{shop.address}</p>
        </div>

        {step === 'welcome' && (
          <div className="space-y-4">
            <p className="text-center text-muted-foreground text-sm">
              See who else is here right now and start a conversation.
            </p>
            <button
              onClick={() => setStep('auth')}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
            >
              Join People Here
            </button>
          </div>
        )}

        {step === 'auth' && (
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground mb-2">
              Sign in to continue
            </p>
            <button
              onClick={() => router.push(`/login?redirect=/c/${shop.access_token}`)}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push(`/register?redirect=/c/${shop.access_token}`)}
              className="w-full py-3 rounded-xl border border-border font-semibold hover:bg-muted transition"
            >
              Create Account
            </button>
          </div>
        )}

        {step === 'gps' && (
          <div className="space-y-4">
            <div className="bg-muted rounded-xl p-4 text-center text-sm text-muted-foreground">
              We need to verify you're inside <strong>{shop.name}</strong> before showing you People Here.
            </div>
            <button
              onClick={handleGPSVerify}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
            >
              Verify My Location
            </button>
          </div>
        )}

        {step === 'verifying' && (
          <div className="text-center space-y-3">
            <div className="text-3xl animate-pulse">📍</div>
            <p className="text-muted-foreground text-sm">Checking your location...</p>
          </div>
        )}

        {step === 'failed' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-sm text-red-600">
              {gpsError}
            </div>
            <button
              onClick={() => setStep('gps')}
              className="w-full py-3 rounded-xl border border-border font-semibold hover:bg-muted transition"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
