'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useJourney } from '@/context/JourneyContext'

export default function SetJourneyPage() {
  return (
    <Suspense fallback={<div className="bg-surface-container-lowest min-h-dvh max-w-[430px] mx-auto" />}>
      <SetJourneyContent />
    </Suspense>
  )
}

function minutesUntil(timeText) {
  if (!timeText) return null
  const match = timeText.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return null
  let [, h, m, meridiem] = match
  h = parseInt(h, 10)
  m = parseInt(m, 10)
  if (meridiem.toUpperCase() === 'PM' && h !== 12) h += 12
  if (meridiem.toUpperCase() === 'AM' && h === 12) h = 0
  const now = new Date()
  const dep = new Date(now)
  dep.setHours(h, m, 0, 0)
  const diff = Math.round((dep - now) / 60000)
  return diff
}

function SetJourneyContent() {
  const { startJourney, setSimMode } = useJourney()
  const searchParams = useSearchParams()

  const [legs, setLegs] = useState(() => {
    // Pre-fill destination from query params (e.g. coming from missed page)
    const name = searchParams.get('destName')
    const lat = parseFloat(searchParams.get('destLat'))
    const lng = parseFloat(searchParams.get('destLng'))
    if (name && !isNaN(lat) && !isNaN(lng)) {
      return [{ id: `prefill-${lat}-${lng}`, name, address: '', lat, lng }]
    }
    return []
  })
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [loadingPlace, setLoadingPlace] = useState(false)
  const [isAddingStop, setIsAddingStop] = useState(() => {
    const name = searchParams.get('destName')
    const lat = parseFloat(searchParams.get('destLat'))
    const lng = parseFloat(searchParams.get('destLng'))
    return !(name && !isNaN(lat) && !isNaN(lng))
  })
  const debounceRef = useRef(null)

  const [routeOptions, setRouteOptions] = useState(null)
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [expandedRoute, setExpandedRoute] = useState(null)
  const [fetchingRoutes, setFetchingRoutes] = useState(false)
  const [routeError, setRouteError] = useState(null)

  useEffect(() => {
    setResults([])
    if (!isAddingStop || !query.trim() || query.length < 2) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.predictions ?? [])
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, isAddingStop])

  const handleSelectPlace = useCallback(async (p) => {
    setQuery('')
    setResults([])
    setLoadingPlace(true)
    try {
      const res = await fetch(`/api/places?placeId=${p.placeId}`)
      const data = await res.json()
      setLegs(prev => [...prev, {
        id: p.placeId,
        name: p.mainText,
        address: p.description,
        lat: data.place?.lat ?? null,
        lng: data.place?.lng ?? null,
      }])
    } catch {
      setLegs(prev => [...prev, {
        id: p.placeId,
        name: p.mainText,
        address: p.description,
        lat: null,
        lng: null,
      }])
    }
    setIsAddingStop(false)
    setLoadingPlace(false)
  }, [])

  const removeLeg = (idx) => {
    setLegs(prev => {
      const next = prev.filter((_, i) => i !== idx)
      if (next.length === 0) setIsAddingStop(true)
      return next
    })
    setRouteOptions(null)
    setSelectedRoute(null)
  }

  const cancelAdding = () => {
    setIsAddingStop(false)
    setQuery('')
    setResults([])
  }

  const canStart = legs.length > 0 && legs.every(l => l.lat) && !loadingPlace && !isAddingStop

  const handleStartJourney = async () => {
    if (!canStart) return
    setRouteError(null)
    setFetchingRoutes(true)
    let pos = null
    try {
      pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(
          p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          reject,
          { timeout: 8000, enableHighAccuracy: false }
        )
      )
    } catch (geoErr) {
      const code = geoErr?.code
      if (code === 1) {
        setRouteError('Location access was denied. Enable it in your browser settings, or tap "Start without route" below.')
      } else {
        setRouteError('Could not get your location. Tap "Start without route" to continue anyway.')
      }
      setFetchingRoutes(false)
      return
    }

    try {
      const res = await fetch('/api/transit-routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originLat: pos.lat,
          originLng: pos.lng,
          destLat: legs[0].lat,
          destLng: legs[0].lng,
        }),
      })
      const data = await res.json()
      if (data.routes?.length) {
        setRouteOptions(data.routes)
      } else {
        setRouteError('No transit routes found. Tap "Start without route" to continue anyway.')
      }
    } catch {
      setRouteError('Could not find routes. Tap "Start without route" to continue anyway.')
    } finally {
      setFetchingRoutes(false)
    }
  }

  const handleConfirmRoute = () => {
    if (!selectedRoute) return
    const destinationTarget = legs[0]
    const routeLegs = selectedRoute.transitSteps.map((step, i) => {
      const isFinal = i === selectedRoute.transitSteps.length - 1
      return {
        name: isFinal ? destinationTarget?.name : step.arrivalStop,
        lat: step.stopSequence?.[step.stopSequence.length - 1]?.lat ?? step.arrivalLocation?.lat ?? destinationTarget?.lat,
        lng: step.stopSequence?.[step.stopSequence.length - 1]?.lng ?? step.arrivalLocation?.lng ?? destinationTarget?.lng,
        stopSequence: step.stopSequence,
        line: step.line,
      }
    })
    startJourney(
      routeLegs[0],
      routeLegs.slice(1),
      routeLegs[0].stopSequence,
      routeLegs[0].line
    )
  }

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-dvh flex flex-col max-w-[430px] mx-auto">

      {/* Header */}
      <nav className="flex items-center justify-between px-6 pt-12 pb-3 bg-surface-container-lowest">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-1 text-[0.8125rem] font-bold text-primary active:opacity-60 transition-opacity"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back_ios</span>
            Home
          </Link>
        </div>
        <Link href="/settings">
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontSize: '20px' }}
          >
            person
          </span>
        </Link>
      </nav>

      <main className="flex-1 px-6 pt-6 pb-36">

        {/* Page heading */}
        <h1 className="text-[2.25rem] font-black tracking-tighter leading-[1.1] mb-2 text-primary">
          Plan your route
        </h1>
        <p className="text-on-surface-variant text-[0.9375rem] mb-7 leading-relaxed">
          We'll take care of your stops and transfers.
        </p>

        {/* Route rail */}
        <div className="relative">

          {/* Origin node */}
          <div className="flex items-center gap-3 mb-0">
            <div className="w-7 flex flex-col items-center flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-secondary flex-shrink-0" />
              {(legs.length > 0 || isAddingStop) && (
                <div className="w-0.5 h-4 bg-outline-variant/40 mt-0.5" />
              )}
            </div>
            <span className="text-[0.75rem] font-bold text-secondary uppercase tracking-widest mb-1">
              Your location
            </span>
          </div>

          {/* Confirmed legs */}
          {legs.map((leg, i) => {
            const isLastLeg = i === legs.length - 1
            const showConnector = !isLastLeg || isAddingStop
            return (
              <div key={`${leg.id}-${i}`} className="flex items-stretch gap-3">
                <div className="w-7 flex flex-col items-center flex-shrink-0">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${isLastLeg && !isAddingStop
                    ? 'bg-primary border-primary'
                    : 'bg-white border-primary'
                    }`}>
                    {(!isLastLeg || isAddingStop) ? (
                      <span
                        className="material-symbols-outlined text-primary"
                        style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1" }}
                      >
                        transfer_within_a_station
                      </span>
                    ) : (
                      <span
                        className="material-symbols-outlined text-white"
                        style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1" }}
                      >
                        flag
                      </span>
                    )}
                  </div>
                  {showConnector && (
                    <div className="w-0.5 flex-1 min-h-[36px] bg-outline-variant/40" />
                  )}
                </div>

                <div className="flex-1 py-1.5 pb-2.5">
                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-surface-container border border-outline-variant/20">
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.625rem] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5">
                        {isLastLeg && !isAddingStop
                          ? 'Final stop'
                          : `Transfer stop ${i + 1}`}
                      </p>
                      <p className="font-bold text-on-surface text-[0.9375rem] truncate">
                        {leg.name}
                      </p>
                      {!leg.lat && (
                        <p className="text-error text-xs mt-0.5">
                          No coordinates — remove and try again
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeLeg(i)}
                      className="p-1.5 active:scale-90 flex-shrink-0 hover:bg-surface-container-high rounded-full transition-colors"
                    >
                      <span
                        className="material-symbols-outlined text-on-surface-variant/50"
                        style={{ fontSize: '16px' }}
                      >
                        close
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Live search row */}
          {isAddingStop && (
            <div className="flex items-start gap-3">
              <div className="w-7 flex flex-col items-center flex-shrink-0 pt-3.5">
                <div className="w-4 h-4 rounded-full border-2 border-primary/50 bg-white flex-shrink-0 ring-4 ring-primary/10 animate-pulse" />
              </div>
              <div className="flex-1 pb-1.5">
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search stop or address…"
                    autoComplete="off"
                    autoFocus
                    className="w-full bg-transparent border-0 border-b-2 border-primary py-2.5 text-[1.0625rem] font-bold focus:outline-none placeholder:text-outline-variant/60 placeholder:font-normal placeholder:text-[0.9375rem] transition-colors"
                  />
                  {(searching || loadingPlace) && (
                    <span className="absolute right-8 top-1/2 -translate-y-1/2 text-primary text-sm animate-pulse">
                      …
                    </span>
                  )}
                  {legs.length > 0 && (
                    <button
                      onClick={cancelAdding}
                      className="absolute right-0 top-1/2 -translate-y-1/2 p-1 active:scale-90"
                    >
                      <span
                        className="material-symbols-outlined text-on-surface-variant"
                        style={{ fontSize: '18px' }}
                      >
                        close
                      </span>
                    </button>
                  )}
                </div>

                {results.length > 0 && (
                  <div className="mt-1.5 bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/30 shadow-md relative z-10">
                    {results.map((p, ri) => (
                      <button
                        key={p.placeId}
                        onClick={() => handleSelectPlace(p)}
                        className={`w-full flex items-start gap-3 py-3.5 px-4 text-left active:bg-surface-container-low transition-colors ${ri > 0 ? 'border-t border-outline-variant/20' : ''
                          }`}
                      >
                        <span
                          className="material-symbols-outlined text-on-surface-variant flex-shrink-0 mt-0.5"
                          style={{ fontSize: '18px' }}
                        >
                          location_on
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-on-surface text-[0.9375rem] truncate">
                            {p.mainText}
                          </p>
                          {p.secondaryText && (
                            <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                              {p.secondaryText}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {query.trim().length >= 2 && !searching && results.length === 0 && (
                  <p className="text-[0.8125rem] text-on-surface-variant mt-2.5">
                    keep typing, no location matches this
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Emergency contacts */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <label className="text-[0.75rem] font-bold uppercase tracking-[0.05em] text-on-surface">
              Emergency Contacts
            </label>
            <Link
              href="/contacts"
              className="text-[0.75rem] font-bold uppercase tracking-[0.05em] text-secondary"
            >
              Edit
            </Link>
          </div>
          <ContactsPreview />
        </section>

      </main>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 w-full max-w-[430px] left-1/2 -translate-x-1/2 px-6 pb-10 pt-5 bg-surface-container-lowest/95 backdrop-blur-sm border-t border-outline-variant/20">
        {routeError && (
          <div className="mb-3 space-y-2">
            <p className="text-[0.8125rem] text-error font-medium text-center">{routeError}</p>
            <button
              onClick={() => { setRouteError(null); startJourney(legs[0], legs.slice(1)) }}
              className="w-full text-center text-[0.8125rem] font-bold text-on-surface-variant py-1.5 active:opacity-60 transition-opacity"
            >
              Start without route →
            </button>
          </div>
        )}
        <button
          onClick={() => { setRouteError(null); handleStartJourney() }}
          disabled={!canStart || fetchingRoutes}
          className="w-full h-[52px] rounded-full bg-primary text-white font-bold text-[1.0625rem] tracking-tight active:scale-[0.97] transition-all disabled:opacity-25 shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
        >
          {fetchingRoutes
            ? 'Finding routes…'
            : loadingPlace
              ? 'Getting location…'
              : legs.length > 1
                ? `Start ${legs.length}-stop Trip`
                : 'Start Trip'}
        </button>
      </div>

      {/* Route picker bottom sheet */}
      {/* Route picker bottom sheet */}
      {routeOptions !== null && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-[430px] mx-auto">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <div className="relative bg-surface-container-lowest rounded-t-3xl px-5 pt-4 pb-8 shadow-2xl max-h-[88dvh] overflow-y-auto">

            {/* Handle + dismiss */}
            <div className="flex items-center justify-between mb-4">
              <div className="w-9 h-1 rounded-full bg-outline-variant/50" />
              <button
                onClick={() => setRouteOptions(null)}
                className="p-1 active:scale-90 transition-transform"
              >
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>

            <h2 className="text-[1.25rem] font-black tracking-tighter text-primary mb-1">
              Choose your route
            </h2>
            <p className="text-[0.8125rem] text-on-surface-variant mb-5">
              To {legs[0]?.name}
            </p>

            <div className="space-y-2.5 mb-5">
              {routeOptions.map(route => {
                const isSelected = selectedRoute?.id === route.id
                const isExpanded = expandedRoute === route.id

                return (
                  <div
                    key={route.id}
                    className={`rounded-2xl border-2 transition-all overflow-hidden ${isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant/30 bg-surface-container'
                      }`}
                  >
                    {/* Selectable row — tap to select */}
                    <button
                      onClick={() =>
                        setSelectedRoute(prev =>
                          prev?.id === route.id ? null : route
                        )
                      }
                      className="w-full text-left active:scale-[0.98] transition-transform"
                    >
                      <div className="flex items-center gap-3 px-4 py-3">

                        {/* Line badge */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-primary' : 'bg-surface-container-high'
                          }`}>
                          <span className={`font-black text-[0.9375rem] leading-none transition-colors ${isSelected ? 'text-white' : 'text-on-surface'
                            }`}>
                            {route.primaryLine}
                          </span>
                        </div>

                        {/* Route info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-on-surface text-[0.9375rem] truncate">
                            {route.primaryHeadsign || `Route ${route.primaryLine}`}
                          </p>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {route.transfers === 0
                              ? 'Direct'
                              : `${route.transfers} transfer${route.transfers > 1 ? 's' : ''}`}
                            {route.numStops > 0 && ` · ${route.numStops} stops`}
                          </p>
                        </div>

                        {/* Duration + selection indicator */}
                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          <div className="text-right">
                            <p className="font-black text-on-surface text-[1rem]">
                              {route.duration}
                            </p>
                            {route.arrivalTimeText && (
                              <p className="text-xs text-on-surface-variant">
                                arr. {route.arrivalTimeText}
                              </p>
                            )}
                          </div>

                          {/* Checkmark when selected, empty circle when not */}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${isSelected
                              ? 'bg-primary border-primary'
                              : 'border-outline-variant/50 bg-white'
                            }`}>
                            {isSelected && (
                              <span
                                className="material-symbols-outlined text-white"
                                style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1, 'wght' 700" }}
                              >
                                check
                              </span>
                            )}
                          </div>
                        </div>

                      </div>
                    </button>

                    {/* Details trigger — separate from the select tap */}
                    <div className={`px-4 pb-3 -mt-1 flex items-center justify-between ${isSelected ? '' : 'opacity-60'
                      }`}>
                      <div className="flex items-center gap-1.5">
                        {route.transfers > 0 && (
                          <>
                            <span
                              className="material-symbols-outlined text-on-surface-variant"
                              style={{ fontSize: '13px' }}
                            >
                              transfer_within_a_station
                            </span>
                            <span className="text-[0.6875rem] text-on-surface-variant font-medium">
                              Via {route.transferStopName || 'transfer'}
                            </span>
                          </>
                        )}
                        {route.transfers === 0 && (
                          <span className="text-[0.6875rem] text-on-surface-variant font-medium">
                            Direct service
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          setExpandedRoute(prev =>
                            prev === route.id ? null : route.id
                          )
                        }
                        className="flex items-center gap-1 py-1 px-2 rounded-lg active:bg-surface-container-high transition-colors"
                      >
                        <span className="text-[0.75rem] font-bold text-primary">
                          {isExpanded ? 'Hide' : 'Details'}
                        </span>
                        <span
                          className="material-symbols-outlined text-primary transition-transform duration-200"
                          style={{
                            fontSize: '15px',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          }}
                        >
                          expand_more
                        </span>
                      </button>
                    </div>

                    {/* Inline trip summary — expands independently of selection */}
                    <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}>
                      <div className="overflow-hidden">
                        <div className="px-4 pt-3 pb-4 border-t border-outline-variant/10 bg-surface-container-low/30">

                          <p className="text-[0.625rem] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                            Trip summary
                          </p>

                          <div className="relative pl-3">
                            <div className="absolute left-3 top-2 bottom-8 border-l-2 border-dashed border-outline-variant/30" />

                            <div className="space-y-7">
                              {route.transitSteps.map((step, i) => (
                                <div key={i} className="relative z-10">

                                  {i > 0 && (
                                    <div className="absolute left-[-26px] -top-[23px] flex items-center gap-1 bg-secondary-container px-2.5 py-1 rounded-xl shadow-[0_4px_12px_-4px_rgba(0,0,0,0.15)] border border-secondary/20 z-20">
                                      <span
                                        className="material-symbols-outlined text-on-secondary-container"
                                        style={{ fontSize: '13px' }}
                                      >
                                        transfer_within_a_station
                                      </span>
                                      <span className="text-[0.625rem] font-black uppercase tracking-widest text-on-secondary-container leading-none mt-[1px]">
                                        Transfer
                                      </span>
                                    </div>
                                  )}

                                  <div className="absolute left-[-15px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-[3px] ring-primary/10" />

                                  <div className="mb-1.5">
                                    <p className="font-bold text-[0.9375rem] text-on-surface leading-tight">
                                      Board{' '}
                                      {step.vehicle === 'HEAVY_RAIL' ||
                                        step.vehicle === 'COMMUTER_TRAIN'
                                        ? 'Train'
                                        : 'Bus'}{' '}
                                      {step.line}
                                    </p>
                                    <p className="text-[0.75rem] text-on-surface-variant font-medium mt-0.5">
                                      {step.departureStop}
                                    </p>
                                  </div>

                                  {step.numStops > 0 && (
                                    <div className="pl-4 py-2 text-[0.75rem] font-medium text-on-surface-variant/70">
                                      Ride {step.numStops} stop{step.numStops > 1 ? 's' : ''}
                                    </div>
                                  )}

                                  <div className="relative mt-1.5">
                                    <div className="absolute left-[-15px] top-1 w-2.5 h-2.5 rounded-full border-2 border-primary bg-white z-10" />
                                    <p className="font-bold text-[0.9375rem] text-primary leading-tight">
                                      Get off at {step.arrivalStop}
                                    </p>
                                  </div>

                                </div>
                              ))}

                              {/* Destination */}
                              <div className="relative z-10">
                                <div className="absolute left-[-17px] top-[3px] w-3.5 h-3.5 rounded-full bg-secondary-container flex items-center justify-center border border-secondary/20 shadow-sm">
                                  <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                                </div>
                                <p className="font-bold text-[0.9375rem] text-on-surface tracking-tight">
                                  Arrive at destination
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                )
              })}
            </div>

            {/* Sheet CTA */}
            <button
              onClick={handleConfirmRoute}
              disabled={!selectedRoute}
              className="w-full h-[52px] rounded-full bg-primary text-white font-bold text-[1rem] tracking-tight active:scale-[0.97] transition-all disabled:opacity-30 mb-2.5"
            >
              {(() => {
                if (!selectedRoute) return 'Select a route above'
                const mins = minutesUntil(selectedRoute.departureTimeText)
                const vehicle =
                  selectedRoute.primaryVehicle === 'HEAVY_RAIL' ||
                    selectedRoute.primaryVehicle === 'COMMUTER_TRAIN'
                    ? 'Train'
                    : 'Bus'
                const line = selectedRoute.primaryLine
                if (mins === null || mins <= 0)
                  return `Board ${vehicle} ${line} · Start now`
                if (mins === 1)
                  return `Board ${vehicle} ${line} · departs in 1 min`
                return `Board ${vehicle} ${line} · departs in ${mins} mins`
              })()}
            </button>

            <button
              onClick={() => {
                setSimMode(true)
                handleConfirmRoute()
              }}
              disabled={!selectedRoute}
              className="w-full flex items-center justify-center gap-1.5 text-center text-[0.8125rem] text-primary font-bold py-2 active:scale-95 transition-transform disabled:opacity-30 disabled:active:scale-100"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                play_arrow
              </span>
              Sim route for demonstration
            </button>

          </div>
        </div>
      )}

    </div>
  )
}

function ContactsPreview() {
  const [contacts, setContacts] = useState([])
  useEffect(() => {
    try {
      const r = localStorage.getItem('nudge_contacts')
      if (r) setContacts(JSON.parse(r))
    } catch { }
  }, [])

  if (!contacts.length) {
    return (
      <Link href="/contacts" className="flex items-center gap-3 py-1.5">
        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontSize: '18px' }}
          >
            person_add
          </span>
        </div>
        <div>
          <p className="text-[0.9375rem] font-medium text-on-surface-variant">
            Add emergency contact
          </p>
          <p className="text-xs text-outline mt-0.5">
            They'll be alerted if you miss your stop
          </p>
        </div>
      </Link>
    )
  }

  return (
    <div className="space-y-3">
      {contacts.slice(0, 2).map((c, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
            >
              person
            </span>
          </div>
          <div>
            <p className="text-[0.9375rem] font-bold text-on-surface">{c.name}</p>
            <p className="text-xs text-on-surface-variant">{c.phone}</p>
          </div>
          <div className="ml-auto w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center">
            <span
              className="material-symbols-outlined text-on-secondary-container"
              style={{
                fontSize: '14px',
                fontVariationSettings: "'FILL' 1, 'wght' 700",
              }}
            >
              check
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}