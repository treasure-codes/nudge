'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useJourney, JOURNEY_STATE } from '@/context/JourneyContext'

const PLACE_ICON = {
  restaurant:        'restaurant',
  pharmacy:          'local_pharmacy',
  convenience_store: 'local_convenience_store',
  gas_station:       'local_gas_station',
  default:           'storefront',
}

export default function MissedPage() {
  const router = useRouter()
  const { state, destination, position, contacts, confirmSafe, smsSent } = useJourney()

  const [broadcastCountdown, setBroadcastCountdown] = useState(900)
  const [safeSpots, setSafeSpots]   = useState([])
  const [spotsLoading, setSpotsLoading] = useState(false)
  const [etaBack, setEtaBack]       = useState(null)
  const [rerouteOptions, setRerouteOptions] = useState([])
  const [rerouteLoading, setRerouteLoading] = useState(false)

  useEffect(() => {
    if (state === JOURNEY_STATE.IDLE) router.replace('/')
  }, [state, router])

  // Countdown — auto-confirm safe after 15 min
  useEffect(() => {
    if (state !== JOURNEY_STATE.MISSED) return
    const t = setInterval(() => {
      setBroadcastCountdown(p => {
        if (p <= 1) { clearInterval(t); confirmSafe(); return 0 }
        return p - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [state, confirmSafe])

  // Fetch safe nearby places + ETA back to destination
  useEffect(() => {
    if (state !== JOURNEY_STATE.MISSED) return
    const lat = position?.lat ?? (destination?.lat ? destination.lat + 0.005 : null)
    const lng = position?.lng ?? (destination?.lng ? destination.lng + 0.003 : null)
    if (!lat || !lng) return

    // Safe spots
    setSpotsLoading(true)
    fetch(`/api/places/nearby?lat=${lat}&lng=${lng}`)
      .then(r => r.json())
      .then(d => setSafeSpots(d.places ?? []))
      .catch(() => {})
      .finally(() => setSpotsLoading(false))

    // ETA back
    if (destination?.lat && destination?.lng) {
      fetch('/api/eta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originLat: lat, originLng: lng,
          destLat: destination.lat, destLng: destination.lng,
        }),
      })
        .then(r => r.json())
        .then(d => { if (d.durationMinutes) setEtaBack(d.durationMinutes) })
        .catch(() => {})

      // In-app reroute via WeGo GTFS
      setRerouteLoading(true)
      fetch(`/api/wego-reroute?userLat=${lat}&userLng=${lng}&destLat=${destination.lat}&destLng=${destination.lng}`)
        .then(r => r.json())
        .then(d => setRerouteOptions(d.routes ?? []))
        .catch(() => {})
        .finally(() => setRerouteLoading(false))
    }
  }, [state, position, destination])

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
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-error rounded-full animate-pulse" />
          <span className="text-[0.625rem] font-bold uppercase tracking-widest text-on-surface-variant">Live</span>
        </div>
      </header>

      <main className="flex-1 px-8 pt-8 pb-36 flex flex-col gap-8">

        {/* Headline */}
        <section>
          <h2 className="text-[2.75rem] font-black leading-[1.05] tracking-tighter text-primary mb-2">
            You missed<br />your stop.
          </h2>
          <p className="text-[1rem] text-on-surface-variant font-medium">
            {smsSent && primaryContact
              ? `${primaryContact.name} has been notified of your location.`
              : 'Notifying your emergency contact…'}
          </p>
        </section>

        {/* Map */}
        {lat && lng && (
          <div className="h-44 w-full bg-surface-container rounded-2xl overflow-hidden relative flex-shrink-0">
            <img
              src={`https://maps.googleapis.com/maps/api/staticmap?size=800x400&scale=2&zoom=15&markers=color:0xba1a1a|size:mid|${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`}
              alt="Your current location"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-6 h-6 bg-error rounded-full border-3 border-white shadow-lg" />
            </div>
          </div>
        )}

        {/* Get back section */}
        {destination && (
          <section>
            <p className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              How to get back to {destination.name}
            </p>

            {/* ETA summary */}
            <div className="rounded-2xl bg-surface-container p-4 flex items-center gap-4 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
                  directions_transit
                </span>
              </div>
              <p className="text-[0.9375rem] font-bold text-on-surface">
                {etaBack != null ? `~${etaBack} min by transit` : 'Calculating…'}
              </p>
            </div>

            {/* WeGo route options */}
            {rerouteLoading && (
              <div className="flex items-center gap-3 text-on-surface-variant text-[0.875rem] mt-2">
                <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />
                Finding bus routes…
              </div>
            )}

            {!rerouteLoading && rerouteOptions.length === 0 && (
              <p className="text-[0.875rem] text-on-surface-variant mt-2">No direct bus routes found from here.</p>
            )}

            <div className="space-y-2 mt-2">
              {rerouteOptions.map((route) => {
                const walkLabel = route.walkMeters >= 1000
                  ? `${(route.walkMeters / 1000).toFixed(1)} km walk`
                  : `${route.walkMeters} m walk`
                return (
                  <div
                    key={route.routeName}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-surface-container"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-black text-[0.9375rem]">{route.routeName}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-surface text-[0.9375rem] truncate">
                        Board at {route.boardStopName}
                      </p>
                      <p className="text-[0.8125rem] text-on-surface-variant mt-0.5">{walkLabel} to stop</p>
                    </div>
                    <span className="material-symbols-outlined text-primary flex-shrink-0" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
                      directions_bus
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Safe spots nearby */}
        <section>
          <p className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
            Safe places to wait nearby
          </p>

          {spotsLoading && (
            <div className="flex items-center gap-3 text-on-surface-variant text-[0.875rem]">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />
              Finding open places…
            </div>
          )}

          {!spotsLoading && safeSpots.length === 0 && (
            <p className="text-[0.875rem] text-on-surface-variant">No open places found nearby right now.</p>
          )}

          <div className="space-y-2">
            {safeSpots.map((place, i) => {
              const icon = PLACE_ICON[place.type] ?? PLACE_ICON.default
              const distLabel = place.distanceM >= 1000
                ? `${(place.distanceM / 1000).toFixed(1)} km`
                : `${place.distanceM} m`
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.lat},${place.lng}`

              return (
                <a
                  key={i}
                  href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=walking`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-surface-container active:bg-surface-container-high transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-on-secondary-container" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
                      {icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-on-surface text-[0.9375rem] truncate">{place.name}</p>
                    <p className="text-[0.8125rem] text-on-surface-variant mt-0.5 truncate">{place.address}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[0.8125rem] font-bold text-primary">{distLabel}</p>
                    <p className="text-[0.625rem] text-secondary font-bold uppercase tracking-wider">Open</p>
                  </div>
                </a>
              )
            })}
          </div>
        </section>

      </main>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 w-full max-w-[430px] left-1/2 -translate-x-1/2 px-8 pb-12 pt-4 bg-white/90 backdrop-blur-xl space-y-2">
        <button
          onClick={confirmSafe}
          className="w-full h-[56px] bg-primary text-white rounded-full font-bold text-[1rem] active:scale-[0.97] transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          I am safe — stop broadcasting
        </button>
        <p className="text-center text-[0.8125rem] text-on-surface-variant">
          Broadcast ends automatically in {minsLeft} min{minsLeft !== 1 ? 's' : ''}
        </p>
      </div>

    </div>
  )
}
