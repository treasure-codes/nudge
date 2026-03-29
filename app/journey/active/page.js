'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useJourney, JOURNEY_STATE } from '@/context/JourneyContext'
import { haversine } from '@/lib/haversine'

export default function JourneyActivePage() {
  const router = useRouter()
  const {
    state, destination, position, distanceToStop, apiDistance, etaMinutes, routeSteps,
    simMode, endJourney, dismissWarning, toggleSimMode, triggerMissed,
    completeCurrentLeg, pendingLegs, currentLegIndex, totalLegs, contacts, watchToken,
    atPenultimateStop, setPenultimateReached,
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
    return <Phase1Screen destination={destination} etaMinutes={etaMinutes} dismissWarning={dismissWarning} atPenultimateStop={atPenultimateStop} simMode={simMode} triggerMissed={triggerMissed} />
  }
  if (state === JOURNEY_STATE.PHASE_2) {
    return (
      <Phase2Screen
        completeCurrentLeg={completeCurrentLeg}
        triggerMissed={triggerMissed}
        contacts={contacts}
        simMode={simMode}
      />
    )
  }
  return (
    <MonitoringScreen
      destination={destination}
      position={position}
      distanceToStop={distanceToStop}
      apiDistance={apiDistance}
      etaMinutes={etaMinutes}
      routeSteps={routeSteps}
      pendingLegs={pendingLegs}
      simMode={simMode}
      endJourney={endJourney}
      toggleSimMode={toggleSimMode}
      currentLegIndex={currentLegIndex}
      totalLegs={totalLegs}
      watchToken={watchToken}
      contacts={contacts}
      onPenultimateStop={setPenultimateReached}
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
    style: 'feature:all|element:geometry|color:0xf5f5f5',
  })
  if (userLat && userLng) {
    params.append('markers', `color:0x000000|size:mid|${userLat},${userLng}`)
  }
  if (destLat && destLng) {
    params.append('markers', `color:0x006e28|size:mid|label:D|${destLat},${destLng}`)
  }
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
function MonitoringScreen({
  destination, position, distanceToStop, apiDistance, etaMinutes,
  routeSteps, pendingLegs, simMode, endJourney, toggleSimMode,
  currentLegIndex, totalLegs, watchToken, contacts, onPenultimateStop,
}) {
  const displayDist = simMode ? distanceToStop : (apiDistance ?? distanceToStop)
  const distLabel = displayDist !== null
    ? displayDist >= 1000 ? `${(displayDist / 1000).toFixed(1)} km` : `${Math.round(displayDist)} m`
    : null

  // Throttle map refreshes
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
      userLat: lat, userLng: lng,
      destLat: destination?.lat, destLng: destination?.lng,
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
        <div className="flex items-center gap-2">
          {simMode && (
            <button onClick={toggleSimMode} className="text-[0.6rem] font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container px-2 py-1 rounded-full active:scale-95 transition-all">
              SIM
            </button>
          )}
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            <span className="text-[0.625rem] font-bold uppercase tracking-widest text-secondary">Live</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col pb-8">

        {/* Map */}
        {hasMap && (
          <div className="relative w-full bg-surface-container overflow-hidden" style={{ height: '200px' }}>
            <img src={mapUrl} alt="Live map" className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                <div className="absolute -inset-3 bg-secondary-container/40 rounded-full animate-pulse-soft" />
                <div className="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-md relative z-10" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-surface-container-lowest to-transparent" />
          </div>
        )}

        <div className="flex-1 flex flex-col px-8 pt-5 pb-0 justify-between">

          {/* ETA + next stop header */}
          <div>
            {totalLegs > 1 && (
              <div className="mb-2">
                <span className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant">
                  Leg {(currentLegIndex ?? 0) + 1} of {totalLegs}
                </span>
              </div>
            )}
            <section className="space-y-0.5 mb-4">
              <p className="font-bold text-[0.75rem] uppercase tracking-widest text-on-surface-variant">Arrival In</p>
              <h2 className="text-[2.75rem] font-black tracking-tighter leading-none text-primary">
                {etaMinutes != null
                  ? etaMinutes <= 0 ? 'Arriving' : `${etaMinutes} min`
                  : distLabel ?? '—'}
              </h2>
              <div className="pt-2">
                <p className="font-bold text-[0.75rem] uppercase tracking-widest text-on-surface-variant mb-0.5">Next Stop</p>
                <h3 className="text-[1.375rem] font-bold tracking-tight text-primary leading-snug">
                  {destination?.name ?? '—'}
                </h3>
              </div>
            </section>
          </div>

          {/* Bus route timeline */}
          <BusRouteTimeline
            routeSteps={routeSteps}
            destination={destination}
            pendingLegs={pendingLegs}
            position={position}
            distanceToStop={distanceToStop}
            simMode={simMode}
            onPenultimateStop={onPenultimateStop}
          />

          {/* Send watch link via SMS */}
          {watchUrl && primaryContact?.phone && (
            <button
              onClick={sendWatchSMS}
              disabled={smsSent || sending}
              className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-surface-container active:scale-[0.98] transition-all disabled:opacity-60 mb-3"
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
          <div className="space-y-3 pt-1">
            <button
              onClick={endJourney}
              className="w-full h-[56px] rounded-full bg-primary text-white font-bold text-[1rem] active:scale-[0.97] transition-all"
            >
              End Journey Early
            </button>
            <button onClick={toggleSimMode} className="w-full text-center text-[0.75rem] text-outline py-1 active:text-on-surface-variant transition-colors">
              {simMode ? 'Disable sim mode' : 'Enable sim mode'}
            </button>
          </div>

        </div>
      </main>
    </div>
  )
}

// ─── BUS ROUTE TIMELINE ──────────────────────────────────────────────────────
function BusRouteTimeline({ routeSteps, destination, pendingLegs, position, distanceToStop, simMode, onPenultimateStop }) {

  // When routeSteps is empty, fall back to nearby WeGo stops around the destination
  const [fallbackStops, setFallbackStops] = useState([])
  useEffect(() => {
    if (routeSteps?.length > 0 || !destination?.lat || !destination?.lng) return
    fetch(`/api/wego-stops?lat=${destination.lat}&lng=${destination.lng}&count=6`)
      .then(r => r.json())
      .then(data => { if (data.stops?.length) setFallbackStops(data.stops) })
      .catch(() => {})
  }, [routeSteps?.length, destination?.lat, destination?.lng])

  // Build the full ordered stop list
  const allStops = useMemo(() => {
    const steps = routeSteps?.length > 0
      ? routeSteps
      : fallbackStops.length > 0
        ? fallbackStops
        : destination
          ? [{ id: 'dest', name: destination.name, lat: destination.lat, lng: destination.lng, type: 'alighting' }]
          : []

    const future = (pendingLegs ?? []).map((leg, i) => ({
      id: `pending-${i}`,
      name: leg.name,
      lat: leg.lat,
      lng: leg.lng,
      type: i === (pendingLegs.length - 1) ? 'alighting' : 'transfer',
      isFuture: true,
    }))

    return [...steps, ...future]
  }, [routeSteps, destination, pendingLegs])

  // ── Forward-only active stop tracking ────────────────────────────────────
  // Never jump backward — only advance when user is closer to the next stop
  // than the current one. Resets to 0 when the route changes.
  const [activeIdx, setActiveIdx] = useState(0)
  const activeIdxRef = useRef(0)
  const stopsKeyRef = useRef('')

  useEffect(() => {
    const key = allStops.map(s => s.id ?? s.name).join('|')
    if (key !== stopsKeyRef.current) {
      stopsKeyRef.current = key
      activeIdxRef.current = 0
      setActiveIdx(0)
    }
  }, [allStops])

  useEffect(() => {
    // In sim mode, advance proportionally based on simulated distance
    if (simMode) {
      if (distanceToStop == null) return
      const SIM_START = 3000
      const nonFutureStops = allStops.filter(s => !s.isFuture)
      if (!nonFutureStops.length) return
      const progress = Math.max(0, Math.min(1, (SIM_START - distanceToStop) / SIM_START))
      const targetNFIdx = Math.min(Math.floor(progress * nonFutureStops.length), nonFutureStops.length - 1)
      let nfCount = 0
      for (let i = 0; i < allStops.length; i++) {
        if (!allStops[i].isFuture) {
          if (nfCount === targetNFIdx) {
            const newIdx = Math.max(activeIdxRef.current, i)
            if (newIdx !== activeIdxRef.current) {
              activeIdxRef.current = newIdx
              setActiveIdx(newIdx)
            }
            break
          }
          nfCount++
        }
      }
      return
    }
    if (!position) return

    const cur = allStops[activeIdxRef.current]
    const next = allStops[activeIdxRef.current + 1]
    if (!next || next.isFuture || !next.lat || !next.lng) return
    if (!cur?.lat || !cur?.lng) return

    const distToCur  = haversine(position.lat, position.lng, cur.lat,  cur.lng)
    const distToNext = haversine(position.lat, position.lng, next.lat, next.lng)

    // Advance only when we're closer to the next stop than the current one
    if (distToNext < distToCur) {
      const newIdx = activeIdxRef.current + 1
      activeIdxRef.current = newIdx
      setActiveIdx(newIdx)
    }
  }, [position, simMode, allStops, distanceToStop])

  // Fire once when the stop before the destination becomes active
  const penultimateCalledRef = useRef(false)
  useEffect(() => {
    if (penultimateCalledRef.current) return
    const nonFutureCount = allStops.filter(s => !s.isFuture).length
    if (nonFutureCount < 2) return
    // penultimate = last non-future stop before the alighting stop
    const penultimateIdx = allStops.reduce((found, s, i) =>
      !s.isFuture ? i : found, -1) - 1
    if (penultimateIdx >= 0 && activeIdx >= penultimateIdx) {
      penultimateCalledRef.current = true
      onPenultimateStop?.()
    }
  }, [activeIdx, allStops, onPenultimateStop])

  // Reset when route changes or sim mode is re-enabled
  useEffect(() => { penultimateCalledRef.current = false }, [allStops.length])
  useEffect(() => {
    if (simMode) {
      activeIdxRef.current = 0
      setActiveIdx(0)
      penultimateCalledRef.current = false
    }
  }, [simMode])

  if (!allStops.length) return null

  return (
    <div className="w-full mt-1 mb-4 bg-surface-container rounded-2xl overflow-hidden">

      {/* Section label */}
      <div className="px-4 pt-4 pb-2 border-b border-outline-variant/20">
        <h4 className="font-bold text-[0.75rem] uppercase tracking-widest text-on-surface-variant">
          Your Route
        </h4>
      </div>

      <div className="px-4 pt-3 pb-4">

        {/* Origin row */}
        <div className="flex items-center gap-3 mb-0">
          <div className="w-8 flex flex-col items-center flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-secondary flex-shrink-0" />
            <div className="w-0.5 h-4 bg-primary mt-0.5" />
          </div>
          <span className="text-[0.75rem] font-bold text-secondary uppercase tracking-widest">
            Your location
          </span>
        </div>

        {/* Stop rows */}
        {allStops.map((stop, i) => {
          const isPassed = i < activeIdx
          const isActive = i === activeIdx && !stop.isFuture
          const isLast = i === allStops.length - 1
          const isTransfer = stop.type === 'transfer'
          const isIntermediate = stop.type === 'intermediate'

          // Connector line color: filled up to and including active stop
          const lineColor = isPassed ? 'bg-primary' : isActive ? 'bg-primary' : 'bg-outline-variant/30'

          // Distance label
          const distLabel = (() => {
            if (stop.isFuture) return null
            if (isActive && simMode) {
              if (distanceToStop == null) return null
              return distanceToStop >= 1000
                ? `${(distanceToStop / 1000).toFixed(1)} km`
                : `${Math.round(distanceToStop)} m`
            }
            if (!position || !stop.lat || !stop.lng) return null
            const d = haversine(position.lat, position.lng, stop.lat, stop.lng)
            return d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`
          })()

          return (
            <div key={stop.id ?? i} className="flex items-stretch gap-3">

              {/* Rail column */}
              <div className="w-8 flex flex-col items-center flex-shrink-0">

                {/* Stop dot */}
                <div className="relative flex items-center justify-center flex-shrink-0 my-0.5">
                  {isActive && (
                    <div className="absolute w-9 h-9 bg-primary/10 rounded-full animate-pulse" />
                  )}
                  <div className={`relative z-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isPassed
                      ? 'w-4 h-4 bg-secondary-container'
                      : isActive
                      ? 'w-6 h-6 bg-primary shadow-[0_0_0_3px_rgba(0,110,40,0.15)]'
                      : stop.isFuture
                      ? 'w-3.5 h-3.5 border-2 border-outline-variant/40 bg-surface-container-low'
                      : 'w-3.5 h-3.5 border-2 border-outline-variant/60 bg-white'
                  }`}>
                    {isPassed && (
                      <span className="material-symbols-outlined text-secondary" style={{ fontSize: '10px', fontVariationSettings: "'FILL' 1, 'wght' 700" }}>
                        check
                      </span>
                    )}
                    {isActive && (
                      <span className="material-symbols-outlined text-white" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>
                        directions_bus
                      </span>
                    )}
                  </div>
                </div>

                {/* Connector to next stop */}
                {!isLast && (
                  <div className={`w-0.5 flex-1 min-h-[32px] transition-colors duration-500 ${lineColor}`} />
                )}
              </div>

              {/* Stop info column */}
              <div className={`flex-1 flex items-center justify-between py-2.5 ${!isLast ? 'border-b border-outline-variant/10' : ''}`}>
                <div className="min-w-0 flex-1 pr-2">
                  <span className={`block text-[0.875rem] leading-snug truncate transition-all duration-300 ${
                    isPassed
                      ? 'text-on-surface-variant/40 font-medium'
                      : isActive
                      ? 'font-black text-primary'
                      : stop.isFuture
                      ? 'font-medium text-on-surface-variant/40'
                      : 'font-bold text-on-surface-variant'
                  }`}>
                    {stop.name}
                  </span>
                  {isActive && !isIntermediate && (
                    <span className={`text-[0.6875rem] font-bold uppercase tracking-wider ${isTransfer ? 'text-secondary' : 'text-primary'}`}>
                      {isTransfer ? 'Transfer here' : stop.type === 'boarding' ? 'Board here' : 'Get off here'}
                    </span>
                  )}
                  {stop.isFuture && (
                    <span className="text-[0.6875rem] text-on-surface-variant/30 font-bold uppercase tracking-wider">
                      Next leg
                    </span>
                  )}
                </div>

                <div className="flex-shrink-0 text-right">
                  {isPassed && (
                    <span className="text-[0.625rem] font-bold text-secondary/70 uppercase tracking-wider">Done</span>
                  )}
                  {!isPassed && !stop.isFuture && distLabel && (
                    <span className={`text-[0.75rem] font-bold tabular-nums ${isActive ? 'text-primary' : 'text-on-surface-variant/50'}`}>
                      {distLabel}
                    </span>
                  )}
                </div>
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── PHASE 1 — Wake Up Warning ───────────────────────────────────────────────
function Phase1Screen({ destination, etaMinutes, dismissWarning, atPenultimateStop, simMode, triggerMissed }) {
  return (
    <div className="bg-surface-container-low text-on-surface min-h-dvh flex flex-col items-center justify-between max-w-[430px] mx-auto overflow-hidden">

      <header className="bg-white text-primary font-black tracking-tighter uppercase text-xl w-full flex justify-between items-center px-6 py-7">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          <span className="tracking-tighter font-black">EMERGENCY ALERT</span>
        </div>
      </header>

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
            {atPenultimateStop
              ? `Next stop is yours — request the stop now!`
              : destination?.name
                ? `Your stop (${destination.name}) is ${etaMinutes != null ? `in ${etaMinutes} min` : 'approaching'}.`
                : 'Tap below or we will sound the full alarm.'}
          </p>
          {atPenultimateStop && (
            <p className="text-error font-bold text-[0.875rem]">
              This alarm cannot be snoozed.
            </p>
          )}
        </div>

        <div className="w-full flex flex-col gap-4 max-w-sm">
          <button
            onClick={() => dismissWarning(false)}
            className="h-[56px] w-full bg-primary rounded-full flex items-center justify-center active:scale-95 duration-100 shadow-sm"
          >
            <span className="text-white font-black text-lg tracking-tight">I'm awake — got it</span>
          </button>
          {!atPenultimateStop && (
            <button
              onClick={() => dismissWarning(true)}
              className="h-[56px] w-full bg-secondary-container rounded-full flex items-center justify-center active:scale-95 duration-100"
            >
              <span className="text-on-secondary-container font-black text-lg tracking-tight">1 more minute</span>
            </button>
          )}
          {simMode && (
            <button
              onClick={triggerMissed}
              className="text-[0.75rem] text-on-surface-variant/50 underline underline-offset-2 active:opacity-60 pt-2"
            >
              Simulate: I slept through my stop →
            </button>
          )}
        </div>
      </main>

      <footer className="pb-12 pt-8 w-full flex justify-center opacity-20">
        <div className="w-16 h-1.5 bg-primary rounded-full" />
      </footer>

    </div>
  )
}

// ─── PHASE 2 — Full Alarm + Code Entry ──────────────────────────────────────
function Phase2Screen({ completeCurrentLeg, triggerMissed, contacts, simMode }) {
  const [code]   = useState(() => String(Math.floor(1000 + Math.random() * 9000)))
  const [input,  setInput]  = useState('')
  const [solved, setSolved] = useState(false)
  const [error,  setError]  = useState(false)

  const handleInput = (val) => {
    if (solved) return
    const digits = val.replace(/\D/g, '').slice(0, 4)
    setInput(digits)
    if (digits.length === 4) {
      if (digits === code) {
        setSolved(true)
        setTimeout(() => completeCurrentLeg(), 800)
      } else {
        setError(true)
        setTimeout(() => { setError(false); setInput('') }, 600)
      }
    }
  }

  const primaryContact = contacts?.[0]

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-dvh flex flex-col max-w-[430px] mx-auto">

      <header className="fixed top-0 w-full max-w-[430px] z-50 bg-white/80 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <span className="font-black tracking-tighter uppercase text-sm text-primary">NUDGE</span>
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>notifications_active</span>
      </header>

      <main className="min-h-dvh flex flex-col items-center justify-between px-8 pt-28 pb-20 text-center">

        <section className="w-full">
          <h1 className="text-[3.5rem] font-black leading-[0.9] tracking-tighter text-primary uppercase mb-2">
            You're here!
          </h1>
          <p className="font-bold uppercase tracking-widest text-[0.75rem] text-on-surface-variant">
            Enter the code to confirm you've arrived
          </p>
        </section>

        <section className="relative flex items-center justify-center py-8">
          <div className="absolute w-64 h-64 bg-primary/5 rounded-full" />
          <div className="relative w-40 h-40 bg-primary rounded-full flex items-center justify-center z-10 shadow-[0_0_40px_rgba(0,110,40,0.2)]">
            <span className="material-symbols-outlined text-white" style={{ fontSize: '68px', fontVariationSettings: "'FILL' 1" }}>
              where_to_vote
            </span>
          </div>
        </section>

        <section className="w-full space-y-6">

          <div>
            <p className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant mb-4">
              Type this 4-digit code to confirm arrival
            </p>
            <div className="flex items-center justify-center gap-3">
              {code.split('').map((digit, i) => (
                <div key={i} className="w-14 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-md">
                  <span className="text-[2rem] font-black text-white tabular-nums">{digit}</span>
                </div>
              ))}
            </div>
          </div>

          {!solved ? (
            <div className={`transition-opacity duration-150 ${error ? 'opacity-40' : ''}`}>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={input}
                onChange={e => handleInput(e.target.value)}
                placeholder="_ _ _ _"
                autoFocus
                className={`w-full text-center text-[2.5rem] font-black tracking-[0.3em] bg-transparent border-0 border-b-4 py-3 focus:outline-none transition-colors ${
                  error ? 'border-error text-error' : 'border-primary text-primary'
                } placeholder:text-outline-variant/30`}
              />
              <p className="text-[0.8125rem] text-on-surface-variant mt-3">
                {error ? 'Wrong code — try again' : `${4 - input.length} digit${4 - input.length !== 1 ? 's' : ''} remaining`}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary" style={{ fontSize: '32px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <p className="text-secondary font-black text-[1.125rem]">Alarm off — well done.</p>
            </div>
          )}

          {primaryContact && !solved && (
            <p className="text-[0.8125rem] text-on-surface-variant">
              {primaryContact.name} has been notified of your location
            </p>
          )}

          {simMode && !solved && (
            <button
              onClick={triggerMissed}
              className="text-[0.75rem] text-on-surface-variant/50 underline underline-offset-2 active:opacity-60"
            >
              Simulate: I slept through my stop →
            </button>
          )}

        </section>

      </main>
    </div>
  )
}
