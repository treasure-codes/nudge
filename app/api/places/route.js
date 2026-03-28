import { NextResponse } from 'next/server'

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

export async function GET(req) {
  if (!MAPS_KEY) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const placeId = searchParams.get('placeId')
  const q = searchParams.get('q')

  // ── Place Details (get lat/lng for a selected place) ────────────────
  if (placeId) {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,geometry,formatted_address&key=${MAPS_KEY}`
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } })
      const data = await res.json()
      if (data.status !== 'OK' || !data.result) {
        return NextResponse.json({ error: data.status }, { status: 400 })
      }
      const { name, formatted_address, geometry } = data.result
      return NextResponse.json({
        place: {
          name,
          address: formatted_address,
          lat: geometry.location.lat,
          lng: geometry.location.lng,
        },
      })
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  // ── Autocomplete ─────────────────────────────────────────────────────
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ predictions: [] })
  }

  // Bias results toward Nashville, TN
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&locationbias=circle:80000@36.1627,-86.7816&key=${MAPS_KEY}`
  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return NextResponse.json({ error: data.status }, { status: 400 })
    }
    const predictions = (data.predictions || []).slice(0, 6).map((p) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text ?? p.description,
      secondaryText: p.structured_formatting?.secondary_text ?? '',
    }))
    return NextResponse.json({ predictions })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
