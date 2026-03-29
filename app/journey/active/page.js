'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useJourney, JOURNEY_STATE } from '@/context/JourneyContext'

export default function JourneyActivePage() {
  const router = useRouter()
  const {
    state, destination, position, distanceToStop, etaMinutes, countdown,
    simMode, endJourney, dismissWarning, dismissAlarm, toggleSimMode,
    completeCurrentLeg, pendingLegs, currentLegIndex, totalLegs, contacts, watchToken,
  } = useJourney()

  useEffect(() => {
    if (state === JOURNEY_STATE.IDLE)     router.replace('/journey/setup')
    if (state === JOURNEY_STATE.MISSED)   router.replace('/missed')
    if (state === JOURNEY_STATE.TRANSFER) router.replace('/journey/transfer')
  }, [state, router])

  if (
    state === JOURNEY_STATE.IDLE ||
    state === JOURNEY_STATE.MISSED ||
    state === JOURNEY_STATE.TRANSFER
  ) return null

  if (state === JOURNEY_STATE.PHASE_1) {
    return <Phase1Screen destination={destination} etaMinutes={etaMinutes} distanceToStop={distanceToStop} dismissWarning={dismissWarning} />
  }
  if (state === JOURNEY_STATE.PHASE_2) {
    return (
      <Phase2Screen
        destination={destination}
        countdown={countdown}
        completeCurrentLeg={completeCurrentLeg}
        contacts={contacts}
      />
    )
  }
  return (
    <MonitoringScreen
      destination={destination}
      position={position}
      distanceToStop={distanceToStop}
      etaMinutes={etaMinutes}
      simMode={simMode}
      endJourney={endJourney}
      toggleSimMode={toggleSimMode}
      currentLegIndex={currentLegIndex}
      totalLegs={totalLegs}
      watchToken={watchToken}
      contacts={contacts}
    />
  )
}

// ─── STATIC MAP URL helper ───────────────────────────────────────────────────
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

function staticMapUrl({ userLat, userLng, destLat, destLng, width = 800, height = 480 }) {
  const base = 'https://maps.googleapis.com/maps/api/staticmap'
  const params = new URLSearchParams({
    size: `${width}x${height}`,
    scale: '2',
    zoom: '14',
    key: MAPS_KEY,
    // grayscale style for editorial look
    style: 'feature:all|element:geometry|color:0xf5f5f5',
  })
  // User marker — black filled circle
  if (userLat && userLng) {
    params.append('markers', `color:0x000000|size:mid|${userLat},${userLng}`)
  }
  // Destination marker — green
  if (destLat && destLng) {
    params.append('markers', `color:0x006e28|size:mid|label:D|${destLat},${destLng}`)
  }
  // Center between both if we have both, otherwise center on what we have
  if (userLat && userLng && destLat && destLng) {
    params.delete('zoom')
    params.append('path', `color:0x00000040|weight:3|${userLat},${userLng}|${destLat},${destLng}`)
  } else if (destLat && destLng) {
    params.set('center', `${destLat},${destLng}`)
  } else if (userLat && userLng) {
    params.set('center', `${userLat},${userLng}`)
  }
  return `${base}?${params.toString()}`
}

