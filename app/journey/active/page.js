'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useJourney, JOURNEY_STATE } from '@/context/JourneyContext'
import { haversine } from '@/lib/haversine'

export default function JourneyActivePage() {
  const router = useRouter()
  const {
    state, destination, position, distanceToStop, apiDistance, etaMinutes,
    routeSteps, simMode, endJourney, dismissWarning, toggleSimMode,
    triggerMissed, pendingLegs, currentLegIndex, totalLegs, contacts,
    watchToken, atPenultimateStop, setPenultimateReached,
  } = useJourney()

  useEffect(() => {
    if (state === JOURNEY_STATE.IDLE) router.replace('/journey/setup')
    if (state === JOURNEY_STATE.MISSED) router.replace('/missed')
    if (state === JOURNEY_STATE.TRANSFER) router.replace('/journey/transfer')
  }, [state, router])

  if (
    state === JOURNEY_STATE.IDLE ||
    state === JOURNEY_STATE.MISSED ||
    state === JOURNEY_STATE.TRANSFER
  ) return null

  if (state === JOURNEY_STATE.PHASE_1) {
    const isTransfer = currentLegIndex < totalLegs - 1
    return (
      <Phase1Screen
        destination={destination}
        etaMinutes={etaMinutes}
        dismissWarning={dismissWarning}
        atPenultimateStop={atPenultimateStop}
        simMode={simMode}
        triggerMissed={triggerMissed}
        isTransfer={isTransfer}
      />
    )
  }
  if (state === JOURNEY_STATE.ARRIVED) {
    return <ArrivedScreen destination={destination} />
  }
  if (state === JOURNEY_STATE.SAFE_TRIP) {
    return <SafeTripScreen destination={destination} onPlanAnother={endJourney} />
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

// ─── MONITORING ──────────────────────────────────────────────────────────────
function MonitoringScreen({
  destination, position, distanceToStop, apiDistance, etaMinutes,
  routeSteps, pendingLegs, simMode, endJourney, toggleSimMode,
  currentLegIndex, totalLegs, watchToken, contacts, onPenultimateStop,
}) {
  const [smsSent, setSmsSent] = useState(false)
  const [sending, setSending] = useState(false)
  const primaryContact = contacts?.[0]
  const watchUrl = watchToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/watch/${watchToken}`
    : null

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
    } catch { }
    setSending(false)
  }

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-dvh flex flex-col max-w-[430px] mx-auto">

      {/* Header — minimal */}
      <header className="sticky top-0 bg-surface-container-lowest/95 backdrop-blur-sm flex items-center justify-end px-6 pt-12 pb-4 z-50">
        <div className="flex items-center gap-3">
          {simMode && (
            <button
              onClick={toggleSimMode}
              className="text-[0.625rem] font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full active:scale-95 transition-all"
            >
              Sim
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col px-6 pb-10">

        {/* ── Hero stop count ── */}
        <HeroSection
          routeSteps={routeSteps}
          pendingLegs={pendingLegs}
          position={position}
          distanceToStop={distanceToStop}
          simMode={simMode}
          etaMinutes={etaMinutes}
          destination={destination}
          currentLegIndex={currentLegIndex}
          totalLegs={totalLegs}
        />

        {/* ── Journey rail ── */}
        <JourneyRail
          routeSteps={routeSteps}
          pendingLegs={pendingLegs}
          destination={destination}
          position={position}
          distanceToStop={distanceToStop}
          simMode={simMode}
          onPenultimateStop={onPenultimateStop}
        />

        {/* ── Watch link SMS ── */}
        {watchUrl && primaryContact?.phone && (
          <button
            onClick={sendWatchSMS}
            disabled={smsSent || sending}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-surface-container active:scale-[0.98] transition-all disabled:opacity-60 mb-4"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${smsSent ? 'bg-secondary-container' : 'bg-surface-container-high'
              }`}>
              <span
                className="material-symbols-outlined text-on-secondary-container"
                style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
              >
                {smsSent ? 'check' : 'sms'}
              </span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-[0.875rem] font-bold text-on-surface">
                {smsSent
                  ? `Link sent to ${primaryContact.name}`
                  : sending
                    ? 'Sending…'
                    : `Send tracking link to ${primaryContact.name}`}
              </p>
              <p className="text-[0.75rem] text-on-surface-variant">
                {smsSent
                  ? 'They can watch your journey live'
                  : "They'll get a link to watch your location"}
              </p>
            </div>
            {!smsSent && (
              <span
                className="material-symbols-outlined text-on-surface-variant"
                style={{ fontSize: '18px' }}
              >
                chevron_right
              </span>
            )}
          </button>
        )}

        {/* ── End journey — subtle, not primary ── */}
        <button
          onClick={endJourney}
          className="w-full text-center text-[0.8125rem] font-bold text-on-surface-variant/50 py-3 active:text-on-surface-variant transition-colors"
        >
          End journey early
        </button>

        {simMode && (
          <button
            onClick={toggleSimMode}
            className="w-full text-center text-[0.75rem] text-outline py-1 active:text-on-surface-variant transition-colors"
          >
            Disable sim mode
          </button>
        )}

      </main>
    </div>
  )
}

