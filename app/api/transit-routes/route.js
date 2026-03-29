import { NextResponse } from 'next/server'
import { getStopsBetween } from '@/lib/wegoGtfs'

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

export async function POST(req) {
  try {
    if (!MAPS_KEY) return NextResponse.json({ error: 'No API key', routes: [] }, { status: 500 })

    const { originLat, originLng, destLat, destLng } = await req.json()
    const departureTime = Math.floor(Date.now() / 1000)

    // ── Fetch Directions API ───────────────────────────────────────────────
    const fetchDirections = async (transitMode) => {
      const params = new URLSearchParams({
        origin: `${originLat},${originLng}`,
        destination: `${destLat},${destLng}`,
        mode: 'transit',
        alternatives: 'true',
        departure_time: String(departureTime),
        key: MAPS_KEY,
      })
      if (transitMode) params.set('transit_mode', transitMode)
      const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`)
      const data = await res.json()
      return data.routes || []
    }

    const [busRoutes, allRoutes] = await Promise.all([
      fetchDirections('bus'),
      fetchDirections(null),
    ])

    // ── Deduplicate by transit line fingerprint ────────────────────────────
    const seen = new Set()
    const merged = [...busRoutes, ...allRoutes].filter(r => {
      const leg = r.legs?.[0]
      const transitLegs = (leg?.steps || []).filter(s => s.travel_mode === 'TRANSIT')
      const key = transitLegs.map(s =>
        `${s.transit_details?.line?.short_name}|${s.transit_details?.headsign}`
      ).join('→') || r.summary || String(Math.random())
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // ── Build route objects in parallel (GTFS enrichment per leg) ─────────
    const routes = await Promise.all(
      merged.slice(0, 5).map((r, i) => buildRoute(r, i))
    )

    return NextResponse.json({ routes: routes.filter(Boolean) })

  } catch (e) {
    console.error('Transit routes error:', e)
    return NextResponse.json({ error: e.message, routes: [] }, { status: 500 })
  }
}

// ── Route builder ────────────────────────────────────────────────────────────

async function buildRoute(r, i) {
  const leg = r.legs?.[0]
  if (!leg) return null

  const hasTransit = (leg.steps || []).some(s => s.travel_mode === 'TRANSIT')
  if (!hasTransit) return null

  // Parse each transit step and enrich with its GTFS stop sequence
  const transitSteps = await Promise.all(
    (leg.steps || [])
      .filter(step => step.travel_mode === 'TRANSIT')
      .map(step => buildTransitStep(step))
  )

  const primary = transitSteps[0]
  if (!primary || primary.line === '?') return null

  return {
    id: i,
    duration: leg.duration?.text || '',
    durationSeconds: leg.duration?.value || 0,
    departureTime: leg.departure_time?.text || '',
    arrivalTime: leg.arrival_time?.text || '',
    transfers: Math.max(0, transitSteps.length - 1),
    lines: transitSteps.map(s => s.line),
    primaryLine: primary.line || '',
    primaryHeadsign: primary.headsign || '',
    primaryVehicle: primary.vehicle || 'BUS',
    departureStop: primary.departureStop || '',
    departureTimeText: primary.departureTime || '',
    arrivalTimeText: primary.arrivalTime || '',
    numStops: primary.numStops || 0,
    transitSteps,
  }
}

// ── Transit step builder + GTFS enrichment ────────────────────────────────────

/**
 * Builds a transit step object and attempts to enrich it with the full GTFS
 * stop sequence between boarding and alighting stops.
 * stopSequence is what enables offline GPS tracking after the user boards.
 */
async function buildTransitStep(step) {
  const td = step.transit_details

  const base = {
    type: 'TRANSIT',
    line: td?.line?.short_name || td?.line?.name || '?',
    lineName: td?.line?.name || '',
    headsign: td?.headsign || '',
    vehicle: td?.line?.vehicle?.type || 'BUS',
    departureStop: td?.departure_stop?.name || '',
    departureLocation: td?.departure_stop?.location || null,
    arrivalStop: td?.arrival_stop?.name || '',
    arrivalLocation: td?.arrival_stop?.location || null,
    departureTime: td?.departure_time?.text || '',
    arrivalTime: td?.arrival_time?.text || '',
    numStops: td?.num_stops || 0,
    polyline: step.polyline?.points || '',
    // Full ordered stop sequence from GTFS — empty if GTFS lookup fails
    stopSequence: [],
  }

  const boardLoc = td?.departure_stop?.location
  const alightLoc = td?.arrival_stop?.location

  if (boardLoc && alightLoc) {
    try {
      const stops = await getStopsBetween(
        boardLoc.lat, boardLoc.lng,
        alightLoc.lat, alightLoc.lng,
        base.line
      )
      if (stops.length >= 2) {
        base.stopSequence = stops  // [{ id, name, lat, lng, type }]
      }
    } catch (err) {
      // GTFS unavailable — offline tracking falls back to destination Haversine
      console.warn('[transit-routes] GTFS enrichment failed:', err.message)
    }
  }

  return base
}
