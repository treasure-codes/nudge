'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'

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

  const distLabel = journey.distanceToStop != null
    ? journey.distanceToStop >= 1000
      ? `${(journey.distanceToStop / 1000).toFixed(1)} km away`
      : `${journey.distanceToStop} m away`
    : null

  const progressPct = journey.distanceToStop != null
    ? Math.min(92, Math.max(8, 100 - (journey.distanceToStop / 2000) * 100))
    : 40

  const isAlarm  = journey.state === 'PHASE_2'
  const isMissed = journey.state === 'MISSED'

  const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
  const mapUrl = (() => {
    const base = 'https://maps.googleapis.com/maps/api/staticmap'
    const p = new URLSearchParams({ size: '800x480', scale: '2', zoom: '14', key: MAPS_KEY })
    if (journey.lat && journey.lng) p.append('markers', `color:0x000000|size:mid|${journey.lat},${journey.lng}`)
    if (journey.destLat && journey.destLng) p.append('markers', `color:0x006e28|size:mid|label:D|${journey.destLat},${journey.destLng}`)
    if (journey.lat && journey.lng && journey.destLat && journey.destLng) {
      p.delete('zoom')
      p.append('path', `color:0x00000040|weight:3|${journey.lat},${journey.lng}|${journey.destLat},${journey.destLng}`)
    } else if (journey.lat && journey.lng) {
      p.set('center', `${journey.lat},${journey.lng}`)
    }
    return `${base}?${p.toString()}`
  })()

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-dvh flex flex-col max-w-[430px] mx-auto">

      {/* Header */}
      <header className="fixed top-0 w-full max-w-[430px] z-50 bg-white/80 backdrop-blur-xl">
        <div className="flex justify-between items-center px-8 py-5">
          <span className="text-xl font-black tracking-tighter text-primary">Nudge</span>
          <span className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant">Watcher</span>
        </div>
      </header>

      <main className="flex-1 pt-24 pb-24 px-8">

        {/* Hero */}
        <div className="mb-10">
          <p className="text-[0.75rem] font-bold uppercase tracking-widest text-secondary mb-3">WATCHER VIEW</p>
          <h1 className="text-[3rem] font-black tracking-tighter leading-[1.05] text-primary mb-5">
            Watching over{' '}
            <span className="underline decoration-secondary-container decoration-4 underline-offset-2">
              {journey.userName ?? 'your friend'}
            </span>
          </h1>

          {/* Status badge */}
          <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full border ${
            isMissed || isAlarm
              ? 'border-error/30 bg-error-container/20'
              : 'border-outline-variant/30 bg-surface-container'
          }`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${isMissed || isAlarm ? 'bg-error' : 'bg-secondary'}`} />
            <span className={`font-bold text-[0.8125rem] ${isMissed || isAlarm ? 'text-error' : 'text-on-surface'}`}>
              {isMissed ? 'Missed stop' : isAlarm ? 'Alarm active' : journey.state === 'TRANSFER' ? 'At transfer stop' : 'Traveling safely'}
            </span>
          </div>
        </div>

        {/* Map card */}
        <div className="bg-surface-container rounded-2xl overflow-hidden mb-4 relative" style={{ minHeight: '220px' }}>
          <img
            src={mapUrl}
            alt="Live map"
            className="w-full h-full object-cover grayscale opacity-60 absolute inset-0"
            style={{ minHeight: '220px' }}
          />
          <div className="relative z-10 p-6 pt-36">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5">
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

              {/* Progress tracker */}
              <div className="relative h-8 flex items-center">
                <div className="absolute h-[2px] left-0 right-0 bg-outline-variant/40 top-1/2 -translate-y-1/2" />
                <div
                  className="absolute h-[2px] left-0 bg-primary top-1/2 -translate-y-1/2 transition-all duration-1000"
                  style={{ width: `${progressPct}%` }}
                />
                <div className="flex justify-between w-full items-center relative z-10">
                  <div className="w-2.5 h-2.5 rounded-full bg-on-surface" />
                  <div
                    className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md absolute"
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
          <p className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant mb-5">Live Statistics</p>
          <div className="space-y-5">
            {journey.destinationName && (
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>location_on</span>
                <div>
                  <p className="text-[0.625rem] font-bold uppercase tracking-widest text-on-surface-variant">Destination</p>
                  <p className="font-bold text-[0.9375rem]">{journey.destinationName}</p>
                </div>
              </div>
            )}
            {distLabel && (
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>straighten</span>
                <div>
                  <p className="text-[0.625rem] font-bold uppercase tracking-widest text-on-surface-variant">Distance</p>
                  <p className="font-bold text-[0.9375rem]">{distLabel}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>schedule</span>
              <div>
                <p className="text-[0.625rem] font-bold uppercase tracking-widest text-on-surface-variant">Update cycle</p>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[0.9375rem]">Every 10s</p>
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                </div>
              </div>
            </div>
            {lastUpdated && (
              <p className="text-[0.6875rem] text-outline">
                Last updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            )}
          </div>
        </div>

        {/* Info / alert card */}
        <div className={`rounded-2xl p-5 mb-6 flex items-start gap-3 ${isMissed ? 'bg-error-container/20 border border-error/20' : 'bg-surface-container-low'}`}>
          <span className="material-symbols-outlined mt-0.5" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1", color: isMissed ? '#ba1a1a' : '#474747' }}>info</span>
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
            className="flex items-center gap-3 w-full h-14 px-6 rounded-2xl bg-error-container/20 border border-error/20 mb-6"
          >
            <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
            <span className="font-bold text-[0.9375rem] text-on-surface">Open location in Maps</span>
            <span className="material-symbols-outlined text-on-surface-variant ml-auto" style={{ fontSize: '16px' }}>open_in_new</span>
          </a>
        )}

        {/* Action grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: 'call',         label: `Call ${journey.userName ?? 'them'}` },
            { icon: 'chat_bubble',  label: 'Quick Message' },
            { icon: 'share',        label: 'Share Tracking' },
            { icon: 'report',       label: 'Flag Concern' },
          ].map(({ icon, label }) => (
            <button
              key={icon}
              className="bg-surface-container hover:bg-surface-container-high transition-colors p-4 rounded-2xl flex items-center gap-3 active:scale-95"
            >
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>{icon}</span>
              <span className="text-[0.875rem] font-medium text-on-surface">{label}</span>
            </button>
          ))}
        </div>

      </main>

    </div>
  )
}