// ─── MONITORING — Safe to sleep ─────────────────────────────────────────────
function MonitoringScreen({ destination, position, distanceToStop, etaMinutes, simMode, endJourney, toggleSimMode, currentLegIndex, totalLegs, watchToken, contacts }) {
  const distLabel = distanceToStop !== null
    ? distanceToStop >= 1000 ? `${(distanceToStop / 1000).toFixed(1)} km` : `${distanceToStop} m`
    : null

  // Throttle map refreshes — only update when moved >50m or after 30s
  const [mapUrl, setMapUrl] = useState(null)
  const lastMapPositionRef = useRef(null)
  const lastMapTimeRef = useRef(0)

  useEffect(() => {
    const lat = position?.lat
    const lng = position?.lng
    if (!lat && !destination?.lat) return

    const now = Date.now()
    const last = lastMapPositionRef.current
    const movedEnough = !last || Math.hypot(lat - last.lat, lng - last.lng) * 111000 > 50
    const enoughTime = now - lastMapTimeRef.current > 30_000

    if (!movedEnough && !enoughTime && mapUrl) return

    lastMapPositionRef.current = { lat, lng }
    lastMapTimeRef.current = now
    setMapUrl(staticMapUrl({
      userLat: lat,
      userLng: lng,
      destLat: destination?.lat,
      destLng: destination?.lng,
    }))
  }, [position, destination])

  const hasMap = !!(position?.lat || destination?.lat)

  const [smsSent, setSmsSent] = useState(false)
  const [sending, setSending] = useState(false)
  const watchUrl = watchToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/watch/${watchToken}` : null
  const primaryContact = contacts?.[0]

  const sendWatchSMS = async () => {
    if (!primaryContact?.phone || !watchUrl || smsSent) return
    setSending(true)
    try {
      await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: primaryContact.phone,
          userName: '',
          type: 'watch',
          watchUrl,
        }),
      })
      setSmsSent(true)
    } catch {}
    setSending(false)
  }

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-dvh flex flex-col max-w-[430px] mx-auto">

      {/* Header */}
      <header className="w-full sticky top-0 bg-white flex items-center justify-between px-8 py-4 z-50 border-b border-outline-variant/20">
        <button onClick={endJourney} className="hover:bg-surface-container transition-colors active:scale-95 duration-200 p-2 rounded-full">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>close</span>
        </button>
        <h1 className="font-black uppercase tracking-widest text-sm text-primary">NUDGE</h1>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
          <span className="text-[0.625rem] font-bold uppercase tracking-widest text-secondary">Live</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col pb-8">

        {/* Map */}
        {hasMap && (
          <div className="relative w-full bg-surface-container overflow-hidden" style={{ height: '220px' }}>
            <img
              src={mapUrl}
              alt="Live map"
              className="w-full h-full object-cover"
            />
            {/* Overlay pulse dot for user position */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                <div className="absolute -inset-3 bg-secondary-container/40 rounded-full animate-pulse-soft" />
                <div className="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-md relative z-10" />
              </div>
            </div>
            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-surface-container-lowest to-transparent" />
          </div>
        )}

        {/* Info + orb */}
        <div className="flex-1 flex flex-col px-8 pt-5 pb-0 justify-between">

          {/* Timer + destination */}
          <div>
            {totalLegs > 1 && (
              <div className="mb-3">
                <span className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant">
                  Leg {(currentLegIndex ?? 0) + 1} of {totalLegs}
                </span>
              </div>
            )}
            <section className="space-y-0.5 mb-2">
              <p className="font-bold text-[0.75rem] uppercase tracking-widest text-on-surface-variant">Arrival In</p>
              <h2 className="text-[2.75rem] font-black tracking-tighter leading-none text-primary">
                {etaMinutes != null ? `${etaMinutes} min` : distLabel ?? '—'}
              </h2>
              <div className="pt-3">
                <p className="font-bold text-[0.75rem] uppercase tracking-widest text-on-surface-variant mb-0.5">Destination</p>
                <h3 className="text-[1.375rem] font-bold tracking-tight text-primary leading-snug">
                  {destination?.name ?? '—'}
                </h3>
              </div>
            </section>
          </div>

          {/* Orb + status */}
          <section className="flex items-center gap-5 py-4">
            <div className="relative flex items-center justify-center flex-shrink-0">
              <div className="absolute w-20 h-20 bg-secondary-container/30 rounded-full animate-pulse-soft" />
              <div className="relative w-14 h-14 bg-secondary-container rounded-full flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-on-secondary-container" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>
                  notifications_active
                </span>
              </div>
            </div>
            <div>
              <span className="font-bold text-[0.75rem] uppercase tracking-widest text-secondary block mb-0.5">
                Monitoring Active
              </span>
              <p className="text-on-surface-variant text-[0.8125rem] leading-relaxed">
                We'll nudge you 500m from your stop.
              </p>
              {distLabel && (
                <p className="text-[0.75rem] font-bold text-on-surface-variant/60 mt-1">{distLabel} remaining</p>
              )}
            </div>
          </section>

          {/* Send watch link via SMS */}
          {watchUrl && primaryContact?.phone && (
            <button
              onClick={sendWatchSMS}
              disabled={smsSent || sending}
              className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-surface-container active:scale-[0.98] transition-all disabled:opacity-60"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${smsSent ? 'bg-secondary-container' : 'bg-surface-container-high'}`}>
                <span className="material-symbols-outlined text-on-secondary-container" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>
                  {smsSent ? 'check' : 'sms'}
                </span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-[0.875rem] font-bold text-on-surface">
                  {smsSent ? `Link sent to ${primaryContact.name}` : sending ? 'Sending…' : `Send tracking link to ${primaryContact.name}`}
                </p>
                <p className="text-[0.75rem] text-on-surface-variant">
                  {smsSent ? 'They can watch your journey live' : "They'll get a link to watch your location"}
                </p>
              </div>
              {!smsSent && <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>chevron_right</span>}
            </button>
          )}

          {/* Bottom CTA */}
          <div className="space-y-3 pt-2">
            {simMode && (
              <button onClick={toggleSimMode} className="w-full text-[0.75rem] text-on-surface-variant uppercase tracking-widest font-bold py-2 px-4 rounded-full bg-surface-container active:scale-95 transition-all text-center">
                Sim: ON — tap to toggle
              </button>
            )}
            <button
              onClick={endJourney}
              className="w-full h-[56px] rounded-full bg-primary text-white font-bold text-[1rem] active:scale-[0.97] transition-all"
            >
              End Journey Early
            </button>
            {!simMode && (
              <button onClick={toggleSimMode} className="w-full text-center text-[0.75rem] text-outline py-1 active:text-on-surface-variant transition-colors">
                Enable sim mode
              </button>
            )}
          </div>

        </div>

      </main>

    </div>
  )
}

