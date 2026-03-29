'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { haversine } from '@/lib/haversine'

export default function WatchPage() {
  const { token } = useParams()
  const [journey, setJourney] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/watch/${token}`)
      const data = await res.json()
      setJourney(data)
      if (data.status !== 'no_journey') setLastUpdated(new Date())
    } catch {}
    setLoading(false)
  }, [token])

  useEffect(() => {
    poll()
    const interval = setInterval(poll, 10000)
    return () => clearInterval(interval)
  }, [poll])

  if (loading) {
    return (
      <div className="bg-surface-container-lowest text-on-surface min-h-dvh flex items-center justify-center max-w-[430px] mx-auto">
        <div className="w-8 h-8 rounded-full border-2 border-outline-variant border-t-primary animate-spin" />
      </div>
    )
  }

  if (!journey || journey.status === 'no_journey') {
    return (
      <div className="bg-surface-container-lowest text-on-surface min-h-dvh flex flex-col items-center justify-center px-8 text-center max-w-[430px] mx-auto">
        <span className="material-symbols-outlined text-on-surface-variant mb-6" style={{ fontSize: '56px' }}>
          location_searching
        </span>
        <h1 className="text-[2rem] font-black tracking-tighter text-primary mb-3">No active journey</h1>
        <p className="text-on-surface-variant text-[1.0625rem] font-medium leading-relaxed max-w-[260px]">
          This link becomes active once your friend starts a journey with Nudge.
        </p>
      </div>
    )
  }

  const displayDist = journey.simMode ? journey.distanceToStop : (journey.apiDistance ?? journey.distanceToStop)

  const distLabel = displayDist != null
    ? displayDist >= 1000
      ? `${(displayDist / 1000).toFixed(1)} km away`
      : `${Math.round(displayDist)} m away`
    : null

  // Dynamic progress: use actual distance, cap at 10km start
  const maxDist = 10000
  const progressPct = displayDist != null
    ? Math.min(92, Math.max(8, 100 - (displayDist / maxDist) * 100))
    : 40

  const isMissed = journey.state === 'MISSED'
  const isAlarm  = journey.state === 'PHASE_1'

  const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
  const mapUrl = (() => {
    const base = 'https://maps.googleapis.com/maps/api/staticmap'
    const p = new URLSearchParams({ size: '800x480', scale: '2', zoom: '14', key: MAPS_KEY })
    if (journey.lat && journey.lng) p.append('markers', `color:0x006e28|size:mid|${journey.lat},${journey.lng}`)
    if (journey.destLat && journey.destLng) p.append('markers', `color:0x006e28|size:mid|label:D|${journey.destLat},${journey.destLng}`)
    if (journey.lat && journey.lng && journey.destLat && journey.destLng) {
      p.delete('zoom')
      p.append('path', `color:0x006e2840|weight:3|${journey.lat},${journey.lng}|${journey.destLat},${journey.destLng}`)
    } else if (journey.lat && journey.lng) {
      p.set('center', `${journey.lat},${journey.lng}`)
    }
    return `${base}?${p.toString()}`
  })()

  const phoneNumber = journey.userPhone ?? null

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-dvh flex flex-col max-w-[430px] mx-auto">

      {/* Header */}
      <header className="sticky top-0 w-full z-50 bg-surface-container-lowest/95 backdrop-blur-sm">
        <div className="flex justify-between items-center px-8 py-5">
          <span className="text-xl font-black tracking-tighter text-primary">Nudge</span>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            <span className="text-[0.625rem] font-bold uppercase tracking-widest text-secondary">Watching</span>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-10 px-8">

        {/* Hero */}
        <div className="mb-8 pt-2">
          <h1 className="text-[2.5rem] font-black tracking-tighter leading-[1.05] text-primary mb-4">
            Watching{' '}
            <span className="underline decoration-secondary-container decoration-4 underline-offset-2">
              {journey.userName ?? 'your friend'}
            </span>
          </h1>

          {/* Status badge */}
          <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full ${
            isMissed ? 'bg-error-container/40 border border-error/30'
            : isAlarm ? 'bg-error-container/20 border border-error/20'
            : 'bg-surface-container border border-outline-variant/30'
          }`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${isMissed || isAlarm ? 'bg-error' : 'bg-secondary'}`} />
            <span className={`font-bold text-[0.8125rem] ${isMissed || isAlarm ? 'text-error' : 'text-on-surface'}`}>
              {isMissed ? 'Missed stop — needs help'
               : isAlarm ? 'Wake-up alert active'
               : journey.state === 'TRANSFER' ? 'At transfer stop'
               : journey.state === 'ARRIVED' ? 'Arriving now'
               : 'Traveling safely'}
            </span>
          </div>
        </div>

        {/* Map card */}
        <div className="bg-surface-container rounded-2xl overflow-hidden mb-4 relative" style={{ minHeight: '220px' }}>
          <img
            src={mapUrl}
            alt="Live map"
            className="w-full h-full object-cover absolute inset-0"
            style={{ minHeight: '220px' }}
          />
          <div className="relative z-10 p-4 pt-36">
            <div className="bg-surface-container-lowest/95 backdrop-blur-sm rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary-container rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>directions_bus</span>
                  </div>
                  <div>
                    <p className="text-[0.625rem] font-bold uppercase tracking-widest text-on-surface-variant">In Transit</p>
                    {journey.destinationName && (
                      <p className="font-bold text-[0.9375rem] text-primary">→ {journey.destinationName}</p>
                    )}
                  </div>
                </div>
                {journey.etaMinutes && (
                  <div className="text-right">
                    <p className="text-[2rem] font-black tracking-tighter text-primary leading-none">~{journey.etaMinutes}</p>
                    <p className="text-[0.625rem] font-bold uppercase text-on-surface-variant">min</p>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="relative h-8 flex items-center">
                <div className="absolute h-[2px] left-0 right-0 bg-outline-variant/40 top-1/2 -translate-y-1/2" />
                <div
                  className="absolute h-[2px] left-0 bg-primary top-1/2 -translate-y-1/2 transition-all duration-1000"
                  style={{ width: `${progressPct}%` }}
                />
                <div className="flex justify-between w-full items-center relative z-10">
                  <div className="w-2.5 h-2.5 rounded-full bg-secondary" />
                  <div
                    className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md absolute transition-all duration-1000"
                    style={{ left: `calc(${progressPct}% - 12px)` }}
                  >
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>person</span>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-outline-variant" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-surface-container rounded-2xl p-6 mb-4">
          <div className="space-y-4">
            {journey.destinationName && (
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant flex-shrink-0" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>location_on</span>
                <div>
                  <p className="text-[0.625rem] font-bold uppercase tracking-widest text-on-surface-variant">Destination</p>
                  <p className="font-bold text-[0.9375rem]">{journey.destinationName}</p>
                </div>
              </div>
            )}
            {distLabel && (
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant flex-shrink-0" style={{ fontSize: '20px' }}>straighten</span>
                <div>
                  <p className="text-[0.625rem] font-bold uppercase tracking-widest text-on-surface-variant">Distance remaining</p>
                  <p className="font-bold text-[0.9375rem]">{distLabel}</p>
                </div>
              </div>
            )}
            {lastUpdated && (
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant flex-shrink-0" style={{ fontSize: '20px' }}>schedule</span>
                <div>
                  <p className="text-[0.625rem] font-bold uppercase tracking-widest text-on-surface-variant">Last updated</p>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[0.9375rem]">{lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Route Steps */}
        {journey.routeSteps?.length > 0 && (
          <div className="bg-surface-container rounded-2xl p-6 mb-4 space-y-4">
            <h4 className="font-bold text-[0.75rem] uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/30 pb-2">Transit Stops</h4>
            <div className="flex flex-col gap-3">
              {journey.routeSteps.map((step) => {
                const d = journey.lat && journey.lng ? haversine(journey.lat, journey.lng, step.lat, step.lng) : null
                const dLabel = d !== null ? (d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`) : '—'
                const isAlighting = step.type === 'alighting'
                return (
                  <div key={step.id} className={`flex justify-between items-center p-4 rounded-xl ${isAlighting ? 'bg-primary/5 border border-primary/20' : 'bg-surface-container-low'}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                      <span className={`material-symbols-outlined shrink-0 ${isAlighting ? 'text-primary' : 'text-on-surface-variant'}`} style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
                        {isAlighting ? 'pin_drop' : 'directions_bus'}
                      </span>
                      <span className={`text-[0.9375rem] leading-snug ${isAlighting ? 'font-black text-primary' : 'font-bold text-on-surface-variant'}`}>
                        {step.name}
                      </span>
                    </div>
                    <span className={`text-[0.8125rem] font-bold shrink-0 ${isAlighting ? 'text-primary' : 'text-on-surface-variant/60'}`}>
                      {dLabel}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Alert card */}
        <div className={`rounded-2xl p-5 mb-4 flex items-start gap-3 ${isMissed ? 'bg-error-container/30 border border-error/20' : 'bg-surface-container'}`}>
          <span className="material-symbols-outlined mt-0.5 flex-shrink-0" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1", color: isMissed ? '#ba1a1a' : '#006e28' }}>
            {isMissed ? 'warning' : 'verified_user'}
          </span>
          <p className="text-[0.9375rem] leading-relaxed text-on-surface-variant font-medium">
            {isMissed
              ? `${journey.userName ?? 'They'} missed their stop. An SMS has been sent. You can reach out directly.`
              : "We'll notify you immediately if they need your attention."}
          </p>
        </div>

        {/* Maps link if missed */}
        {isMissed && journey.lat && journey.lng && (
          <a
            href={`https://maps.google.com/?q=${journey.lat},${journey.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full h-14 px-6 rounded-2xl bg-error-container/20 border border-error/20 mb-4"
          >
            <span className="material-symbols-outlined text-error flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
            <span className="font-bold text-[0.9375rem] text-on-surface">Open location in Maps</span>
            <span className="material-symbols-outlined text-on-surface-variant ml-auto" style={{ fontSize: '16px' }}>open_in_new</span>
          </a>
        )}

        {/* Call button */}
        {isMissed && (
          <a
            href={phoneNumber ? `tel:${phoneNumber}` : undefined}
            className="w-full bg-error/10 border border-error/20 p-5 rounded-3xl flex items-center justify-center gap-4 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-error" style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}>call</span>
            <span className="text-[1.125rem] font-black tracking-tight text-error">Call {journey.userName ?? 'Them'}</span>
          </a>
        )}

      </main>

    </div>
  )
}