// ─── HERO SECTION ────────────────────────────────────────────────────────────
function HeroSection({
  routeSteps, pendingLegs, position, distanceToStop,
  simMode, etaMinutes, destination, currentLegIndex, totalLegs,
}) {
  // Count ALL remaining stops, decrementing as user progresses
  const stopsRemaining = useMemo(() => {
    const steps = routeSteps ?? []
    const futureLegStops = (pendingLegs ?? []).length
    const total = steps.length + futureLegStops

    if (!total) return 0

    // Sim mode: no live GPS — estimate progress proportionally by distance
    if (simMode && distanceToStop != null) {
      const SIM_START = 3000
      const fraction = Math.min(1, distanceToStop / SIM_START)
      return Math.max(0, Math.round(total * fraction))
    }

    // Real GPS: count stops that are still ahead (closer to destination than user is)
    if (position && steps.length) {
      const dest = steps[steps.length - 1]
      if (dest?.lat && dest?.lng) {
        const userDist = distanceToStop ?? haversine(position.lat, position.lng, dest.lat, dest.lng)
        const ahead = steps.filter(s => {
          if (!s.lat || !s.lng) return false
          return haversine(s.lat, s.lng, dest.lat, dest.lng) < userDist
        })
        return ahead.length + futureLegStops
      }
    }

    return total
  }, [routeSteps, pendingLegs, position, distanceToStop, simMode])

  const isTransferLeg = totalLegs > 1 && currentLegIndex < totalLegs - 1
  const stopTarget = isTransferLeg ? 'transfer' : 'destination'

  const stopsLabel = distanceToStop != null && distanceToStop <= 600
    ? 'Arriving now'
    : stopsRemaining === 0
      ? 'En route'
      : stopsRemaining === 1
        ? `1 stop till ${stopTarget}`
        : `${stopsRemaining} stops till ${stopTarget}`

  const etaLabel = etaMinutes != null && etaMinutes > 0
    ? `~${etaMinutes} min`
    : null

  const arrivalLabel = (() => {
    if (!etaMinutes) return null
    const now = new Date()
    now.setMinutes(now.getMinutes() + etaMinutes)
    return now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  })()

  return (
    <section className="pt-2 pb-7">
      {totalLegs > 1 && (
        <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
          Leg {(currentLegIndex ?? 0) + 1} of {totalLegs}
        </p>
      )}

      <h2 className="text-[3rem] font-black tracking-tighter leading-none text-primary mb-2">
        {stopsLabel}
      </h2>

      <div className="flex items-center gap-2">
        {etaLabel && (
          <span className="text-[1rem] font-bold text-on-surface-variant">
            {etaLabel}
          </span>
        )}
        {etaLabel && arrivalLabel && (
          <span className="text-on-surface-variant/30 font-bold">·</span>
        )}
        {arrivalLabel && (
          <span className="text-[1rem] font-bold text-on-surface-variant">
            arriving {arrivalLabel}
          </span>
        )}
      </div>

      <p className="text-[0.875rem] font-bold text-on-surface-variant/60 mt-1.5 truncate">
        {destination?.name}
      </p>
    </section>
  )
}