// ─── PHASE 1 — Wake Up Warning ───────────────────────────────────────────────
function Phase1Screen({ destination, etaMinutes, distanceToStop, dismissWarning }) {
  return (
    <div className="bg-surface-container-low text-on-surface min-h-dvh flex flex-col items-center justify-between max-w-[430px] mx-auto overflow-hidden">

      {/* Header */}
      <header className="bg-white text-primary font-black tracking-tighter uppercase text-xl w-full flex justify-between items-center px-6 py-7">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          <span className="tracking-tighter font-black">EMERGENCY ALERT</span>
        </div>
      </header>

      {/* Bell */}
      <main className="flex-1 flex flex-col items-center justify-center w-full px-10 text-center">
        <div className="mb-10 bell-animation">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '100px', fontVariationSettings: "'FILL' 1" }}>
            notifications_active
          </span>
        </div>

        <div className="space-y-4 mb-16">
          <h1 className="text-primary font-black text-5xl tracking-tighter">
            Are you awake?
          </h1>
          <p className="text-on-surface-variant text-[1.125rem] leading-relaxed max-w-[260px] mx-auto">
            {destination?.name
              ? `Your stop (${destination.name}) is ${etaMinutes != null ? `in ${etaMinutes} min` : 'approaching'}.`
              : 'Tap below or we will sound the full alarm.'}
          </p>
        </div>

        <div className="w-full flex flex-col gap-4 max-w-sm">
          <button
            onClick={dismissWarning}
            className="h-[56px] w-full bg-secondary-container rounded-full flex items-center justify-center active:scale-95 duration-100 shadow-sm"
          >
            <span className="text-on-secondary-container font-black text-lg tracking-tight">I am awake</span>
          </button>
          <button
            onClick={dismissWarning}
            className="h-[56px] w-full bg-primary rounded-full flex items-center justify-center active:scale-95 duration-100"
          >
            <span className="text-white font-black text-lg tracking-tight">Delay 5 mins</span>
          </button>
        </div>
      </main>

      <footer className="pb-12 pt-8 w-full flex justify-center opacity-20">
        <div className="w-16 h-1.5 bg-primary rounded-full" />
      </footer>

    </div>
  )
}

// ─── PHASE 2 — Full Alarm + CAPTCHA ─────────────────────────────────────────
const CAPTCHA_IMAGES = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD26Y4O3jfVjOQHQNjIFjnvMjHxjjI9-IjVZUJNlfKCcgw5N_r4XS91EjETqEBFrRSf__axXqmGJP0qIiQAEEBHfF1bVCO4bHk9',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC8HQxDlJ2Yq7fj9VLhQP5RpM_6JK9bL1LrH8YWxVm4FJ2kCKoJcW0z9d7W8P4N3bA2mJqE5vXkNpR',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBkNpL3tYfWrH7Q4zJxN8vCJOQ5L9HM6pGdTYjIrNuAxJW2QzPcV8S3eDmRhF1BQKu7JqL9vXWpN',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBP7HqQ8fVnK3JT5mYxL2rCzWp9Q1M4bN6vJdRXfHu8LgE3KaPo5sWm1nYjR0FV2BuC9dKxQ7wN',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBHF5kL8mQpR4wT7vY9XzJ3N1bK6dP2nW0cGfSuE5rM8hL2jQoV9xX4mK7tR3YwB1fN6pJ0vC',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCK9L2mP8fR3wN6vX1bY4jQ7t0H5dM2nP9rW3cJ8fB1KuE6vX4mQ2pN7wR0YtL3bF8xK5jV',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBQ3N7fL2mP8vR4wY9jX0K1bH5tM6dN2nP3rW8cJ5fB9KuE1vX7mQ4pN0wR6YtL2bF3xK8jV',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBM5P9fL4mR2wN8vX3bY6jQ1t7H0dM4nP2rW5cJ1fB8KuE3vX9mQ7pN4wR2YtL8bF0xK6jV',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAqP2N8fL5mR4wY3jX6bK0t1H7dM9nP5rW2cJ8fB3KuE7vX1mQ0pN6wR4YtL5bF9xK3jV',
]
const CORRECT_TILES = new Set([0, 2, 6])

