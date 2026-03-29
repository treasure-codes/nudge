'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useJourney, JOURNEY_STATE } from '@/context/JourneyContext'

export default function MissedPage() {
  const router = useRouter()
  const { state, destination, position, contacts, confirmSafe, smsSent } = useJourney()
  const [broadcastCountdown, setBroadcastCountdown] = useState(900)

  useEffect(() => {
    if (state === JOURNEY_STATE.IDLE) router.replace('/')
  }, [state, router])

  useEffect(() => {
    if (state !== JOURNEY_STATE.MISSED) return
    const t = setInterval(() => {
      setBroadcastCountdown((p) => {
        if (p <= 1) { clearInterval(t); confirmSafe(); return 0 }
        return p - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [state, confirmSafe])

  if (state !== JOURNEY_STATE.MISSED) return null

  const primaryContact = contacts[0]
  const lat = position?.lat ?? destination?.lat
  const lng = position?.lng ?? destination?.lng
  const minsLeft = Math.ceil(broadcastCountdown / 60)

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-dvh flex flex-col max-w-[430px] mx-auto">

      {/* Header */}
      <header className="bg-white w-full pt-14 pb-5 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <button onClick={confirmSafe} className="active:scale-95 transition-transform p-1">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>close</span>
          </button>
          <h1 className="font-bold text-[1.75rem] tracking-tight text-primary">Alert</h1>
        </div>
      </header>

      <main className="flex-1 px-8 pt-10 pb-32 flex flex-col items-start max-w-lg mx-auto w-full">

        {/* Live broadcast indicator */}
        <div className="mb-10 flex items-center gap-3">
          <div className="w-3 h-3 bg-error rounded-full animate-pulse" />
          <span className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant">
            Live Broadcast Active
          </span>
        </div>

        {/* Headline */}
        <h2 className="text-[3.5rem] font-black leading-[1.1] tracking-tighter text-primary mb-6">
          You missed your stop.
        </h2>

        {/* Notification text */}
        <p className="text-[1.125rem] leading-relaxed text-on-surface-variant font-medium mb-14">
          {smsSent && primaryContact
            ? `${primaryContact.name} has been notified of your location.`
            : 'Notifying your emergency contact of your location…'}
        </p>

        {/* Location section */}
        <section className="w-full mb-16">
          <div className="flex flex-col gap-2 mb-6">
            <span className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant">
              Current Location
            </span>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
              <p className="text-[1.25rem] font-bold text-primary leading-snug">
                {destination?.name ?? (lat ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}` : 'Locating…')}
              </p>
            </div>
          </div>

          {/* Map */}
          <div className="h-48 w-full bg-surface-container rounded-xl overflow-hidden relative">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC09txA0gcW30ZXHmo01TyGs6f6iaREcXORBuKgAdomh8YgYxV2sDOI4QPnGaPVJKGKt6VkstmL6URJJhPe4exPRBa1eh1CLNCV9Sp0UHkHRRDYVrs8j6N0m32B3Gha-8mWIqsBo405U26QYq6acR0HYwHHqBbdgAr6yhGUqOlTDJW9z9y_82hBRb6234dGEoO2MTHEnDy5wHEDz47X43aRXRVlBpLHyU8Yfd2XGtBhkm4bk3kX9NkSGKO-vcfxt3nWW7_ufOVMFw4B"
              alt="Map"
              className="w-full h-full object-cover grayscale opacity-60"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-primary rounded-full border-4 border-white shadow-lg" />
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="w-full mt-auto">
          <button
            onClick={confirmSafe}
            className="w-full h-[56px] bg-primary text-white rounded-full font-bold text-[1rem] active:scale-[0.97] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            I am safe. Stop broadcasting.
          </button>
          <p className="text-center mt-5 text-[0.875rem] text-on-surface-variant font-medium">
            Broadcast ends automatically in {minsLeft} minute{minsLeft !== 1 ? 's' : ''}.
          </p>
        </div>

      </main>

    </div>
  )
}
