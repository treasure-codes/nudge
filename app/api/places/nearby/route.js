import { NextResponse } from 'next/server'
import { haversine } from '@/lib/haversine'

/**
 * GET /api/places/nearby?lat=&lng=
 * Returns up to 5 open places nearby, suitable for safe waiting.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  if (!lat || !lng) return NextResponse.json({ error: 'lat/lng required' }, { status: 400 })

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
  const types = ['restaurant', 'pharmacy', 'convenience_store', 'gas_station']

  const results = await Promise.all(
    types.map(type =>
      fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
        `?location=${lat},${lng}&radius=200&type=${type}&opennow=true&key=${key}`
      )
        .then(r => r.json())
        .then(d => d.results?.slice(0, 3) ?? [])
        .catch(() => [])
    )
  )

  const seen = new Set()
  const places = results
    .flat()
    .filter(p => {
      if (seen.has(p.place_id)) return false
      seen.add(p.place_id)
      return true
    })
    .map(p => ({
      name: p.name,
      address: p.vicinity,
      type: p.types?.[0] ?? 'establishment',
      rating: p.rating ?? null,
      lat: p.geometry.location.lat,
      lng: p.geometry.location.lng,
      distanceM: Math.round(haversine(
        parseFloat(lat), parseFloat(lng),
        p.geometry.location.lat, p.geometry.location.lng
      )),
    }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 5)

  return NextResponse.json({ places })
}
