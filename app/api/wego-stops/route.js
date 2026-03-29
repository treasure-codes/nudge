import { NextResponse } from 'next/server'
import { loadGtfs } from '@/lib/wegoGtfs'

/**
 * GET /api/wego-stops?lat=XX&lng=YY&originLat=AA&originLng=BB&count=6
 *
 * Returns the N WeGo stops nearest to (lat, lng), ordered from farthest
 * to nearest — i.e. the order a bus would encounter them approaching the destination.
 * If originLat/originLng are provided, only stops between origin and destination are returned.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const destLat  = parseFloat(searchParams.get('lat'))
  const destLng  = parseFloat(searchParams.get('lng'))
  const count    = Math.min(parseInt(searchParams.get('count') ?? '6', 10), 12)

  if (isNaN(destLat) || isNaN(destLng)) {
    return NextResponse.json({ error: 'Missing lat/lng' }, { status: 400 })
  }

  try {
    const { stops } = await loadGtfs()

    function meters(lat1, lng1, lat2, lng2) {
      const R = 6371e3, r = Math.PI / 180
      const dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(dLng/2)**2
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }

    // Score every stop by distance to destination, keep the closest N*3 as candidates
    const candidates = Object.entries(stops)
      .map(([id, s]) => ({ id, ...s, distToDest: meters(s.lat, s.lng, destLat, destLng) }))
      .filter(s => s.distToDest < 3000)           // within 3 km of destination
      .sort((a, b) => a.distToDest - b.distToDest)
      .slice(0, count * 3)

    // Return them ordered farthest→nearest (= the order the bus passes them)
    const result = candidates
      .sort((a, b) => b.distToDest - a.distToDest) // farthest first
      .slice(0, count)
      .map((s, i, arr) => ({
        id: s.id,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        type: i === arr.length - 1 ? 'alighting' : 'intermediate',
      }))

    return NextResponse.json({ stops: result })
  } catch (err) {
    console.error('[wego-stops]', err)
    return NextResponse.json({ error: 'Failed to load stops' }, { status: 500 })
  }
}
