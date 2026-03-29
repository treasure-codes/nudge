import { NextResponse } from 'next/server'

export async function POST(req) {
  const { originLat, originLng, destLat, destLng } = await req.json()

  if (!originLat || !originLng || !destLat || !destLng) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'No API key configured' }, { status: 500 })
  }

  try {
    const response = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
        },
        body: JSON.stringify({
          origin: {
            location: { latLng: { latitude: originLat, longitude: originLng } },
          },
          destination: {
            location: { latLng: { latitude: destLat, longitude: destLng } },
          },
          travelMode: 'TRANSIT',
        }),
      }
    )

    const data = await response.json()

    if (!data.routes?.length) {
      // Transit not available for this route — fall back to DRIVE
      const fallback = await fetch(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
          },
          body: JSON.stringify({
            origin: {
              location: { latLng: { latitude: originLat, longitude: originLng } },
            },
            destination: {
              location: { latLng: { latitude: destLat, longitude: destLng } },
            },
            travelMode: 'DRIVE',
          }),
        }
      )
      const fallbackData = await fallback.json()
      if (!fallbackData.routes?.length) {
        return NextResponse.json({ error: 'No route found' }, { status: 404 })
      }
      const route = fallbackData.routes[0]
      const durationSec = Number(route.duration.replace('s', ''))
      return NextResponse.json({
        durationSeconds: durationSec,
        durationMinutes: Math.max(1, Math.round(durationSec / 60)),
        distanceMeters: route.distanceMeters,
      })
    }

    const route = data.routes[0]
    const durationSec = Number(route.duration.replace('s', ''))
    return NextResponse.json({
      durationSeconds: durationSec,
      durationMinutes: Math.max(1, Math.round(durationSec / 60)),
      distanceMeters: route.distanceMeters,
    })
  } catch (err) {
    console.error('ETA error:', err)
    return NextResponse.json({ error: 'Failed to compute ETA' }, { status: 500 })
  }
}
