import { NextResponse } from 'next/server'

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

export async function GET(req) {
  if (!MAPS_KEY) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const lat     = parseFloat(searchParams.get('lat'))
  const lng     = parseFloat(searchParams.get('lng'))
  const destLat = parseFloat(searchParams.get('destLat'))
  const destLng = parseFloat(searchParams.get('destLng'))

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  const [safePlace, transit] = await Promise.allSettled([
    fetchSafePlace(lat, lng),
    fetchTransit(lat, lng, destLat, destLng),
  ])

  return NextResponse.json({
    safePlace: safePlace.status === 'fulfilled' ? safePlace.value : null,
    transit:   transit.status  === 'fulfilled' ? transit.value  : null,
  })
}

// ── Nearby safe waiting spot (convenience store, pharmacy, restaurant) ─────────
async function fetchSafePlace(lat, lng) {
  const types = ['convenience_store', 'pharmacy', 'restaurant', 'cafe', 'gas_station']
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('radius', '800')
  url.searchParams.set('type', types.join('|'))
  url.searchParams.set('opennow', 'true')
  url.searchParams.set('rankby', 'prominence')
  url.searchParams.set('key', MAPS_KEY)

  const res  = await fetch(url.toString(), { next: { revalidate: 60 } })
  const data = await res.json()

  if (!data.results || data.results.length === 0) return null

  const place = data.results[0]
  const dLat  = place.geometry.location.lat - lat
  const dLng  = place.geometry.location.lng - lng
  const distM = Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 111320)

  return {
    name:     place.name,
    address:  place.vicinity,
    distM,
    openNow:  place.opening_hours?.open_now ?? true,
    placeId:  place.place_id,
    mapsUrl:  `https://maps.google.com/?q=place_id:${place.place_id}`,
  }
}

// ── Next transit to original destination ──────────────────────────────────────
async function fetchTransit(lat, lng, destLat, destLng) {
  if (isNaN(destLat) || isNaN(destLng)) return null

  const url = new URL('https://maps.googleapis.com/maps/api/directions/json')
  url.searchParams.set('origin',           `${lat},${lng}`)
  url.searchParams.set('destination',      `${destLat},${destLng}`)
  url.searchParams.set('mode',             'transit')
  url.searchParams.set('departure_time',   'now')
  url.searchParams.set('alternatives',     'false')
  url.searchParams.set('key',              MAPS_KEY)

  const res  = await fetch(url.toString(), { next: { revalidate: 60 } })
  const data = await res.json()

  if (data.status !== 'OK' || !data.routes?.length) return null

  const leg   = data.routes[0].legs[0]
  const steps = leg.steps ?? []

  // Find first transit step
  const transitStep = steps.find((s) => s.travel_mode === 'TRANSIT')

  // Walk to transit
  const walkStep = steps[0]?.travel_mode === 'WALKING' ? steps[0] : null
  const walkMins = walkStep ? Math.round(walkStep.duration.value / 60) : 0
  const walkM    = walkStep ? walkStep.distance.value : 0

  if (!transitStep) {
    // No transit — return overall info
    return {
      line:      'Walk',
      headsign:  leg.end_address,
      departure: null,
      walkMins:  Math.round(leg.duration.value / 60),
      walkM:     leg.distance.value,
      mapsUrl:   `https://maps.google.com/maps?saddr=${lat},${lng}&daddr=${destLat},${destLng}&dirflg=r`,
    }
  }

  const td          = transitStep.transit_details
  const line        = td.line?.short_name ?? td.line?.name ?? 'Bus'
  const headsign    = td.headsign ?? ''
  const depTime     = td.departure_time?.text ?? null
  const depTimestamp = td.departure_time?.value ?? null

  // Minutes until departure
  const minsUntil = depTimestamp
    ? Math.max(0, Math.round((depTimestamp * 1000 - Date.now()) / 60000))
    : null

  return {
    line,
    headsign,
    departure: depTime,
    minsUntil,
    walkMins,
    walkM,
    mapsUrl: `https://maps.google.com/maps?saddr=${lat},${lng}&daddr=${destLat},${destLng}&dirflg=r`,
  }
}