function Phase2Screen({ destination, countdown, completeCurrentLeg, contacts }) {
  const [selected, setSelected] = useState(new Set())
  const [solved, setSolved]     = useState(false)
  const [shaking, setShaking]   = useState(false)

  const toggle = (i) => {
    if (solved) return
    setSelected(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const verify = () => {
    const correct = CORRECT_TILES.size === selected.size && [...CORRECT_TILES].every(i => selected.has(i))
    if (correct) {
      setSolved(true)
      setTimeout(() => completeCurrentLeg(), 700)
    } else {
      setShaking(true)
      setSelected(new Set())
      setTimeout(() => setShaking(false), 600)
    }
  }

  const primaryContact = contacts?.[0]

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-dvh flex flex-col max-w-[430px] mx-auto">

      {/* Frosted header */}
      <header className="fixed top-0 w-full max-w-[430px] z-50 bg-white/80 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <span className="font-black tracking-tighter uppercase text-sm text-primary">NUDGE</span>
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>notifications_active</span>
      </header>

      <main className="min-h-dvh flex flex-col items-center justify-between px-8 pt-32 pb-20 text-center">

        {/* Headline */}
        <section className="w-full">
          <h1 className="text-[3.5rem] font-black leading-[0.9] tracking-tighter text-primary uppercase mb-2">
            WAKE UP!
          </h1>
          <p className="font-bold uppercase tracking-widest text-[0.75rem] text-on-surface-variant">
            ALARM ACTIVE
          </p>
        </section>

        {/* Pulsating alarm orb */}
        <section className="relative flex items-center justify-center py-10">
          <div className="absolute w-64 h-64 bg-primary rounded-full pulsate-layer" />
          <div className="absolute w-48 h-48 bg-primary/10 rounded-full animate-ping" />
          <div className="relative w-40 h-40 bg-primary rounded-full flex items-center justify-center z-10">
            <span className="material-symbols-outlined text-white" style={{ fontSize: '68px', fontVariationSettings: "'FILL' 1" }}>
              alarm
            </span>
          </div>
        </section>

        {/* CAPTCHA */}
        <section className={`w-full space-y-6 ${shaking ? 'animate-shake' : ''}`}>
          <div className="space-y-2">
            <p className="text-error font-bold text-[0.9375rem]">
              You have arrived. Audio is playing at maximum volume.
            </p>
            <p className="text-on-surface-variant text-[0.875rem]">
              {solved ? 'Verified — stopping alarm.' : 'Select all squares with traffic lights to dismiss.'}
            </p>
          </div>

          {!solved && (
            <div className="grid grid-cols-3 gap-2 w-full">
              {CAPTCHA_IMAGES.map((src, i) => (
                <button
                  key={i}
                  onClick={() => toggle(i)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all active:scale-95 ${
                    selected.has(i) ? 'border-secondary' : 'border-transparent'
                  }`}
                >
                  <div className="w-full h-full bg-surface-container" style={{ aspectRatio: '1/1' }}>
                    <img src={src} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display='none' }} />
                  </div>
                  {selected.has(i) && (
                    <div className="absolute inset-0 bg-secondary-container/50 flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-secondary-container" style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1, 'wght' 700" }}>check</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col items-center gap-6">
            {!solved && (
              <button
                onClick={verify}
                disabled={selected.size === 0}
                className="w-full max-w-sm h-14 bg-secondary-container text-on-secondary-container rounded-full font-black uppercase tracking-widest text-[0.875rem] active:scale-95 transition-all disabled:opacity-30"
              >
                Verify
              </button>
            )}
            {solved && (
              <div className="w-full max-w-sm h-14 bg-secondary-container rounded-full flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-on-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-on-secondary-container font-black uppercase tracking-wider text-[0.875rem]">Alarm Off</span>
              </div>
            )}
            {primaryContact && (
              <p className="text-[0.8125rem] text-on-surface-variant font-medium">
                {primaryContact.name} is watching your journey
              </p>
            )}
          </div>
        </section>

      </main>

      {/* Decorative texture */}
      <div className="fixed inset-0 pointer-events-none -z-10 opacity-20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary-container rounded-full blur-[120px] -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-surface-container-high rounded-full blur-[80px] -ml-32 -mb-32" />
      </div>

    </div>
  )
}
