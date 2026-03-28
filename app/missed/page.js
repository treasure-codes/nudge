'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useJourney, JOURNEY_STATE } from '@/context/JourneyContext'

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

export default function MissedPage() {
  const router = useRouter()
  const { state, destination, position, contacts, confirmSafe, smsSent } = useJourney()
  const [broadcastCountdown, setBroadcastCountdown] = useState(900) // 15 min

  useEffect(() => {
    if (state === JOURNEY_STATE.IDLE) router.replace('/')
  }, [state, router])

  // Broadcast countdown
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

  const staticMapUrl = lat && lng && MAPS_KEY
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&markers=color:black%7Clabel:!%7C${lat},${lng}&style=feature:all%7Celement:labels.text.fill%7Ccolor:0x000000&style=feature:all%7Celement:geometry%7Ccolor:0xf5f5f5&key=${MAPS_KEY}`
    : null

  const mapsLink = lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : null

  const minsLeft = Math.floor(broadcastCountdown / 60)
  const secsLeft = broadcastCountdown % 60

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white w-full pt-12 pb-4 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={confirmSafe}
            className="active:scale-95 duration-200 inline-flex"
          >
            <span className="material-symbols-outlined text-black">close</span>
          </button>
          <h1 className="font-bold text-[2.0rem] tracking-tight text-black">Alert</h1>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow px-8 pt-10 flex flex-col items-start max-w-lg mx-auto w-full">
        {/* Status */}
        <div className="mb-10 flex items-center gap-3">
          <div className="w-3 h-3 bg-error rounded-full animate-pulse" />
          <span className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant">
            Live Broadcast Active
          </span>
        </div>

        {/* Headline */}
        <h2 className="text-[3.5rem] font-black leading-[1.1] tracking-tighter text-primary mb-8">
          You missed your stop.
        </h2>

        {/* Subheading */}
        <p className="text-[1.125rem] leading-relaxed text-on-surface-variant font-medium mb-12">
          {smsSent && primaryContact
            ? `Your emergency contact (${primaryContact.name}) has been notified of your location.`
            : 'Notifying your emergency contact now\u2026'}
        </p>

        {/* Location */}
        <section className="w-full mb-12">
          <div className="flex flex-col gap-2 mb-6">
            <span className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant">
              Current Location
            </span>
            <div className="flex items-start gap-4">
              <span
                className="material-symbols-outlined text-primary mt-1"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                location_on
              </span>
              <p className="text-[1.25rem] font-bold text-primary leading-snug">
                {lat && lng
                  ? `${lat.toFixed(4)}\u00b0 N, ${Math.abs(lng).toFixed(4)}\u00b0 W`
                  : 'Getting location\u2026'}
              </p>
            </div>
          </div>

          {/* Map */}
          <div className="h-48 w-full bg-surface-container rounded-lg overflow-hidden relative">
            {staticMapUrl ? (
              <img
                src={staticMapUrl}
                alt="Current location map"
                className="w-full h-full object-cover grayscale opacity-70"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface-container">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant">map</span>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-primary rounded-full border-4 border-white shadow-lg" />
            </div>
          </div>

          {mapsLink && (
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-2 text-sm font-bold text-secondary"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>open_in_new</span>
              Open in Google Maps
            </a>
          )}
        </section>

        {/* CTA */}
        <div className="w-full pb-12">
          <button
            onClick={confirmSafe}
            className="w-full h-[56px] bg-primary text-white rounded-full font-bold text-[1rem] active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-zinc-800"
          >
            <span
              className="material-symbols-outlined text-white"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            I am safe. Stop broadcasting.
          </button>
          <p className="text-center mt-6 text-[0.875rem] text-on-surface-variant font-medium">
            Broadcast ends in {minsLeft}:{String(secsLeft).padStart(2, '0')}
          </p>
        </div>
      </main>
    </div>
  )
}
