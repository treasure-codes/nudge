import { NextResponse } from 'next/server'

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

export async function POST(req) {
  try {
    if (!MAPS_KEY) return NextResponse.json({ error: 'No API key', routes: [] }, { status: 500 })

    const { originLat, originLng, destLat, destLng } = await req.json()
    const departureTime = Math.floor(Date.now() / 1000)

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

    // Two parallel calls: bus-preferred + unrestricted (catches rail/light rail alternatives)
    const [busRoutes, allRoutes] = await Promise.all([
      fetchDirections('bus'),
      fetchDirections(null),
    ])

    // Merge, deduplicate by route summary or primary line+headsign
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

    const routes = merged.slice(0, 5).map((r, i) => {
      const leg = r.legs?.[0]
      if (!leg) return null

      // Only keep transit legs (no walking)
      const transitSteps = (leg.steps || [])
        .filter(step => step.travel_mode === 'TRANSIT')
        .map(step => {
          const td = step.transit_details
          return {
            type: 'TRANSIT',
            line: td?.line?.short_name || td?.line?.name || '?',
            lineName: td?.line?.name || '',
            headsign: td?.headsign || '',
            vehicle: td?.line?.vehicle?.type || 'BUS',
            departureStop: td?.departure_stop?.name || '',
            arrivalStop: td?.arrival_stop?.name || '',
            departureTime: td?.departure_time?.text || '',
            arrivalTime: td?.arrival_time?.text || '',
            numStops: td?.num_stops || 0,
          }
        })

      const primary = transitSteps[0]

      return {
        id: i,
        duration: leg.duration?.text || '',
        durationSeconds: leg.duration?.value || 0,
        departureTime: leg.departure_time?.text || '',
        arrivalTime: leg.arrival_time?.text || '',
        transfers: Math.max(0, transitSteps.length - 1),
        lines: transitSteps.map(s => s.line),
        primaryLine: primary?.line || '',
        primaryHeadsign: primary?.headsign || '',
        primaryVehicle: primary?.vehicle || 'BUS',
        departureStop: primary?.departureStop || '',
        departureTimeText: primary?.departureTime || '',
        arrivalTimeText: primary?.arrivalTime || '',
        numStops: primary?.numStops || 0,
        transitSteps,
      }
    }).filter(Boolean)

    return NextResponse.json({ routes })
  } catch (e) {
    console.error('Transit routes error:', e)
    return NextResponse.json({ error: e.message, routes: [] }, { status: 500 })
  }
}