// ─── JOURNEY RAIL ────────────────────────────────────────────────────────────
function JourneyRail({
  routeSteps, pendingLegs, destination, position,
  distanceToStop, simMode, onPenultimateStop,
}) {
  // Build grouped structure
  // Groups = [{major, intermediates: []}]
  const groups = useMemo(() => {
    const isTransiting = pendingLegs && pendingLegs.length > 0

    const rawSteps = routeSteps?.length > 0
      ? routeSteps
      : destination
        ? [{ id: 'dest', name: destination.name, lat: destination.lat, lng: destination.lng, type: 'alighting' }]
        : []

    // If there are pending legs, the final stop of the current leg is a transfer point
    const steps = rawSteps.map((step, i, arr) => {
      if (i === arr.length - 1 && isTransiting) {
        return { ...step, type: 'transfer' }
      }
      return step
    })

    const future = (pendingLegs ?? []).map((leg, i) => ({
      id: `pending-${i}`,
      name: leg.name,
      lat: leg.lat,
      lng: leg.lng,
      type: i === (pendingLegs.length - 1) ? 'alighting' : 'transfer',
      isFuture: true,
    }))

    const all = [...steps, ...future]

    // Group into [{ major, stops: [] }]
    const result = []
    let currentGroup = { major: null, stops: [] }

    for (const step of all) {
      const isMajor = step.type === 'transfer' || step.type === 'alighting' || step.type === 'boarding'
      if (isMajor) {
        if (currentGroup.major || currentGroup.stops.length) {
          result.push(currentGroup)
        }
        currentGroup = { major: step, stops: [] }
      } else {
        currentGroup.stops.push(step)
      }
    }
    if (currentGroup.major) result.push(currentGroup)

    return result
  }, [routeSteps, pendingLegs, destination])

  // Active stop tracking — forward only
  const [activeStopId, setActiveStopId] = useState(null)
  const activeIdxRef = useRef(0)
  const allFlatStops = useMemo(() =>
    groups.flatMap(g => [...g.stops, g.major]).filter(Boolean),
    [groups]
  )

  useEffect(() => {
    if (!position || simMode) return
    const cur = allFlatStops[activeIdxRef.current]
    const next = allFlatStops[activeIdxRef.current + 1]
    if (!cur?.lat || !next?.lat) return
    const distToCur = haversine(position.lat, position.lng, cur.lat, cur.lng)
    const distToNext = haversine(position.lat, position.lng, next.lat, next.lng)
    if (distToNext < distToCur) {
      activeIdxRef.current = activeIdxRef.current + 1
      setActiveStopId(allFlatStops[activeIdxRef.current]?.id ?? null)
    }
  }, [position, allFlatStops, simMode])

  useEffect(() => {
    if (!simMode || distanceToStop == null) return
    const SIM_START = 3000
    const progress = Math.max(0, Math.min(1, (SIM_START - distanceToStop) / SIM_START))
    const targetIdx = Math.min(
      Math.floor(progress * allFlatStops.length),
      allFlatStops.length - 1
    )
    const newIdx = Math.max(activeIdxRef.current, targetIdx)
    activeIdxRef.current = newIdx
    setActiveStopId(allFlatStops[newIdx]?.id ?? null)
  }, [distanceToStop, simMode, allFlatStops])

  // Penultimate detection
  const penultimateCalledRef = useRef(false)
  useEffect(() => {
    if (penultimateCalledRef.current) return
    const majorStops = allFlatStops.filter(s =>
      s.type === 'transfer' || s.type === 'alighting'
    )
    if (majorStops.length < 1) return
    const penultimate = majorStops[majorStops.length - 2]
    const activeStop = allFlatStops[activeIdxRef.current]
    if (penultimate && activeStop?.id === penultimate.id) {
      penultimateCalledRef.current = true
      onPenultimateStop?.()
    }
  }, [activeStopId, allFlatStops, onPenultimateStop])

  // Which groups are expanded — all can be open simultaneously
  const [expandedGroups, setExpandedGroups] = useState({})
  const toggleGroup = (id) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (!groups.length) return null

  return (
    <div className="w-full mb-4">

      {/* Origin */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 flex flex-col items-center flex-shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-secondary flex-shrink-0" />
          <div className="w-0.5 h-3 bg-outline-variant/30 mt-0.5" />
        </div>
        <span className="text-[0.75rem] font-bold text-secondary uppercase tracking-widest">
          Your location
        </span>
      </div>

      {groups.map((group, gi) => {
        const isLastGroup = gi === groups.length - 1
        const isExpanded = !!expandedGroups[group.major?.id ?? gi]
        const hasStops = group.stops.length > 0

        // How many of this group's intermediate stops are passed
        const passedCount = group.stops.filter(s => {
          const idx = allFlatStops.findIndex(f => f.id === s.id)
          return idx < activeIdxRef.current
        }).length

        const majorIdx = allFlatStops.findIndex(f => f.id === group.major?.id)
        const majorPassed = majorIdx < activeIdxRef.current
        const distToThisMajor = group.major?.lat && position
          ? haversine(position.lat, position.lng, group.major.lat, group.major.lng)
          : null
        const majorActive = allFlatStops[activeIdxRef.current]?.id === group.major?.id
          && (distToThisMajor == null || distToThisMajor < 600)

        const isTransfer = group.major?.type === 'transfer'
        const isDestination = group.major?.type === 'alighting'
        const isFuture = group.major?.isFuture

        return (
          <div key={group.major?.id ?? gi}>

            {/* ── Chevron row (only if there are intermediate stops) ── */}
            {hasStops && (
              <div className="flex items-stretch gap-3">
                <div className="w-8 flex flex-col items-center flex-shrink-0">
                  <div className={`w-0.5 flex-1 min-h-[12px] transition-colors ${passedCount > 0 ? 'bg-primary' : 'bg-outline-variant/30'
                    }`} />
                </div>

                <button
                  onClick={() => toggleGroup(group.major?.id ?? gi)}
                  className="flex-1 flex items-center justify-between py-2.5 active:opacity-70 transition-opacity"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="material-symbols-outlined text-on-surface-variant transition-transform duration-200"
                      style={{
                        fontSize: '16px',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      expand_more
                    </span>
                    <span className="text-[0.75rem] font-bold text-on-surface-variant">
                      {passedCount > 0
                        ? `${passedCount} of ${group.stops.length} stops passed`
                        : `${group.stops.length} stop${group.stops.length > 1 ? 's' : ''}`}
                    </span>
                  </div>
                </button>
              </div>
            )}

            {/* ── Expanded intermediate stops ── */}
            {hasStops && isExpanded && (
              <div className="flex items-stretch gap-3">
                <div className="w-8 flex flex-col items-center flex-shrink-0">
                  <div className={`w-0.5 flex-1 transition-colors ${passedCount === group.stops.length ? 'bg-primary' : 'bg-outline-variant/30'
                    }`} />
                </div>

                <div className="flex-1 py-1">
                  {group.stops.map((stop, si) => {
                    const stopIdx = allFlatStops.findIndex(f => f.id === stop.id)
                    const isPassed = stopIdx < activeIdxRef.current
                    const isActive = allFlatStops[activeIdxRef.current]?.id === stop.id

                    return (
                      <div
                        key={stop.id ?? si}
                        className="flex items-center gap-3 py-2"
                      >
                        {/* Small dot */}
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${isPassed
                            ? 'bg-primary'
                            : isActive
                              ? 'bg-primary ring-[3px] ring-primary/20'
                              : 'bg-outline-variant/40'
                          }`} />

                        <span className={`text-[0.8125rem] leading-snug transition-colors ${isPassed
                            ? 'text-on-surface-variant/40 font-medium line-through decoration-on-surface-variant/20'
                            : isActive
                              ? 'font-bold text-primary'
                              : 'font-medium text-on-surface-variant'
                          }`}>
                          {stop.name}
                        </span>

                        {isPassed && (
                          <span
                            className="material-symbols-outlined text-primary/60 ml-auto flex-shrink-0"
                            style={{ fontSize: '13px', fontVariationSettings: "'FILL' 1" }}
                          >
                            check
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Connector into major stop */}
            {!hasStops && (
              <div className="flex items-stretch gap-3">
                <div className="w-8 flex flex-col items-center flex-shrink-0">
                  <div className={`w-0.5 h-3 transition-colors ${majorPassed ? 'bg-primary' : 'bg-outline-variant/30'
                    }`} />
                </div>
                <div />
              </div>
            )}

            {/* ── Major stop node ── */}
            <div className="flex items-stretch gap-3">
              <div className="w-8 flex flex-col items-center flex-shrink-0">

                {/* The node dot */}
                <div className="relative flex items-center justify-center my-0.5 flex-shrink-0">
                  {majorActive && (
                    <div className="absolute w-10 h-10 bg-primary/10 rounded-full animate-pulse" />
                  )}
                  <div className={`relative z-10 rounded-full flex items-center justify-center transition-all duration-500 ${majorPassed
                      ? 'w-5 h-5 bg-secondary-container'
                      : majorActive
                        ? 'w-7 h-7 bg-primary shadow-[0_0_0_4px_rgba(0,110,40,0.12)]'
                        : isFuture
                          ? 'w-5 h-5 border-2 border-outline-variant/30 bg-surface-container-low'
                          : isDestination
                            ? 'w-5 h-5 bg-primary/20 border-2 border-primary'
                            : 'w-5 h-5 border-2 border-outline-variant/60 bg-white'
                    }`}>
                    {majorPassed && (
                      <span
                        className="material-symbols-outlined text-secondary"
                        style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1, 'wght' 700" }}
                      >
                        check
                      </span>
                    )}
                    {majorActive && (
                      <span
                        className="material-symbols-outlined text-white"
                        style={{ fontSize: '15px', fontVariationSettings: "'FILL' 1" }}
                      >
                        {isTransfer ? 'transfer_within_a_station' : 'directions_bus'}
                      </span>
                    )}
                    {!majorPassed && !majorActive && isDestination && (
                      <span
                        className="material-symbols-outlined text-primary"
                        style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1" }}
                      >
                        flag
                      </span>
                    )}
                  </div>
                </div>

                {/* Connector to next group */}
                {!isLastGroup && (
                  <div className={`w-0.5 flex-1 min-h-[20px] transition-colors ${majorPassed ? 'bg-primary' : 'bg-outline-variant/30'
                    }`} />
                )}
              </div>

              {/* Major stop label */}
              <div className={`flex-1 flex items-center justify-between py-3 ${!isLastGroup ? 'border-b border-outline-variant/10' : ''
                }`}>
                <div className="min-w-0 flex-1 pr-3">
                  <p className={`text-[0.9375rem] leading-snug font-black tracking-tight transition-colors ${majorPassed
                      ? 'text-on-surface-variant/40'
                      : majorActive
                        ? 'text-primary'
                        : isFuture
                          ? 'text-on-surface-variant/40'
                          : 'text-on-surface'
                    }`}>
                    {group.major?.name}
                  </p>

                  {/* Badge row */}
                  <div className="flex items-center gap-2 mt-1">
                    {isTransfer && (
                      <div className="flex items-center gap-1 bg-secondary-container px-2 py-0.5 rounded-lg">
                        <span
                          className="material-symbols-outlined text-on-secondary-container"
                          style={{ fontSize: '11px' }}
                        >
                          transfer_within_a_station
                        </span>
                        <span className="text-[0.625rem] font-black uppercase tracking-widest text-on-secondary-container">
                          Transfer
                        </span>
                      </div>
                    )}
                    {isDestination && !isFuture && (
                      <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-lg">
                        <span className="text-[0.625rem] font-black uppercase tracking-widest text-primary">
                          Destination
                        </span>
                      </div>
                    )}
                    {isFuture && (
                      <span className="text-[0.625rem] font-bold uppercase tracking-widest text-on-surface-variant/30">
                        Next leg
                      </span>
                    )}
                    {majorActive && (
                      <span className="text-[0.625rem] font-bold uppercase tracking-widest text-primary">
                        You are here
                      </span>
                    )}
                    {majorPassed && (
                      <span className="text-[0.625rem] font-bold uppercase tracking-widest text-secondary/70">
                        Passed
                      </span>
                    )}
                  </div>
                </div>

                {/* Distance to this stop */}
                {!majorPassed && !isFuture && group.major?.lat && position && (
                  <span className={`text-[0.75rem] font-bold tabular-nums flex-shrink-0 ${majorActive ? 'text-primary' : 'text-on-surface-variant/50'
                    }`}>
                    {(() => {
                      const d = simMode && majorActive
                        ? distanceToStop
                        : haversine(position.lat, position.lng, group.major.lat, group.major.lng)
                      if (d == null) return null
                      return d >= 1000
                        ? `${(d / 1000).toFixed(1)} km`
                        : `${Math.round(d)} m`
                    })()}
                  </span>
                )}
              </div>
            </div>

          </div>
        )
      })}
    </div>
  )
}

// ─── PHASE 1 ─────────────────────────────────────────────────────────────────
function Phase1Screen({ destination, etaMinutes, dismissWarning, atPenultimateStop, simMode, triggerMissed, isTransfer }) {
  return (
    <div className="bg-surface-container-low text-on-surface min-h-dvh flex flex-col items-center justify-between max-w-[430px] mx-auto overflow-hidden">

      <header className="bg-surface-container-lowest/95 backdrop-blur-sm text-primary font-black tracking-tighter uppercase text-xl w-full flex justify-between items-center px-6 py-7">
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            warning
          </span>
          <span className="tracking-tighter font-black">Wake up</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full px-10 text-center">
        <div className="mb-10 bell-animation">
          <span
            className="material-symbols-outlined text-primary"
            style={{ fontSize: '100px', fontVariationSettings: "'FILL' 1" }}
          >
            notifications_active
          </span>
        </div>

        <div className="space-y-3 mb-14">
          <h1 className="text-primary font-black text-5xl tracking-tighter">
            {isTransfer ? 'Transfer soon' : 'Are you awake?'}
          </h1>
          <p className="text-on-surface-variant text-[1.125rem] leading-relaxed max-w-[260px] mx-auto">
            {atPenultimateStop
              ? isTransfer
                ? `Get ready to alight — your transfer stop is next.`
                : `Next stop is yours — request the stop now.`
              : destination?.name
                ? isTransfer
                  ? `Transfer at ${destination.name} ${etaMinutes != null ? `in ${etaMinutes} min` : 'approaching'}.`
                  : `${destination.name} is ${etaMinutes != null ? `in ${etaMinutes} min` : 'approaching'}.`
                : isTransfer
                  ? 'Your transfer stop is approaching.'
                  : 'Your stop is approaching.'}
          </p>
          {isTransfer && (
            <div className="flex items-center justify-center gap-1.5 bg-secondary-container/60 px-3 py-1.5 rounded-full mx-auto w-fit">
              <span className="material-symbols-outlined text-on-secondary-container" style={{ fontSize: '13px' }}>
                transfer_within_a_station
              </span>
              <span className="text-[0.75rem] font-bold uppercase tracking-widest text-on-secondary-container">
                Transfer stop
              </span>
            </div>
          )}
          {atPenultimateStop && !isTransfer && (
            <p className="text-error font-bold text-[0.875rem]">
              This alert cannot be snoozed.
            </p>
          )}
        </div>

        <div className="w-full flex flex-col gap-3 max-w-sm">
          <button
            onClick={() => dismissWarning(false)}
            className="h-[56px] w-full bg-primary rounded-full flex items-center justify-center active:scale-95 transition-all"
          >
            <span className="text-white font-black text-lg tracking-tight">
              I'm awake — got it
            </span>
          </button>
          {!atPenultimateStop && (
            <button
              onClick={() => dismissWarning(true)}
              className="h-[56px] w-full bg-secondary-container rounded-full flex items-center justify-center active:scale-95 transition-all"
            >
              <span className="text-on-secondary-container font-black text-lg tracking-tight">
                1 more minute
              </span>
            </button>
          )}
          {simMode && (
            <button
              onClick={triggerMissed}
              className="text-[0.75rem] text-on-surface-variant/50 underline underline-offset-2 active:opacity-60 pt-2"
            >
              Simulate missed stop →
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

// ─── ARRIVED ─────────────────────────────────────────────────────────────────
function ArrivedScreen({ destination }) {
  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-dvh flex flex-col max-w-[430px] mx-auto">
      <div className="pt-14" />

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto mb-8">
          <span
            className="material-symbols-outlined text-white"
            style={{ fontSize: '36px', fontVariationSettings: "'FILL' 1" }}
          >
            notifications_active
          </span>
        </div>

        <p className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
          Get ready to alight
        </p>

        <h1 className="text-[3rem] font-black tracking-tighter leading-[1.05] text-primary mb-3">
          Your stop<br />is next
        </h1>

        <p className="text-[1.25rem] font-bold text-on-surface-variant tracking-tight">
          {destination?.name}
        </p>
      </div>
    </div>
  )
}

// ─── SAFE TRIP ───────────────────────────────────────────────────────────────
function SafeTripScreen({ destination, onPlanAnother }) {
  const arrivalTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-dvh flex flex-col max-w-[430px] mx-auto px-8">

      <div className="flex-1 flex flex-col justify-center">
        <p className="text-[0.75rem] font-bold uppercase tracking-widest text-secondary mb-4">
          You're here.
        </p>

        <h1 className="text-[3.5rem] font-black tracking-tighter leading-[1.0] text-primary mb-5">
          {destination?.name ?? 'Your destination'}
        </h1>

        <p className="text-[0.9375rem] text-on-surface-variant font-medium mb-1">
          Arrived at {arrivalTime}
        </p>

        <p className="text-[0.9375rem] text-on-surface-variant/50 font-medium">
          Safe travels.
        </p>
      </div>

      <div className="pb-14">
        <button
          onClick={onPlanAnother}
          className="w-full h-[52px] rounded-full border border-outline-variant/40 text-primary font-bold text-[1.0625rem] tracking-tight active:scale-95 transition-all"
        >
          Start a trip
        </button>
      </div>

    </div>
  )
}