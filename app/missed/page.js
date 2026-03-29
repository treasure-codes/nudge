'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useJourney, JOURNEY_STATE } from '@/context/JourneyContext'

const PLACE_ICON = {
  pharmacy:          'local_pharmacy',
  gas_station:       'local_gas_station',
  convenience_store: 'local_convenience_store',
  restaurant:        'restaurant',
  default:           'storefront',
}

function isNightTime() {
  const h = new Date().getHours()
  return h >= 21 || h < 6
}

function loadCachedReroute() {
  try {
    const raw = sessionStorage.getItem('nudge_reroute')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

const DEMO_MISSED = {
  destination: { name: 'Downtown Nashville', lat: 36.1627, lng: -86.7816 },
  lat: 36.1670, lng: -86.7760,
  contact: { name: 'Treasure' },
  reroute: [{ routeName: '56', boardStopName: '17th Ave N', walkMeters: 85, departureTimeText: '10:52 PM', nextDepartureMinutes: 8 }],
  spots: [
    { name: 'Mapco', type: 'gas_station',       distanceM: 95,  address: '1701 Charlotte Ave' },
    { name: 'Walgreens', type: 'pharmacy',       distanceM: 210, address: '1900 Charlotte Ave' },
  ],
}

export default function MissedPage() {
  const router = useRouter()
  const { state, destination, pendingLegs, position, contacts, confirmSafe, smsSent } = useJourney()

  const [demo] = useState(() =>
    typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('demo') ?? '')
      : ''
  )

  const [broadcastCountdown, setBroadcastCountdown] = useState(900)
  const [safeSpots, setSafeSpots] = useState([])
  const [spotsLoading, setSpotsLoading] = useState(false)
  const [rerouteOptions, setRerouteOptions] = useState(() => loadCachedReroute())
  const [rerouteLoading, setRerouteLoading] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const up = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    setIsOnline(navigator.onLine)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  useEffect(() => {
    if (state === JOURNEY_STATE.IDLE) router.replace('/')
  }, [state, router])

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

  useEffect(() => {
    if (state !== JOURNEY_STATE.MISSED) return
    const lat = position?.lat ?? (destination?.lat ? destination.lat + 0.005 : null)
    const lng = position?.lng ?? (destination?.lng ? destination.lng + 0.003 : null)
    if (!lat || !lng || !navigator.onLine) return

    setSpotsLoading(true)
    fetch(`/api/places/nearby?lat=${lat}&lng=${lng}`)
      .then(r => r.json())
      .then(d => setSafeSpots(d.places ?? []))
      .catch(() => {})
      .finally(() => setSpotsLoading(false))

    // Only re-fetch reroute if nothing cached
    if (rerouteOptions.length === 0 && destination?.lat && destination?.lng) {
      setRerouteLoading(true)
      fetch(`/api/wego-reroute?userLat=${lat}&userLng=${lng}&destLat=${destination.lat}&destLng=${destination.lng}`)
        .then(r => r.json())
        .then(d => {
          const routes = d.routes ?? []
          setRerouteOptions(routes)
          try { sessionStorage.setItem('nudge_reroute', JSON.stringify(routes)) } catch {}
        })
        .catch(() => {})
        .finally(() => setRerouteLoading(false))
    }
  }, [state, position, destination])

  if (state !== JOURNEY_STATE.MISSED && !demo) return null

  const primaryContact = demo ? DEMO_MISSED.contact : contacts[0]
  const lat  = demo ? DEMO_MISSED.lat : (position?.lat ?? destination?.lat)
  const lng  = demo ? DEMO_MISSED.lng : (position?.lng ?? destination?.lng)
  const minsLeft = demo ? 13 : Math.ceil(broadcastCountdown / 60)
  const effectiveDest = demo ? DEMO_MISSED.destination : destination
  const effectiveReroute = demo ? DEMO_MISSED.reroute : rerouteOptions
  const effectiveSpots   = demo ? DEMO_MISSED.spots   : []
  const bestRoute = (demo ? DEMO_MISSED.reroute : rerouteOptions)[0] ?? null

  // Prioritise safe, lit, public spaces. Restaurants only fill daytime gaps.
  const filteredSpots = useMemo(() => {
    if (!safeSpots.length) return []
    const safe = safeSpots.filter(p =>
      p.type === 'pharmacy' || p.type === 'gas_station' || p.type === 'convenience_store'
    )
    const rest = safeSpots.filter(p => p.type === 'restaurant')
    if (isNightTime()) return safe
    return safe.length ? [...safe, ...rest] : rest
  }, [safeSpots])

  const walkLabel = (m) =>
    m >= 1000 ? `${(m / 1000).toFixed(1)} km walk` : `${m} m walk`

  // Use the true final destination — last pending leg if multi-leg, otherwise current destination
  const finalDest = pendingLegs?.length > 0 ? pendingLegs[pendingLegs.length - 1] : destination
  const setupHref = finalDest
    ? `/journey/setup?destName=${encodeURIComponent(finalDest.name ?? '')}&destLat=${finalDest.lat}&destLng=${finalDest.lng}`
    : '/journey/setup'

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-dvh flex flex-col max-w-[430px] mx-auto">

      <div className="pt-14" />

      <main className="flex-1 px-6 pt-2 pb-40 flex flex-col gap-7">

        {/* ── Hero ── */}
        <section>
          {(demo || smsSent) && primaryContact ? (
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-secondary" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>
                  person
                </span>
              </div>
              <p className="text-[1rem] font-bold text-on-surface">
                {primaryContact.name} knows where you are
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin flex-shrink-0" />
              <p className="text-[0.9375rem] font-bold text-on-surface-variant">
                Notifying your emergency contact…
              </p>
            </div>
          )}

          <h1 className="text-[2.5rem] font-black tracking-tighter leading-[1.05] text-on-surface mb-1">
            You missed<br />your stop.
          </h1>
          <p className="text-[0.9375rem] text-on-surface-variant font-medium">
            Let's get you back to{' '}
            <span className="text-on-surface font-bold">{effectiveDest?.name}</span>
          </p>
        </section>

        {/* ── Map ── */}
        {lat && lng && (
          <div className="w-full rounded-2xl overflow-hidden relative flex-shrink-0 border border-outline-variant/20" style={{ height: '200px' }}>
            <img
              src={`https://maps.googleapis.com/maps/api/staticmap?size=800x400&scale=2&zoom=15&markers=color:0xF59E0B|size:mid|${lat},${lng}${effectiveDest?.lat ? `&markers=color:0x006e28|size:mid|label:D|${effectiveDest.lat},${effectiveDest.lng}` : ''}&style=feature:all|element:geometry|color:0xf5f5f5&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`}
              alt="Your current location"
              className="w-full h-full object-cover"
            />
            <a
              href={`https://maps.google.com/?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-[0.6875rem] font-bold text-primary px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>open_in_new</span>
              Open in Maps
            </a>
          </div>
        )}

        {/* ── Offline fallback ── */}
        {!isOnline && !bestRoute && (
          <div className="px-4 py-4 rounded-2xl bg-surface-container border border-outline-variant/20">
            <p className="font-bold text-on-surface text-[0.9375rem] mb-1">No connection right now</p>
            <p className="text-[0.8125rem] text-on-surface-variant leading-relaxed">
              Stay where you are.{' '}
              {primaryContact?.name ?? 'Your contact'} has your last known location and will reach out.
              {bestRoute
                ? ` The ${bestRoute.routeName} stops nearby — look for the stop at ${bestRoute.boardStopName}.`
                : ' Find a lit, public place and wait.'}
            </p>
          </div>
        )}

        {/* ── Get back section ── */}
        {effectiveDest && (
          <section>
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Get back to {effectiveDest.name}
            </p>

            {!demo && rerouteLoading && (
              <div className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-surface-container mb-2.5">
                <div className="w-4 h-4 rounded-full border-2 border-outline-variant border-t-primary animate-spin flex-shrink-0" />
                <p className="text-[0.875rem] text-on-surface-variant font-medium">Finding routes…</p>
              </div>
            )}

            {/* Best transit route → taps into new journey */}
            {!rerouteLoading && bestRoute && (
              <Link
                href={setupHref}
                className="flex items-center gap-4 px-4 py-4 rounded-2xl bg-surface-container border border-outline-variant/20 active:bg-surface-container-high transition-colors mb-2.5"
              >
                <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black text-[0.9375rem] leading-none">{bestRoute.routeName}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-on-surface text-[0.9375rem] truncate">
                    Board at {bestRoute.boardStopName}
                  </p>
                  <p className="text-[0.8125rem] text-on-surface-variant mt-0.5">
                    {walkLabel(bestRoute.walkMeters)}
                    {bestRoute.departureTimeText ? ` · departs ${bestRoute.departureTimeText}` : ''}
                  </p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant flex-shrink-0" style={{ fontSize: '20px' }}>chevron_right</span>
              </Link>
            )}

            {/* Next bus countdown — shown when we have departure time */}
            {!rerouteLoading && bestRoute?.nextDepartureMinutes != null && (
              <div className="flex items-center gap-4 px-4 py-4 rounded-2xl bg-surface-container border border-outline-variant/20 mb-2.5">
                <div className="w-11 h-11 rounded-xl bg-secondary-container flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-on-secondary-container" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>schedule</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-on-surface text-[0.9375rem]">
                    {bestRoute.nextDepartureMinutes <= 1
                      ? 'Next bus arriving now'
                      : `Next bus in ${bestRoute.nextDepartureMinutes} min`}
                  </p>
                  <p className="text-[0.8125rem] text-on-surface-variant mt-0.5">
                    Wait at {bestRoute.boardStopName}
                  </p>
                </div>
              </div>
            )}

            {/* No route found — directions fallback */}
            {!rerouteLoading && !bestRoute && isOnline && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=transit`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 px-4 py-4 rounded-2xl bg-surface-container border border-outline-variant/20 active:bg-surface-container-high transition-colors mb-2.5"
              >
                <div className="w-11 h-11 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>directions_transit</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-on-surface text-[0.9375rem]">Get directions back</p>
                  <p className="text-[0.8125rem] text-on-surface-variant mt-0.5">Open in Google Maps</p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant flex-shrink-0" style={{ fontSize: '20px' }}>chevron_right</span>
              </a>
            )}
          </section>
        )}

        {/* ── Safe places to wait ── */}
        {((!demo && spotsLoading) || (demo ? effectiveSpots : filteredSpots).length > 0) && (
          <section>
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              {isNightTime() ? 'Safe lit places to wait' : 'Places nearby to wait'}
            </p>

            {!demo && spotsLoading && (
              <div className="flex items-center gap-3 text-on-surface-variant text-[0.875rem]">
                <div className="w-4 h-4 rounded-full border-2 border-outline-variant border-t-primary animate-spin flex-shrink-0" />
                Finding open places…
              </div>
            )}

            {(demo ? effectiveSpots : filteredSpots).length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
                {(demo ? effectiveSpots : filteredSpots).map((place, i) => {
                  const icon = PLACE_ICON[place.type] ?? PLACE_ICON.default
                  const distLabel = place.distanceM >= 1000
                    ? `${(place.distanceM / 1000).toFixed(1)} km`
                    : `${place.distanceM} m`
                  return (
                    <a
                      key={i}
                      href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=walking`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 w-36 bg-surface-container rounded-2xl p-3.5 active:bg-surface-container-high transition-colors border border-outline-variant/10"
                    >
                      <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center mb-2.5">
                        <span className="material-symbols-outlined text-on-secondary-container" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>
                          {icon}
                        </span>
                      </div>
                      <p className="font-bold text-on-surface text-[0.8125rem] leading-tight line-clamp-2 mb-1">{place.name}</p>
                      <p className="text-[0.6875rem] font-bold text-secondary">{distLabel} walk</p>
                    </a>
                  )
                })}
              </div>
            )}
          </section>
        )}

      </main>

      {/* ── Fixed bottom ── */}
      <div className="fixed bottom-0 left-0 w-full max-w-[430px] left-1/2 -translate-x-1/2 px-6 pb-10 pt-4 bg-surface-container-lowest/95 backdrop-blur-xl border-t border-outline-variant/15">
        <button
          onClick={confirmSafe}
          className="w-full h-[52px] bg-primary text-white rounded-full font-bold text-[1rem] tracking-tight active:scale-[0.97] transition-all flex items-center justify-center gap-2 mb-2"
        >
          <span className="material-symbols-outlined text-white" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
          I'm safe — stop sharing location
        </button>
        <p className="text-center text-[0.75rem] text-on-surface-variant">
          Stops automatically in {minsLeft} min{minsLeft !== 1 ? 's' : ''}
        </p>
      </div>

    </div>
  )
}
